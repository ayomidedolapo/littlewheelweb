// app/api/v1/agent/customers/[id]/vaults/[vaultId]/withdraw/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);
const ROUTE_REV = "withdraw-finalize-R5";

const finalizePath = (id: string, vaultId: string) =>
  `/agent/customers/${encodeURIComponent(id)}/vaults/${encodeURIComponent(
    vaultId
  )}/withdraw/finalize`;

/* ========== Safe accessors ========== */
async function getCookieStore() {
  const maybe = (cookiesFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}
async function getHeadersStore() {
  const maybe = (headersFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

/* ========== Auth Reader ========== */
async function readBearer(req: NextRequest): Promise<string> {
  try {
    const jar = await getCookieStore();
    const hdrs = await getHeadersStore();

    const fromCookie =
      jar?.get?.("lw_token")?.value ||
      jar?.get?.("lw_auth")?.value ||
      jar?.get?.("authToken")?.value ||
      jar?.get?.("token")?.value ||
      jar?.get?.("session")?.value ||
      "";

    const fromAuth =
      (hdrs.get("authorization") || req.headers.get("authorization") || "")
        .replace(/^Bearer\s+/i, "")
        .trim() || "";

    const fromX =
      (hdrs.get("x-lw-auth") || req.headers.get("x-lw-auth") || "")
        .replace(/^Bearer\s+/i, "")
        .trim() || "";

    return fromX || fromAuth || fromCookie || "";
  } catch {
    return (
      (req.headers.get("authorization") || "")
        .replace(/^Bearer\s+/i, "")
        .trim() ||
      (req.headers.get("x-lw-auth") || "").replace(/^Bearer\s+/i, "").trim() ||
      ""
    );
  }
}

/* ========== Helper JSON wrapper ========== */
function j(body: any, status = 200) {
  const r = NextResponse.json(body, { status });
  r.headers.set("X-Route-Rev", ROUTE_REV);
  return r;
}

/* ========== Mode normalization ========== */
type Mode = "FACIAL" | "OTP";

function normalizeMode(raw: any): Mode | "" {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!v) return "";
  if (["facial", "face", "selfie", "photo", "image"].includes(v)) return "FACIAL";
  if (["otp", "pin", "code"].includes(v)) return "OTP";
  // also accept already-uppercased enums
  if (v === "facial".toLowerCase()) return "FACIAL";
  if (v === "otp".toLowerCase()) return "OTP";
  return "";
}

function pickSelfie(body: any): string {
  return (
    body?.selfieImageURL ||
    body?.selfieImageUrl ||
    body?.selfieImage ||
    body?.image ||
    body?.photo ||
    body?.faceImage ||
    ""
  );
}

function pickOtp(body: any): string {
  const v = body?.otp ?? body?.pin ?? body?.code ?? "";
  return String(v || "");
}

/* ========== POST ========== */
export async function POST(
  req: NextRequest,
  ctx: {
    params:
      | { id: string; vaultId: string }
      | Promise<{ id: string; vaultId: string }>;
  }
) {
  try {
    const { id, vaultId } =
      typeof (ctx.params as any)?.then === "function"
        ? await (ctx.params as any)
        : ctx.params;

    if (!API_BASE) return j({ ok: false, message: "Missing BACKEND_API_URL" }, 500);
    if (!id || !vaultId)
      return j({ ok: false, message: "Missing customerId or vaultId" }, 400);

    const token = await readBearer(req);
    if (!token) return j({ ok: false, message: "Authentication required" }, 401);

    /* -------- Parse body safely -------- */
    let body: any = {};
    try {
      const raw = await req.text();
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return j({ ok: false, message: "Invalid JSON body" }, 400);
    }

    /* -------- Determine mode -------- */
    let mode: Mode | "" =
      normalizeMode(body?.mode) ||
      normalizeMode(body?.verificationMode) ||
      normalizeMode(body?.withdrawalVerificationMode);

    const selfie = pickSelfie(body);
    const otp = pickOtp(body);

    // infer mode if not provided
    if (!mode) {
      if (selfie && !otp) mode = "FACIAL";
      else if (otp && !selfie) mode = "OTP";
    }

    if (!mode) {
      return j(
        {
          ok: false,
          message: "Select a withdrawal verification mode",
          hint:
            "Send one of: mode / verificationMode / withdrawalVerificationMode = 'FACIAL'|'OTP', plus selfieImageURL or otp.",
        },
        400
      );
    }

    /* -------- Build payload (send what backend might expect) -------- */
    const normalizedBody: any = {
      // send all likely keys so backend always receives one it understands
      mode,
      verificationMode: mode,
      withdrawalVerificationMode: mode,
    };

    if (mode === "FACIAL") {
      const img = selfie;
      if (!img) {
        return j(
          {
            ok: false,
            message: "Selfie image is required for facial verification",
            hint: "Send selfieImageURL (or selfieImage/image/photo/faceImage).",
          },
          400
        );
      }

      normalizedBody.selfieImageURL = img;
      normalizedBody.selfieImageUrl = img; // some backends use camelCase Url
    }

    if (mode === "OTP") {
      if (!otp) {
        return j(
          {
            ok: false,
            message: "OTP is required for OTP verification",
            hint: "Send otp (or pin/code).",
          },
          400
        );
      }
      normalizedBody.otp = otp;
    }

    const upstreamUrl = `${API_BASE}${finalizePath(id, vaultId)}`;

    /* -------- Fetch to backend -------- */
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

    try {
      const upstream = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-lw-auth": `Bearer ${token}`,
        },
        body: JSON.stringify(normalizedBody),
        cache: "no-store",
        signal: ac.signal,
      });

      const ct = upstream.headers.get("content-type") || "";
      const text = await upstream.text().catch(() => "");

      // always try to return JSON if possible
      if (ct.includes("application/json")) {
        let json: any = {};
        try {
          json = JSON.parse(text || "{}");
        } catch {
          json = { ok: upstream.ok, raw: text };
        }
        return j(json, upstream.status);
      }

      return new NextResponse(text, {
        status: upstream.status,
        headers: { "Content-Type": ct || "text/plain; charset=utf-8" },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: any) {
    const aborted = err?.name === "AbortError" || err === "timeout";
    return j(
      {
        ok: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : err?.message || "Proxy error",
      },
      aborted ? 504 : 502
    );
  }
}
