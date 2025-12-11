// app/api/v1/agent/customers/[id]/vaults/[vaultId]/withdraw/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);
const ROUTE_REV = "withdraw-finalize-R4";

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

    /* -------- STRICT MODE VALIDATION -------- */
    let mode = typeof body.mode === "string" ? body.mode.toLowerCase().trim() : "";

    const hasSelfie =
      body.selfieImageURL ||
      body.selfieImage ||
      body.image ||
      body.photo ||
      body.faceImage;

    const hasOtp = body.otp || body.pin || body.code;

    // Determine correct mode
    if (!mode) {
      if (hasSelfie && !hasOtp) mode = "facial";
      else if (hasOtp && !hasSelfie) mode = "otp";
    }

    if (!mode) {
      return j(
        {
          ok: false,
          message: "Select a withdrawal verification mode",
          hint: "Send mode: 'facial' or 'otp'."
        },
        401
      );
    }

    /* -------- Normalize fields for backend -------- */
    const normalizedBody: any = { mode };

    if (mode === "facial") {
      normalizedBody.selfieImageURL =
        body.selfieImageURL ||
        body.selfieImage ||
        body.image ||
        body.photo ||
        body.faceImage ||
        "";
    }

    if (mode === "otp") {
      normalizedBody.otp = String(body.otp || body.pin || body.code || "");
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
          "x-lw-auth": `Bearer ${token}`
        },
        body: JSON.stringify(normalizedBody),
        cache: "no-store",
        signal: ac.signal
      });

      const ct = upstream.headers.get("content-type") || "";

      if (!upstream.ok && ct.includes("application/json")) {
        const payload = await upstream.json().catch(() => ({}));

        return j(
          {
            ok: false,
            message:
              payload?.message ||
              payload?.error ||
              (upstream.status === 422 ? "Validation failed" : `HTTP ${upstream.status}`),
            upstreamStatus: upstream.status,
            upstreamErrors: payload?.errors || payload?.details
          },
          upstream.status
        );
      }

      if (ct.includes("application/json")) {
        const json = await upstream.json().catch(() => ({}));
        return j(json, upstream.status);
      }

      const text = await upstream.text().catch(() => "");
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "Content-Type": ct || "text/plain; charset=utf-8" }
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
          : err?.message || "Proxy error"
      },
      aborted ? 504 : 502
    );
  }
}
