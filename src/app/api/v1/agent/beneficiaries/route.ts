// app/api/v1/agent/beneficiaries/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45_000);

/* ---------------- CORS helpers ---------------- */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-lw-auth",
    "Access-Control-Max-Age": "86400",
  };
}
function withCors(res: NextResponse) {
  const h = corsHeaders();
  Object.entries(h).forEach(([k, v]) => res.headers.set(k, String(v)));
  return res;
}

/* ---------------- glue ---------------- */
function joinUpstreamPath(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (BASE.endsWith("/v1") && p.startsWith("/v1")) {
    return BASE + p.replace(/^\/v1/, "");
  }
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

async function readBearer(req: NextRequest) {
  const hdr = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const alt = (req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  const cookieTok =
    (await readCookie("lw_auth")) ||
    (await readCookie("lw_token")) ||
    (await readCookie("token")) ||
    "";

  return hdr || alt || cookieTok || "";
}

function absoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.toString(); // already absolute
  } catch {
    if (!BASE) return null;
    const joined = new URL(url.replace(/^\//, ""), BASE + "/");
    return joined.toString();
  }
}

/* ---------------- normalization ---------------- */

/** Try hard to extract the real backend customer/user id used by /agent/customers/:id/... */
function deriveApiCustomerId(obj: any): string {
  if (!obj || typeof obj !== "object") return "";
  const u = obj.user || obj.customer || obj.owner || {};
  // prefer nested user/customer/owner ids
  const candidates = [
    u?.id,
    u?._id,
    obj.customerId,
    obj.userId,
    obj.ownerId,
    // sometimes upstream nests another envelope:
    obj?.beneficiary?.userId,
    obj?.beneficiary?.customerId,
  ];
  const found = candidates.find(
    (v) => typeof v === "string" && v.trim().length > 0
  );
  return found ? String(found) : "";
}

/** Return a separate beneficiary id (never to be used for /agent/customers/:id routes) */
function deriveBeneficiaryId(obj: any): string {
  if (!obj || typeof obj !== "object") return "";
  const b = obj.beneficiary || obj;
  const candidates = [b.beneficiaryId, b.id, b._id];
  const found = candidates.find(
    (v) => typeof v === "string" && v.trim().length > 0
  );
  return found ? String(found) : "";
}

function normalizeAvatar(b: any): string | null {
  const candidates = [b?.profileImageUrl, b?.avatarUrl, b?.avatar, b?.imageUrl];
  let chosen = candidates.find(Boolean) ?? null;

  // ignore local file paths if any
  if (chosen && /^(?:[a-zA-Z]:\\|file:)/i.test(chosen)) chosen = null;

  const normalized = absoluteUrl(chosen);
  return normalized ?? null;
}

function normalizeBeneficiaryRow(b: any) {
  if (!b || typeof b !== "object") return b;

  const profileImageUrl = normalizeAvatar(b);
  const apiCustomerId = deriveApiCustomerId(b);
  const beneficiaryId = deriveBeneficiaryId(b);

  // try to expose basic identity fields too (helps UI mapping)
  const user = b.user || b.customer || b.owner || {};
  const firstName =
    user.firstName ||
    user.firstname ||
    user.first_name ||
    user.givenName ||
    user.given_name ||
    b.firstName ||
    "";
  const lastName =
    user.lastName ||
    user.lastname ||
    user.last_name ||
    user.surname ||
    user.family_name ||
    b.lastName ||
    "";
  const phone =
    user.phoneNumber ||
    user.msisdn ||
    user.phone ||
    b.phoneNumber ||
    b.msisdn ||
    b.phone ||
    "";

  return {
    ...b,
    // canonical fields the UI can count on:
    apiCustomerId, // <-- use this when calling /agent/customers/:id/*
    beneficiaryId, // <-- keep for display/debug; NOT for API calls
    profileImageUrl, // <-- one canonical avatar field
    // helpful mirrors (non-breaking):
    firstName,
    lastName,
    phoneNumber: phone,
  };
}

function normalizePayload(payload: any) {
  if (Array.isArray(payload)) return payload.map(normalizeBeneficiaryRow);

  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) {
      return { ...payload, data: payload.data.map(normalizeBeneficiaryRow) };
    }
    if (Array.isArray(payload.results)) {
      return {
        ...payload,
        results: payload.results.map(normalizeBeneficiaryRow),
      };
    }
  }
  return payload;
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

/* ---------------- routes ---------------- */
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(req: NextRequest) {
  if (!BASE) {
    return withCors(
      NextResponse.json(
        { success: false, message: "Missing BACKEND_API_URL" },
        { status: 500 }
      )
    );
  }

  const bearer = await readBearer(req);
  if (!bearer) {
    const out = NextResponse.json(
      { success: false, message: "Missing authentication token" },
      { status: 401 }
    );
    out.headers.set("Cache-Control", "no-store");
    return withCors(out);
  }

  const qs = req.nextUrl.search || ""; // includes leading '?'
  const upstreamUrl = joinUpstreamPath(`/v1/agent/beneficiaries${qs}`);

  try {
    const r = await fetchWithTimeout(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${bearer}`, // single source of auth
      },
      cache: "no-store",
    });

    const text = await r.text();
    let parsed: any;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { message: text || r.statusText };
    }

    if (!r.ok) {
      const out = NextResponse.json(
        {
          success: false,
          message:
            parsed?.message || parsed?.error || `Failed (HTTP ${r.status})`,
        },
        { status: r.status }
      );
      out.headers.set("Cache-Control", "no-store");
      return withCors(out);
    }

    const normalized = normalizePayload(parsed);
    const out = NextResponse.json(
      { success: true, ...normalized },
      { status: r.status }
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
