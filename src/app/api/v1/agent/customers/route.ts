// app/api/v1/agent/customers/route.ts
import { NextRequest, NextResponse } from "next/server";

/* --- Dynamic (auth/cookies) --- */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* --- Config --- */
const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

/* --- Turnstile config (server verify) --- */
const TURNSTILE_SECRET = (process.env.TURNSTILE_SECRET_KEY || "").trim();
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
/** If true, allow missing/failed Turnstile in development */
const ALLOW_TURNSTILELESS_DEV =
  (process.env.ALLOW_TURNSTILELESS_DEV || "").toLowerCase() === "true";

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

/** Extract a Turnstile token from common client body fields */
function readTurnstileToken(body: any): string {
  return (
    String(
      body?.captchaToken ||
        body?.turnstileToken ||
        body?.["cf-turnstile-response"] ||
        body?.token || // last resort: don't rely on this in prod
        ""
    ).trim() || ""
  );
}

/** Best-effort client IP (for Turnstile remoteip) */
function readClientIp(req: NextRequest): string {
  const h = req.headers;
  const cf = h.get("CF-Connecting-IP");
  if (cf) return cf;
  const xff = h.get("x-forwarded-for") || "";
  if (xff) return xff.split(",")[0].trim();
  const xr = h.get("x-real-ip");
  if (xr) return xr;
  return "";
}

/** Verify Turnstile server-side */
async function verifyTurnstile(token: string, ip?: string) {
  if (!TURNSTILE_SECRET) {
    return { ok: false as const, reason: "Missing TURNSTILE_SECRET_KEY env" };
  }
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
        idempotency_key:
          (globalThis.crypto as any)?.randomUUID?.() ??
          `${Date.now()}-${Math.random()}`,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (json?.success) return { ok: true as const, data: json };
    return {
      ok: false as const,
      data: json,
      reason: Array.isArray(json?.["error-codes"])
        ? json["error-codes"].join(",")
        : "turnstile-failed",
    };
  } catch (e: any) {
    return { ok: false as const, reason: e?.message || "turnstile-error" };
  }
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
 *  - Validates Cloudflare Turnstile (server-side)
 *  - Pass-through JSON body otherwise
 * ------------------------------------------- */
export async function POST(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
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

    // 🔐 Turnstile enforcement
    const tsToken = readTurnstileToken(body);
    if (!tsToken) {
      if (isProd || !ALLOW_TURNSTILELESS_DEV) {
        if (debug) {
          console.warn(
            "[onboarding] Missing Turnstile token → rejecting (prod or dev enforcement on)"
          );
        }
        return NextResponse.json(
          { success: false, message: "Missing Turnstile token" },
          { status: 400, headers: corsHeaders() }
        );
      } else if (debug) {
        console.warn(
          "[onboarding] Turnstile token missing — allowed in dev (set ALLOW_TURNSTILELESS_DEV=false to enforce)"
        );
      }
    } else {
      const ip = readClientIp(req);
      const verdict = await verifyTurnstile(tsToken, ip);
      if (!verdict.ok) {
        if (debug) {
          console.warn(
            "[onboarding] Turnstile failed:",
            verdict.reason,
            verdict.data || ""
          );
        }
        return NextResponse.json(
          {
            success: false,
            message: "Turnstile verification failed",
            details: verdict.data ?? verdict.reason ?? "unknown",
          },
          { status: 403, headers: corsHeaders() }
        );
      }
    }

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

    // Optionally strip the captcha token before forwarding upstream
    // (Uncomment if your backend doesn't accept/need it)
    // if ("captchaToken" in body) delete body.captchaToken;
    // rawBody = JSON.stringify(body);

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

    if (debug) {
      const masked =
        body?.phoneNumber?.replace?.(/^(\+?\d{6})\d+/, "$1***") || undefined;
      console.log("=== /api/v1/agent/customers DEBUG BEGIN ===");
      console.log("env:", {
        NODE_ENV: process.env.NODE_ENV,
        ALLOW_TURNSTILELESS_DEV,
        TURNSTILE_SECRET_present: !!TURNSTILE_SECRET,
        TURNSTILE_SECRET_len: TURNSTILE_SECRET ? TURNSTILE_SECRET.length : 0,
        API_BASE,
      });
      console.log("incoming:", {
        phone_masked: masked,
        hasCaptcha: !!tsToken,
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
