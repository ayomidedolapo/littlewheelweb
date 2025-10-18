// app/api/v1/agent/customers/[id]/vaults/[vaultId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE_V1 = (
  process.env.BACKEND_API_URL || "https://api.littlewheel.app/v1"
).replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45_000);
const ROUTE_REV = "vaults-detail-R7"; // bump so you can verify in prod

async function getCookieStore() {
  const m = (cookiesFn as any)();
  return typeof m?.then === "function" ? await m : m;
}
async function getHeadersStore() {
  const m = (headersFn as any)();
  return typeof m?.then === "function" ? await m : m;
}

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  ms = TIMEOUT_MS
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort("timeout"), ms);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(t)
  );
}

function jsonOut(body: any, status = 200) {
  const r = NextResponse.json(body, { status });
  r.headers.set("X-Route-Rev", ROUTE_REV);
  return r;
}

function pickNumber(...vals: any[]) {
  for (const v of vals) {
    const n = Number(v);
    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  }
  return 0;
}

/** Use x-lw-auth (raw), then Authorization (raw), then cookies (raw). */
async function getAuthPieces(req: NextRequest) {
  const jar = await getCookieStore();
  const hdrs = await getHeadersStore();

  const xRaw = (hdrs.get("x-lw-auth") || req.headers.get("x-lw-auth") || "")
    .trim()
    .replace(/^Bearer\s+/i, "");
  const authRaw = (
    hdrs.get("authorization") ||
    req.headers.get("authorization") ||
    ""
  )
    .trim()
    .replace(/^Bearer\s+/i, "");
  const cookieTok =
    jar?.get?.("lw_auth")?.value ||
    jar?.get?.("lw_token")?.value ||
    jar?.get?.("authToken")?.value ||
    jar?.get?.("token")?.value ||
    "";

  const raw = (xRaw || authRaw || cookieTok).trim();
  return { raw, bearer: raw ? `Bearer ${raw}` : "" };
}

export async function GET(
  req: NextRequest,
  ctx: {
    params:
      | Promise<{ id: string; vaultId: string }>
      | { id: string; vaultId: string };
  }
) {
  try {
    const params = await (typeof (ctx.params as any)?.then === "function"
      ? (ctx.params as any)
      : ctx.params);
    const id = params?.id;
    const vaultId = params?.vaultId;

    if (!BASE_V1)
      return jsonOut(
        { success: false, where: "route", message: "Missing BACKEND_API_URL" },
        500
      );
    if (!id || !vaultId)
      return jsonOut(
        { success: false, where: "route", message: "Missing id or vaultId" },
        400
      );

    const { raw, bearer } = await getAuthPieces(req);
    if (!raw)
      return jsonOut(
        { success: false, where: "route", message: "Unauthorized: no token" },
        401
      );

    // Optional balance call
    let balanceData: any = null;
    try {
      const balUrl = `${BASE_V1}/agent/customers/${encodeURIComponent(
        id
      )}/vaults/${encodeURIComponent(vaultId)}/balance`;
      const balRes = await fetchWithTimeout(balUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: bearer, // Bearer <raw>
          "x-lw-auth": raw, // RAW token only (no "Bearer ")
        },
        cache: "no-store",
      });
      if (balRes.ok) {
        const j = await balRes.json().catch(() => ({}));
        balanceData = j?.data ?? j ?? null;
      }
    } catch {}

    // Vault detail
    const url = `${BASE_V1}/agent/customers/${encodeURIComponent(
      id
    )}/vaults/${encodeURIComponent(vaultId)}`;
    const upstream = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: bearer,
        "x-lw-auth": raw, // RAW token
      },
      cache: "no-store",
    });

    const text = await upstream.text();
    const ct = upstream.headers.get("content-type") ?? "application/json";

    if (!upstream.ok) {
      // Pipe upstream JSON message if possible (keep it readable in prod)
      if (ct.includes("application/json")) {
        try {
          const j = JSON.parse(text);
          return jsonOut(
            {
              success: false,
              where: "upstream",
              message: j?.message || j?.error || `HTTP ${upstream.status}`,
              upstreamStatus: upstream.status,
              debug: {
                routeRev: ROUTE_REV,
                // redact token but keep a small preview for triage
                tokenPreview: raw ? `${raw.slice(0, 8)}…${raw.slice(-6)}` : "",
              },
            },
            upstream.status
          );
        } catch {}
      }
      const out = new NextResponse(text, {
        status: upstream.status,
        headers: { "content-type": ct },
      });
      out.headers.set("X-Route-Rev", ROUTE_REV);
      return out;
    }

    let vJson: any = {};
    try {
      vJson = ct.includes("application/json") ? JSON.parse(text) : {};
    } catch {}
    const upstreamData = vJson?.data ?? vJson ?? {};

    const currentAmount = pickNumber(
      balanceData?.currentAmount,
      balanceData?.currentBalance,
      upstreamData?.currentAmount,
      upstreamData?.currentBalance,
      upstreamData?.balance
    );
    const currentBalance = pickNumber(
      balanceData?.currentBalance,
      balanceData?.currentAmount,
      upstreamData?.currentBalance,
      upstreamData?.currentAmount,
      upstreamData?.balance
    );
    const availableBalance = pickNumber(
      balanceData?.availableBalance,
      upstreamData?.availableBalance,
      currentBalance
    );

    return jsonOut(
      {
        success: true,
        data: {
          ...upstreamData,
          currentAmount,
          currentBalance,
          availableBalance,
        },
      },
      200
    );
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return jsonOut(
      {
        success: false,
        where: "route",
        message: aborted
          ? `timeout ${TIMEOUT_MS}ms`
          : e?.message || "Network error",
        debug: { routeRev: ROUTE_REV },
      },
      aborted ? 504 : 502
    );
  }
}
