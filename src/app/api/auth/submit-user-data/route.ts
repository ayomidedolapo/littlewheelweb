// app/api/auth/submit-user-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const clean = (s = "") => s.replace(/\/+$/, "");
const V1 = clean(process.env.BACKEND_API_URL || "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

/* ---------- Turnstile config ---------- */
const TURNSTILE_SECRET = (process.env.TURNSTILE_SECRET_KEY || "").trim();
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

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
          crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
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
/* ---------- /Turnstile config ---------- */

async function readCookie(name: string) {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(name)?.value || "";
  } catch {
    return "";
  }
}

async function readBearer(req: NextRequest) {
  const header = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const altHdr = (req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const cookieTok =
    (await readCookie("lw_token")) || (await readCookie("token"));
  return header || altHdr || cookieTok || "";
}

function jsonSafe(text: string) {
  try {
    return JSON.parse(text || "{}");
  } catch {
    return { message: text };
  }
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

  /* 🔐 Enforce Turnstile for this step (recommended)
     If you prefer OPTIONAL enforcement:
       - Only verify when a token is present, otherwise skip.
       - Replace the 'if (!token) return 400' with 'if (!token) { /* skip *\/ }'
  */
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
  // (Optional hardening) If you set action="signup_details" on the client:
  // const { action, hostname } = verdict.data || {};
  // if (action !== "signup_details") return NextResponse.json({ success:false, message:"Bad action" }, { status: 403 });
  // if (hostname !== "littlewheel.app") return NextResponse.json({ success:false, message:"Bad hostname" }, { status: 403 });

  const bearer = await readBearer(req);
  const sessionId =
    body?.sessionId ||
    req.headers.get("x-session-id") ||
    (await readCookie("lw_signup_session")) ||
    "";

  console.log("Token sources check:", {
    authHeader: req.headers.get("authorization")
      ? `Bearer [${
          req.headers.get("authorization")!.replace(/^Bearer\s+/i, "").length
        } chars]`
      : "MISSING",
    xLwAuthHeader: req.headers.get("x-lw-auth")
      ? `[${req.headers.get("x-lw-auth")!.length} chars]`
      : "MISSING",
    cookieToken: (await readCookie("lw_token"))
      ? `[${(await readCookie("lw_token")).length} chars]`
      : "MISSING",
    finalBearer: bearer ? `[${bearer.length} chars]` : "MISSING",
    sessionId: sessionId || "MISSING",
    V1: V1,
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
          cookieToken: !!(await readCookie("lw_token")),
          sessionId: !!sessionId,
        },
      },
      { status: 401 }
    );
  }

  // Use the exact V1 endpoint from your Swagger: /v1/auth/submit-user-data
  const url = `${V1}/auth/submit-user-data`;

  // Prepare payload exactly matching your V1 Swagger schema
  const payload = {
    firstName: body.firstName,
    lastName: body.lastName,
    middleName: body.middleName,
    dob: body.dob,
    ...(body.avatarUrl ? { avatarUrl: body.avatarUrl } : {}),
    ...(body.referralCode ? { referralCode: body.referralCode } : {}),
    password: body.password || body.pin,
    gender: body.gender,
    username: body.username,
  };

  console.log("=== TOKEN DEBUG ===");
  console.log("Bearer token first 50 chars:", bearer.substring(0, 50) + "...");
  console.log(
    "Bearer token last 20 chars:",
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
    payload: {
      ...payload,
      password: "[REDACTED]",
    },
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
        data: data,
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
