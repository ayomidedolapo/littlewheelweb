// app/api/v1/agent/customers/[id]/vaults/balance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE_RAW = (process.env.BACKEND_API_URL || "").trim();
const BASE = BASE_RAW.replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

/* ---------------- utils ---------------- */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-lw-auth",
    "Access-Control-Max-Age": "86400",
  };
}
function withCors(res: NextResponse) {
  Object.entries(corsHeaders()).forEach(([k, v]) =>
    res.headers.set(k, String(v))
  );
  return res;
}

function joinUpstreamPath(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  // If BASE already ends with /v1 and path starts with /v1, drop one /v1 to avoid double
  if (BASE.endsWith("/v1") && p.startsWith("/v1"))
    return BASE + p.replace(/^\/v1/, "");
  return BASE + p;
}

async function readCookie(name: string) {
  try {
    const store = await cookies();
    return store.get(name)?.value || "";
  } catch {
    return "";
  }
}

async function getBearer(req: NextRequest) {
  const explicit = (req.headers.get("authorization") || "").trim(); // may already be "Bearer …"
  const alt = (req.headers.get("x-lw-auth") || "").trim(); // raw JWT
  const cookieTok =
    (await readCookie("lw_auth")) ||
    (await readCookie("lw_token")) ||
    (await readCookie("token")) ||
    "";

  if (explicit)
    return explicit.startsWith("Bearer ") ? explicit : `Bearer ${explicit}`;
  if (alt) return alt.startsWith("Bearer ") ? alt : `Bearer ${alt}`;
  if (cookieTok) return `Bearer ${cookieTok}`;
  return "";
}

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  ms = TIMEOUT_MS
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(t)
  );
}

/**
 * Try to understand many possible backend shapes and return a reliable number.
 * Accepted shapes:
 *  - 12345
 *  - "12345"
 *  - { balance: 12345 } / { totalBalance: 12345 }
 *  - { data: { balance: 12345 } } / { data: 12345 }
 *  - { data: [...] } or [...] of vaults (sum by currentAmount/currentBalance/balance/amount)
 */
function normalizeBalance(parsed: any): number {
  // Primitive number or numeric string
  if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
  if (
    typeof parsed === "string" &&
    parsed.trim() &&
    !Number.isNaN(Number(parsed))
  ) {
    return Number(parsed);
  }

  const pickNum = (obj: any): number | null => {
    const candidates = [
      obj?.balance,
      obj?.totalBalance,
      obj?.currentBalance,
      obj?.currentAmount,
      obj?.amount,
      obj?.value,
    ];
    for (const v of candidates) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  // { data: X }
  if (parsed && typeof parsed === "object" && "data" in parsed) {
    const d = (parsed as any).data;
    if (typeof d === "number" && Number.isFinite(d)) return d;
    if (typeof d === "string" && d.trim() && !Number.isNaN(Number(d)))
      return Number(d);
    const n = pickNum(d);
    if (n != null) return n;
    if (Array.isArray(d)) {
      return d.reduce((sum, v) => {
        const n = pickNum(v);
        return sum + (n || 0);
      }, 0);
    }
  }

  // plain object with known keys
  if (parsed && typeof parsed === "object") {
    const n = pickNum(parsed);
    if (n != null) return n;

    // { results: [...] } or { items: [...] }
    const arr =
      (Array.isArray((parsed as any).results) && (parsed as any).results) ||
      (Array.isArray((parsed as any).items) && (parsed as any).items);
    if (arr) {
      return arr.reduce((sum: number, v: any) => {
        const n = pickNum(v);
        return sum + (n || 0);
      }, 0);
    }
  }

  // Array of vaults
  if (Array.isArray(parsed)) {
    return parsed.reduce((sum, v) => {
      const n = pickNum(v);
      return sum + (n || 0);
    }, 0);
  }

  return 0; // fallback
}

/* ---------------- routes ---------------- */
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!BASE) {
    return withCors(
      NextResponse.json(
        { success: false, message: "Missing BACKEND_API_URL" },
        { status: 500 }
      )
    );
  }

  const { id } = await ctx.params; // IMPORTANT: await params (app router quirk)
  if (!id) {
    return withCors(
      NextResponse.json(
        { success: false, message: "Missing customer id" },
        { status: 400 }
      )
    );
  }

  const bearer = await getBearer(req);
  if (!bearer) {
    const out = NextResponse.json(
      { success: false, message: "Missing authentication token" },
      { status: 401 }
    );
    return withCors(out);
  }

  // Build upstream URL safely (handles /v1 duplication)
  const upstreamUrl = joinUpstreamPath(
    `/v1/agent/customers/${encodeURIComponent(id)}/vaults/balance`
  );

  try {
    const upstream = await fetchWithTimeout(upstreamUrl, {
      method: "GET",
      headers: {
        Authorization: bearer,
        "x-lw-auth": (req.headers.get("x-lw-auth") ?? "") as string,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await upstream.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // not JSON → try to parse numeric text
      parsed = text;
    }

    if (!upstream.ok) {
      const out = NextResponse.json(
        {
          success: false,
          message:
            (parsed && (parsed.message || parsed.error)) ||
            `Upstream error (HTTP ${upstream.status})`,
        },
        { status: upstream.status }
      );
      out.headers.set("Cache-Control", "no-store");
      return withCors(out);
    }

    // Normalize to a single number
    const totalBalance = normalizeBalance(parsed);

    const out = NextResponse.json(
      { success: true, customerId: String(id), balance: totalBalance },
      { status: 200 }
    );
    out.headers.set("Cache-Control", "no-store, max-age=0");
    return withCors(out);
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    const out = NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Request timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Network error",
      },
      { status: aborted ? 504 : 502 }
    );
    out.headers.set("Cache-Control", "no-store");
    return withCors(out);
  }
}
