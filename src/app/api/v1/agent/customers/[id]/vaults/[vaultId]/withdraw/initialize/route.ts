// app/api/v1/agent/customers/[id]/vaults/[vaultId]/withdraw/initialize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);
const ROUTE_REV = "withdraw-init-R7";

/* ---------- Next-safe accessors ---------- */
async function getCookieStore() {
  const maybe = (cookiesFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}
async function getHeadersStore() {
  const maybe = (headersFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

/* ---------- auth: prefer x-lw-auth, then Authorization, then cookies ---------- */
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

function j(body: any, status = 200) {
  const r = NextResponse.json(body, { status });
  r.headers.set("X-Route-Rev", ROUTE_REV);
  return r;
}

function int(val: any) {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

type ParamsShape =
  | Promise<{ id?: string; customerId?: string; vaultId?: string }>
  | { id?: string; customerId?: string; vaultId?: string };

export async function POST(req: NextRequest, ctx: { params: ParamsShape }) {
  if (!API_BASE)
    return j({ success: false, message: "Missing BACKEND_API_URL" }, 500);

  const params =
    typeof (ctx.params as any)?.then === "function"
      ? await (ctx.params as any)
      : (ctx.params as any);

  // In this route [id] is the customerId, [vaultId] is the vault
  const customerId = params.customerId || params.id;
  const vaultId = params.vaultId;

  if (!customerId || !vaultId) {
    return j({ success: false, message: "Missing customerId or vaultId" }, 400);
  }

  const token = await readBearer(req);
  if (!token)
    return j({ success: false, message: "Authentication required" }, 401);

  // read incoming (from client / agent app)
  let incoming: any = {};
  try {
    incoming = await req.json();
  } catch {
    incoming = {};
  }

  // Backend expects: { "amount": "1000", "beneficiary": "self" | "customer" }
  const amountRaw =
    incoming?.amount ?? incoming?.amountNaira ?? incoming?.naira ?? null;
  const amountNaira = int(amountRaw);

  if (!amountNaira) {
    return j(
      {
        success: false,
        message: "Amount required (naira).",
        hint:
          'Send body like { "amount": 2500, "beneficiary": "self" | "customer" }',
      },
      422
    );
  }

  const beneficiaryRaw =
    incoming?.beneficiary ?? incoming?.mode ?? incoming?.receiver ?? null;
  const beneficiary =
    typeof beneficiaryRaw === "string"
      ? beneficiaryRaw.toLowerCase()
      : null;

  if (beneficiary !== "self" && beneficiary !== "customer") {
    return j(
      {
        success: false,
        message: "Beneficiary required.",
        hint:
          'Send body like { "amount": 2500, "beneficiary": "self" } or { "beneficiary": "customer" }',
      },
      422
    );
  }

  // Swagger screenshot shows amount as a string, so stringify here
  const upstreamBody = {
    amount: String(amountNaira),
    beneficiary,
  };

  const upstreamUrl = `${API_BASE}/agent/customers/${encodeURIComponent(
    String(customerId)
  )}/vaults/${encodeURIComponent(String(vaultId))}/withdraw/initialize`;

  // Timeout control
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

  try {
    const res = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-lw-auth": `Bearer ${token}`,
      },
      cache: "no-store",
      signal: ac.signal,
      body: JSON.stringify(upstreamBody),
    });

    const ct = res.headers.get("content-type") || "";
    const payload = ct.includes("application/json")
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    if (res.ok) {
      if (typeof payload === "string") {
        const out = new NextResponse(payload, {
          status: res.status,
          headers: {
            "Content-Type": ct || "application/json; charset=utf-8",
          },
        });
        out.headers.set("X-Route-Rev", ROUTE_REV);
        return out;
      }
      return j(payload, res.status);
    }

    // Bubble up useful validation errors
    return j(
      {
        success: false,
        message:
          (payload as any)?.message ||
          (payload as any)?.error ||
          `Withdraw initialize failed (HTTP ${res.status}).`,
        upstreamStatus: res.status,
        upstreamBody:
          typeof payload === "string"
            ? payload.slice(0, 500)
            : (payload as any),
      },
      422
    );
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return j(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Upstream error",
      },
      aborted ? 504 : 502
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  return j({ message: "Not Found" }, 404);
}
