// app/api/auth/submit-user-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/* -------------------- Config -------------------- */
const clean = (s = "") => s.replace(/\/+$/, "");
const V1 = clean(process.env.BACKEND_API_URL || "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

/* -------------------- Helpers -------------------- */
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

/** Extract Turnstile token from any of the common fields */
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

  /* ---- Turnstile: presence check ONLY, V1 will verify ---- */
  const tokenTs = readTurnstileToken(body);
  if (!tokenTs) {
    return NextResponse.json(
      { success: false, message: "Missing Turnstile token" },
      { status: 400 }
    );
  }

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

    // 🔑 Forward the Turnstile token so V1 can verify it
    "cf-turnstile-response": tokenTs,
    captchaToken: tokenTs,
    turnstileToken: tokenTs,
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
