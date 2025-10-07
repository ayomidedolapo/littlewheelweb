// app/api/v1/agent/balances/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RAW = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

// If BACKEND_API_URL already includes /v1 at the end or anywhere, don't add another /v1.
function withApiV1(base: string) {
  const lower = base.toLowerCase();
  if (lower.endsWith("/v1") || lower.includes("/v1/")) return base;
  return `${base}/v1`;
}

const V1 = RAW ? withApiV1(RAW) : "";

async function readCookie(name: string) {
  try {
    const store = await cookies();
    return store.get(name)?.value || "";
  } catch {
    return "";
  }
}

async function readTokenFromReq(req: NextRequest) {
  // Accept either Authorization: Bearer <token> or x-lw-auth: <raw>
  const authHdr = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const altHdr = (req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const cookieTok =
    (await readCookie("authToken")) ||
    (await readCookie("lw_auth")) ||
    (await readCookie("lw_token")) ||
    (await readCookie("token")) ||
    "";

  return authHdr || altHdr || cookieTok || "";
}

function asBearer(raw: string) {
  return raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`;
}

function n(v: any): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

/** Extract a reliable credit balance number from many possible shapes. */
function normalizeCreditBalance(payload: any): number {
  const picks = [
    payload?.creditBalance,
    payload?.credit,
    payload?.availableCredit,
    payload?.currentCreditBalance,
    payload?.wallet?.creditBalance,
    payload?.data?.creditBalance,
    payload?.data?.credit,
    payload?.balances?.creditBalance,
    payload?.balances?.credit,
    payload?.balances?.credit?.available,
  ];
  for (const p of picks) {
    const v = n(p);
    if (v != null) return v;
  }
  // Try common arrays
  if (Array.isArray(payload?.balances)) {
    for (const b of payload.balances) {
      const v =
        n(b?.creditBalance) || n(b?.credit) || n(b?.available) || n(b?.value);
      if (v != null) return v;
    }
  }
  return 0;
}

export async function GET(req: NextRequest) {
  if (!V1) {
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL" },
      { status: 500 }
    );
  }

  const tok = await readTokenFromReq(req);
  if (!tok) {
    return NextResponse.json(
      { success: false, message: "Missing authentication token" },
      { status: 401 }
    );
  }

  const url = `${V1}/agent/balances`; // single /v1

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("[proxy] GET", url);
    }

    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        // Send both: some gateways check one, some the other.
        Authorization: asBearer(tok),
        "x-lw-auth": tok,
      },
      cache: "no-store",
      signal: ac.signal,
    });

    const text = await upstream.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text || upstream.statusText };
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Failed to fetch balances",
          upstreamStatus: upstream.status,
        },
        { status: upstream.status }
      );
    }

    // Normalize and expose a top-level creditBalance
    const creditBalance = normalizeCreditBalance(data);

    return NextResponse.json(
      {
        success: true,
        creditBalance,
        balances: data?.balances || data?.data || data,
        ...data,
      },
      { status: upstream.status }
    );
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Request timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Network error",
      },
      { status: aborted ? 504 : 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
