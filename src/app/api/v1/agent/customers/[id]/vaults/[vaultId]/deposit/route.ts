// app/api/v1/agent/customers/[id]/vaults/[vaultId]/deposit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

const RAW = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45_000);

// ensure exactly one /v1
function withV1(base: string) {
  const lower = base.toLowerCase();
  if (!base) return "";
  if (lower.endsWith("/v1") || lower.includes("/v1/")) return base;
  return `${base}/v1`;
}
const API_V1 = withV1(RAW);

function J(d: any, s = 200, extra?: Record<string, string>) {
  const r = NextResponse.json(d, { status: s });
  if (extra) for (const [k, v] of Object.entries(extra)) r.headers.set(k, v);
  return r;
}

// Next 13/14/15-safe accessors
async function getCookieStore() {
  const m = (cookiesFn as any)();
  return typeof m?.then === "function" ? await m : m;
}
async function getHeadersStore() {
  const m = (headersFn as any)();
  return typeof m?.then === "function" ? await m : m;
}

async function getBearer(req: NextRequest) {
  const jar = await getCookieStore();
  const hdrs = await getHeadersStore();

  const cookieTok =
    jar?.get?.("lw_auth")?.value ||
    jar?.get?.("lw_token")?.value ||
    jar?.get?.("authToken")?.value ||
    jar?.get?.("token")?.value ||
    jar?.get?.("session")?.value ||
    "";

  const auth = (
    hdrs.get("authorization") ||
    req.headers.get("authorization") ||
    ""
  )
    .replace(/^Bearer\s+/i, "")
    .trim();

  const x = (hdrs.get("x-lw-auth") || req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  // return the bare token (no "Bearer ")
  return auth || x || cookieTok || "";
}

async function fetchJSON(
  url: string,
  init?: RequestInit,
  timeout = TIMEOUT_MS
) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort("timeout"), timeout);
  try {
    const res = await fetch(url, { ...init, signal: ac.signal });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { message: text || res.statusText };
    }
    return { res, json, text };
  } finally {
    clearTimeout(t);
  }
}

export async function POST(
  req: NextRequest,
  ctx: {
    params:
      | Promise<{ id: string; vaultId: string }>
      | { id: string; vaultId: string };
  }
) {
  if (!API_V1) return J({ ok: false, message: "Missing BACKEND_API_URL" }, 500);

  const bearer = await getBearer(req);
  if (!bearer) return J({ ok: false, message: "Authentication required" }, 401);

  const { id, vaultId } =
    typeof (ctx.params as any)?.then === "function"
      ? await (ctx.params as any)
      : (ctx.params as any);

  if (!id || !vaultId)
    return J({ ok: false, message: "Missing customer/vault id" }, 400);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return J({ ok: false, message: "Invalid JSON body" }, 400);
  }

  const rawAmt = body.amount;
  const pin = String(body.pin || "").trim();
  const narration = body.narration ?? body.note ?? undefined;

  const amount =
    typeof rawAmt === "number"
      ? rawAmt
      : parseFloat(String(rawAmt || "").replace(/,/g, ""));
  if (!amount || amount <= 0)
    return J(
      { ok: false, field: "amount", message: "Valid amount is required" },
      422
    );
  if (!pin)
    return J({ ok: false, field: "pin", message: "PIN is required" }, 422);

  // ---------- Best-effort balance check (non-blocking) ----------
  let creditMeta: Record<string, string> = {};
  try {
    const balUrl = `${API_V1}/agent/balances`;
    const { res, json } = await fetchJSON(balUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      cache: "no-store",
    });

    if (res.ok) {
      const d = json?.data || json || {};
      const credit =
        Number(d.rechargeBalance ?? d.creditBalance ?? d.balance ?? 0) || 0;
      creditMeta = {
        "X-Precheck-Credit": String(credit),
        "X-Precheck-Amount": String(amount),
      };
      // Do NOT block here; client UI already guards, and upstream is source of truth.
    } else {
      creditMeta = { "X-Precheck": `balances HTTP ${res.status}` };
    }
  } catch (e: any) {
    creditMeta = { "X-Precheck": "balances-error" };
  }

  // ---------- Forward deposit to upstream ----------
  const url = `${API_V1}/agent/customers/${encodeURIComponent(
    id
  )}/vaults/${encodeURIComponent(vaultId)}/deposit`;

  const upstreamBody = {
    amount: String(amount),
    pin,
    ...(narration ? { narration } : {}),
  };

  try {
    const { res, json, text } = await fetchJSON(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`, // canonical
        "x-lw-auth": `Bearer ${bearer}`, // alt path, ensure Bearer
      },
      body: JSON.stringify(upstreamBody),
      cache: "no-store",
    });

    // Mirror upstream (status + body) but add tiny debug headers
    const out =
      typeof json === "object" && json !== null
        ? NextResponse.json(json, { status: res.status })
        : new NextResponse(text, {
            status: res.status,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          });

    Object.entries({
      "X-Route": "vault-deposit-R3",
      ...creditMeta,
    }).forEach(([k, v]) => out.headers.set(k, v));

    return out;
  } catch (err: any) {
    console.error("[vault deposit] network error", err);
    return J(
      {
        ok: false,
        message: "Upstream not reachable",
        detail: String(err?.message || err),
      },
      502,
      { "X-Route": "vault-deposit-R3" }
    );
  }
}
