// app/api/auth/submit-user-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/* -------------------- Config -------------------- */
const clean = (s = "") => s.replace(/\/+$/, "");
const V1 = clean(process.env.BACKEND_API_URL || "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

/* ---------- Turnstile config ---------- */
const TURNSTILE_SECRET = (process.env.TURNSTILE_SECRET_KEY || "").trim();
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
/* ---------- /Turnstile config ---------- */

/* -------------------- Helpers -------------------- */
function readClientIp(req: NextRequest) {
  const cf = req.headers.get("CF-Connecting-IP");
  if (cf) return cf;
  const xff =
    req.headers.get("X-Forwarded-For") || req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xr = req.headers.get("x-real-ip");
  if (xr) return xr;
  return "";
}

function readTurnstileToken(body: any) {
  return (
    String(
      body?.captchaToken ||
        body?.turnstileToken ||
        body?.["cf-turnstile-response"] ||
        ""
    ).trim() || ""
  );
}

async function verifyTurnstile(token: string, ip?: string) {
  if (!TURNSTILE_SECRET) {
    return { ok: false, reason: "Missing TURNSTILE_SECRET_KEY env" as const };
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
          (globalThis as any).crypto?.randomUUID?.() ??
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

async function readCookie(name: string) {
  try {
    const store = await cookies();
    return store.get(name)?.value || "";
  } catch {
    return "";
  }
}

function jsonSafe(text: string) {
  try {
    return JSON.parse(text || "{}");
  } catch {
    return { message: text };
  }
}

/**
 * Consolidate all possible bearer locations to avoid 401 during flow.
 * Priority: Authorization > x-lw-auth > body > query > cookies
 */
async function readBearer(req: NextRequest, body: any) {
  const header = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  const altHdr = (req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  const url = new URL(req.url);
  const queryTok = (url.searchParams.get("token") || "").trim();
  const bodyTok = String(body?.accessToken || body?.token || "").trim();

  const cookieTok =
    (await readCookie("lw_token")) || (await readCookie("token"));

  return header || altHdr || bodyTok || queryTok || cookieTok || "";
}

export async function POST(req: NextRequest) {
  console.log("=== SUBMIT USER DATA ROUTE DEBUG ===");

  if (!V1) {
    console.error("Missing BACKEND_API_URL:", process.env.BACKEND_API_URL);
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL (v1)" },
      { status: 500 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  /* ---- Turnstile enforcement ---- */
  const tokenTs = readTurnstileToken(body);
  if (!tokenTs) {
    return NextResponse.json(
      { success: false, message: "Missing Turnstile token" },
      { status: 400 }
    );
  }

  const ip = readClientIp(req);
  const verdict = await verifyTurnstile(tokenTs, ip);
  if (!verdict.ok) {
    return NextResponse.json(
      {
        success: false,
        message: "Turnstile verification failed",
        details: verdict.data ?? verdict.reason ?? "unknown",
      },
      { status: 403 }
    );
  }

  // Optional hardening if you set <Turnstile action="signup_details" />
  // const { action, hostname } = verdict.data || {};
  // if (action !== "signup_details") {
  //   return NextResponse.json(
  //     { success: false, message: "Unexpected Turnstile action" },
  //     { status: 403 }
  //   );
  // }
  // if (hostname && !hostname.endsWith("littlewheel.app")) {
  //   return NextResponse.json(
  //     { success: false, message: "Unexpected Turnstile hostname" },
  //     { status: 403 }
  //   );
  // }

  /* ---- Bearer/session handling ---- */
  const bearer = await readBearer(req, body);
  const sessionId =
    body?.sessionId ||
    req.headers.get("x-session-id") ||
    (await readCookie("lw_signup_session")) ||
    "";

  console.log("Token sources check:", {
    hasAuthorizationHeader: !!req.headers.get("authorization"),
    hasXLwAuthHeader: !!req.headers.get("x-lw-auth"),
    hasCookie_lw_token: !!(await readCookie("lw_token")),
    hasCookie_token: !!(await readCookie("token")),
    hasBodyToken: !!(body?.accessToken || body?.token),
    hasQueryToken: new URL(req.url).searchParams.has("token"),
    finalBearerChars: bearer ? bearer.length : 0,
    sessionId: sessionId ? "[present]" : "MISSING",
    V1,
  });

  if (!bearer) {
    console.error("NO BEARER TOKEN FOUND");
    return NextResponse.json(
      {
        success: false,
        message: "Missing Bearer token. Please verify/login again.",
        debug: {
          authHeader: !!req.headers.get("authorization"),
          xLwAuth: !!req.headers.get("x-lw-auth"),
          cookie_lw_token: !!(await readCookie("lw_token")),
          cookie_token: !!(await readCookie("token")),
          bodyToken: !!(body?.accessToken || body?.token),
          queryToken: new URL(req.url).searchParams.has("token"),
          sessionId: !!sessionId,
        },
      },
      { status: 401 }
    );
  }

  /* ---- Upstream request ---- */
  const url = `${V1}/auth/submit-user-data`;

  const payload = {
    firstName: body.firstName,
    lastName: body.lastName,
    middleName: body.middleName,
    dob: body.dob,
    ...(body.avatarUrl ? { avatarUrl: body.avatarUrl } : {}),
    ...(body.referralCode ? { referralCode: body.referralCode } : {}),
    password: body.password || body.pin, // align with your Swagger
    gender: body.gender,
    username: body.username,
  };

  console.log("=== TOKEN DEBUG ===");
  console.log("Bearer token (first 50):", bearer.substring(0, 50) + "...");
  console.log(
    "Bearer token (last 20):",
    "..." + bearer.substring(Math.max(0, bearer.length - 20))
  );
  console.log("Token length:", bearer.length);
  console.log("Token starts with:", bearer.substring(0, 10));
  console.log("===================");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${bearer}`,
    ...(sessionId ? { "x-session-id": sessionId } : {}),
  };

  console.log("Making request to V1:", {
    url,
    headers: {
      ...Object.fromEntries(
        Object.entries(headers).map(([k, v]) => [
          k,
          k === "Authorization" ? `Bearer [${bearer.length} chars]` : v,
        ])
      ),
    },
    payload: { ...payload, password: "[REDACTED]" },
  });

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

  try {
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: ac.signal,
    });

    const text = await r.text();
    const data = jsonSafe(text);

    console.log("V1 response details:", {
      status: r.status,
      statusText: r.statusText,
      success: data?.success,
      message: data?.message,
      fullResponseText: text,
      hasData: !!data,
    });

    if (!r.ok) {
      console.error("V1 request failed details:", {
        status: r.status,
        headers: Object.fromEntries(r.headers.entries()),
        data,
      });
    }

    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    console.error("Submit user data error:", e);

    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Upstream fetch failed",
      },
      { status: aborted ? 504 : 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
