// app/api/v1/agent/customers/[id]/vaults/[vaultId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RAW = (process.env.VITA_API || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45_000);
const ROUTE_REV = "vaults-detail-R4";

/* ---------- ensure exactly one /v1 on base ---------- */
function withV1(base: string) {
  if (!base) return "";
  const lower = base.toLowerCase();
  if (lower.endsWith("/v1") || lower.includes("/v1/")) return base;
  return `${base}/v1`;
}
const API_V1 = withV1(RAW);

/* ---------- small helpers ---------- */
async function getCookieStore() {
  const m = (cookiesFn as any)();
  return typeof m?.then === "function" ? await m : m;
}
async function getHeadersStore() {
  const m = (headersFn as any)();
  return typeof m?.then === "function" ? await m : m;
}
function joinUpstream(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_V1}${p}`;
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

/** Prefer x-lw-auth, then Authorization, then cookies. Return Bearer in BOTH headers. */
async function getAuthPieces(req: NextRequest) {
  const jar = await getCookieStore();
  const hdrs = await getHeadersStore();

  const xRaw = (
    hdrs.get("x-lw-auth") ||
    req.headers.get("x-lw-auth") ||
    ""
  ).trim();
  const authRaw = (
    hdrs.get("authorization") ||
    req.headers.get("authorization") ||
    ""
  )
    .trim()
    .replace(/^Bearer\s+/i, "")
    .trim();
  const cookieTok =
    jar?.get?.("lw_auth")?.value ||
    jar?.get?.("lw_token")?.value ||
    jar?.get?.("authToken")?.value ||
    jar?.get?.("token")?.value ||
    "";

  const raw =
    xRaw.replace(/^Bearer\s+/i, "").trim() || authRaw || cookieTok.trim();

  const bearer = raw ? `Bearer ${raw}` : "";

  // light diagnostics (safe preview)
  let diag: any = {};
  try {
    const [h, p] = raw.split(".");
    if (h && p) {
      const pad = (s: string) =>
        s.replace(/-/g, "+").replace(/_/g, "/") +
        "=".repeat((4 - (s.length % 4)) % 4);
      const header = JSON.parse(Buffer.from(pad(h), "base64").toString("utf8"));
      const payload = JSON.parse(
        Buffer.from(pad(p), "base64").toString("utf8")
      );
      const now = Math.floor(Date.now() / 1000);
      diag = {
        header,
        payload: {
          ...payload,
          _expHuman: payload?.exp
            ? new Date(payload.exp * 1000).toISOString()
            : undefined,
          _now: now,
          _nowHuman: new Date(now * 1000).toISOString(),
          _expired: payload?.exp ? now >= payload.exp : undefined,
        },
        tokenPreview: raw ? `${raw.slice(0, 12)}…${raw.slice(-6)}` : "",
      };
    }
  } catch {
    diag = { tokenDecodeError: "decode failed" };
  }

  return { raw, bearer, diag };
}

function pickNumber(...vals: any[]) {
  for (const v of vals) {
    const n = Number(v);
    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeVault(vaultRaw: any, balanceRaw?: any) {
  const id =
    vaultRaw?.id ||
    vaultRaw?.vaultId ||
    balanceRaw?.vaultId ||
    balanceRaw?.id ||
    "";

  const name = vaultRaw?.name || vaultRaw?.vaultName || "";

  const availableBalance = pickNumber(
    balanceRaw?.availableBalance,
    balanceRaw?.available,
    balanceRaw?.currentAmount,
    balanceRaw?.currentBalance,
    vaultRaw?.availableBalance,
    vaultRaw?.available,
    vaultRaw?.currentAmount,
    vaultRaw?.currentBalance,
    vaultRaw?.amount,
    vaultRaw?.balance
  );

  const currentAmount = pickNumber(
    vaultRaw?.currentAmount,
    vaultRaw?.amount,
    vaultRaw?.currentBalance,
    availableBalance
  );

  const currentBalance = pickNumber(
    vaultRaw?.currentBalance,
    vaultRaw?.balance,
    currentAmount,
    availableBalance
  );

  return {
    id,
    name,
    currentAmount,
    currentBalance,
    availableBalance,
  };
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
    const { id, vaultId } = await (typeof (ctx.params as any)?.then ===
    "function"
      ? (ctx.params as any)
      : ctx.params);

    if (!API_V1)
      return jsonOut(
        { success: false, where: "route", message: "Missing VITA_API" },
        500
      );
    if (!id || !vaultId)
      return jsonOut(
        { success: false, where: "route", message: "Missing id or vaultId" },
        400
      );

    const { raw, bearer, diag } = await getAuthPieces(req);
    if (!raw) {
      return jsonOut(
        { success: false, where: "route", message: "Unauthorized: no token" },
        401
      );
    }

    // Optional: try a dedicated balance endpoint first
    let balanceData: any = null;
    try {
      const balUrl = joinUpstream(
        `/agent/customers/${encodeURIComponent(id)}/vaults/${encodeURIComponent(
          vaultId
        )}/balance`
      );
      const balRes = await fetchWithTimeout(balUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: bearer,
          "x-lw-auth": bearer,
        },
        cache: "no-store",
      });
      if (balRes.ok) {
        const j = await balRes.json().catch(() => ({}));
        balanceData = j?.data ?? j ?? null;
      }
    } catch {
      // ignore; will fall back to vault detail
    }

    // Always fetch vault detail
    const url = joinUpstream(
      `/agent/customers/${encodeURIComponent(id)}/vaults/${encodeURIComponent(
        vaultId
      )}`
    );

    const upstream = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: bearer,
        "x-lw-auth": bearer,
      },
      cache: "no-store",
    });

    const text = await upstream.text();
    const ct = upstream.headers.get("content-type") ?? "application/json";

    // If upstream failed, decorate JSON error for easier debugging
    if (!upstream.ok) {
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
                url,
                tokenDiag: diag,
                sentHeaders: {
                  Authorization: bearer
                    ? `Bearer ${raw.slice(0, 6)}…`
                    : "(none)",
                  "x-lw-auth": bearer ? `Bearer ${raw.slice(0, 6)}…` : "(none)",
                },
              },
            },
            upstream.status
          );
        } catch {
          // fall through
        }
      }
      // Non-JSON or parse error: proxy raw body/status
      const out = new NextResponse(text, {
        status: upstream.status,
        headers: { "content-type": ct },
      });
      out.headers.set("X-Route-Rev", ROUTE_REV);
      return out;
    }

    // Success: normalize consistently
    let vJson: any = {};
    try {
      vJson = ct.includes("application/json") ? JSON.parse(text) : {};
    } catch {
      vJson = {};
    }
    const vData = vJson?.data ?? vJson ?? {};
    const normalized = normalizeVault(vData, balanceData);

    return jsonOut({ ok: true, data: normalized }, 200);
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return jsonOut(
      {
        success: false,
        where: "route",
        message: aborted
          ? `timeout ${TIMEOUT_MS}ms`
          : e?.message || "Network error",
      },
      aborted ? 504 : 502
    );
  }
}
