// app/api/v1/agent/customers/route.ts
import { NextRequest, NextResponse } from "next/server";

/* --- Dynamic (auth/cookies) --- */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* --- Config --- */
const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

/* --- Helpers --- */
function ensureBase() {
  if (!API_BASE) throw new Error("Missing BACKEND_API_URL");
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-lw-auth, x-session-id",
    "Access-Control-Max-Age": "86400",
  };
}

/** Safely collect multiple Set-Cookie headers (node fetch polyfills differ) */
function collectSetCookies(h: Headers): string[] {
  const anyHeaders = h as any;
  const arr =
    anyHeaders.getSetCookie?.() ||
    anyHeaders.raw?.()["set-cookie"] ||
    (h.get("set-cookie") ? [h.get("set-cookie")] : []);
  return (arr || []).filter(Boolean) as string[];
}

/** Read bearer from cookies or headers */
async function readBearer(req: NextRequest): Promise<string> {
  const cookieStore = await (await import("next/headers")).cookies();

  const fromCookie =
    cookieStore.get("authToken")?.value ||
    cookieStore.get("lw_token")?.value ||
    cookieStore.get("token")?.value ||
    "";

  const fromAuth =
    req.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() || "";

  const fromXlw =
    req.headers
      .get("x-lw-auth")
      ?.replace(/^Bearer\s+/i, "")
      .trim() || "";

  return fromCookie || fromAuth || fromXlw || "";
}

/* --- Preflight --- */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/* -------------------------------------------
 * GET /api/v1/agent/customers
 *  - Proxies to: {API_BASE}/agent/customers
 *  - Forwards all query params (page, limit, search, etc.)
 *  - Includes cookies + bearer for auth
 * ------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    ensureBase();

    const bearer = await readBearer(req);
    if (!bearer) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Build upstream URL and forward all query params
    const inUrl = new URL(req.url);
    const upstreamUrl = new URL(`${API_BASE}/agent/customers`);
    inUrl.searchParams.forEach((v, k) => upstreamUrl.searchParams.set(k, v));

    const headers = new Headers();
    headers.set("accept", "application/json");
    headers.set("authorization", `Bearer ${bearer}`);
    headers.set("x-lw-auth", bearer);

    const inboundCookie = req.headers.get("cookie");
    if (inboundCookie) headers.set("cookie", inboundCookie);

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

    const r = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
      signal: ac.signal,
      redirect: "manual",
    }).finally(() => clearTimeout(timer));

    const bodyText = await r.text();

    const out = new NextResponse(bodyText, {
      status: r.status,
      headers: {
        ...corsHeaders(),
        "content-type":
          r.headers.get("content-type") || "application/json; charset=utf-8",
      },
    });

    for (const c of collectSetCookies(r.headers)) {
      out.headers.append("set-cookie", c);
    }

    return out;
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Proxy error",
      },
      { status: aborted ? 504 : 502, headers: corsHeaders() }
    );
  }
}

/* -------------------------------------------
 * POST /api/v1/agent/customers
 *  - Proxies to: {API_BASE}/agent/customers
 *  - Starts onboarding (expects phoneNumber in body)
 *  - NO captcha / Turnstile checks anymore
 *  - Pass-through JSON body
 * ------------------------------------------- */
export async function POST(req: NextRequest) {
  const debug = true; // flip to false if you want silence

  let rawBody = "";
  let body: any = {};
  try {
    rawBody = await req.text();
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400, headers: corsHeaders() }
    );
  }

  try {
    ensureBase();

    const bearer = await readBearer(req); // upstream may require auth for agents
    const inboundCookie = req.headers.get("cookie");

    const headers = new Headers();
    headers.set("accept", "application/json");
    headers.set("content-type", "application/json");
    if (bearer) {
      headers.set("authorization", `Bearer ${bearer}`);
      headers.set("x-lw-auth", bearer);
    }
    if (inboundCookie) headers.set("cookie", inboundCookie);

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

    if (debug) {
      const masked =
        body?.phoneNumber?.replace?.(/^(\+?\d{6})\d+/, "$1***") || undefined;
      console.log("=== /api/v1/agent/customers DEBUG BEGIN ===");
      console.log("env:", {
        NODE_ENV: process.env.NODE_ENV,
        API_BASE,
      });
      console.log("incoming:", {
        phone_masked: masked,
      });
      console.log("[onboarding] → upstream POST", {
        url: `${API_BASE}/agent/customers`,
        withAuth: !!bearer,
      });
    }

    const r = await fetch(`${API_BASE}/agent/customers`, {
      method: "POST",
      headers,
      body: rawBody,
      cache: "no-store",
      signal: ac.signal,
      redirect: "manual",
    }).finally(() => clearTimeout(timer));

    const bodyText = await r.text();

    if (debug) {
      if (!r.ok)
        console.warn(
          "[onboarding] upstream non-200:",
          r.status,
          bodyText.slice(0, 300)
        );
      console.log("=== /api/v1/agent/customers DEBUG END ===");
    }

    const out = new NextResponse(bodyText, {
      status: r.status,
      headers: {
        ...corsHeaders(),
        "content-type":
          r.headers.get("content-type") || "application/json; charset=utf-8",
      },
    });

    for (const c of collectSetCookies(r.headers)) {
      out.headers.append("set-cookie", c);
    }

    return out;
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    if (aborted) console.warn("[onboarding] upstream timeout");
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Proxy error",
      },
      { status: aborted ? 504 : 502, headers: corsHeaders() }
    );
  }
}
