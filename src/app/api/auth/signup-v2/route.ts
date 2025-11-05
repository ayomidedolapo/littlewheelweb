// app/api/auth/signup-v2/route.ts
import { NextResponse } from "next/server";

/* ========== small helpers ========== */
const trimTrailingSlash = (s: string) => (s || "").replace(/\/+$/, "");
const joinUrl = (base: string, path: string) =>
  `${trimTrailingSlash(base)}/${String(path || "").replace(/^\/+/, "")}`;
const readHeaderSessionId = (h: Headers) =>
  h.get("x-session-id") || h.get("x-lw-session-id") || "";

/** Extract first client IP from common proxy headers */
function readClientIp(req: Request) {
  const h = req.headers;
  const cf = h.get("CF-Connecting-IP");
  if (cf) return cf;
  const xff = h.get("X-Forwarded-For") || h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xr = h.get("x-real-ip");
  if (xr) return xr;
  return "";
}

function setSessionCookie(res: NextResponse, sessionId: string) {
  if (!sessionId) return;
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("lw_signup_session", sessionId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure,
    maxAge: 60 * 60 * 24,
  });
}

function setTokenCookie(res: NextResponse, token: string) {
  if (!token) return;
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("lw_token", token, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure,
    maxAge: 60 * 60 * 24,
  });
}

/** Always normalize to +234XXXXXXXXXX */
const toE164Plus234 = (raw?: string) => {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("234")) return `+${d}`;
  if (d.startsWith("0")) return `+234${d.slice(1)}`;
  return `+234${d}`;
};

/* ========== config ========== */
const V2 = trimTrailingSlash(process.env.BACKEND_API_URL_V2 || "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

/* ========== Turnstile ========== */
const TURNSTILE_SECRET = (process.env.TURNSTILE_SECRET_KEY || "").trim();
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Optional dev bypass (never used in production) */
const ALLOW_TURNSTILELESS_DEV =
  (process.env.ALLOW_TURNSTILELESS_DEV || "").toLowerCase() === "true";

/** Read token from body or headers */
function readTurnstileToken(req: Request, body: any) {
  const hdr =
    req.headers.get("cf-turnstile-response") ||
    req.headers.get("x-turnstile-token") ||
    "";
  const inBody =
    String(
      body?.captchaToken ||
        body?.turnstileToken ||
        body?.token ||
        body?.["cf-turnstile-response"] ||
        ""
    ).trim() || "";
  return (hdr || "").trim() || inBody;
}

/** Verify Turnstile token server-side */
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
          (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
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

/* ========== handler ========== */
export async function POST(req: Request) {
  console.log("=== /api/auth/signup-v2 DEBUG BEGIN ===");
  console.log("env:", {
    NODE_ENV: process.env.NODE_ENV,
    ALLOW_TURNSTILELESS_DEV: ALLOW_TURNSTILELESS_DEV,
    TURNSTILE_SECRET_present: !!TURNSTILE_SECRET,
    TURNSTILE_SECRET_len: TURNSTILE_SECRET.length || 0,
    BASE_V2: V2 || "MISSING",
  });

  if (!V2) {
    console.log("[signup] Missing BACKEND_API_URL_V2");
    console.log("=== /api/auth/signup-v2 DEBUG END ===");
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL_V2 env" },
      { status: 500 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    console.log("[signup] Invalid JSON body");
    console.log("=== /api/auth/signup-v2 DEBUG END ===");
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const step = Number(body?.step);
  if (![1, 2, 3, 4, 5].includes(step)) {
    console.log("[signup] Invalid step:", step);
    console.log("=== /api/auth/signup-v2 DEBUG END ===");
    return NextResponse.json(
      { success: false, message: "Invalid or missing step (1..5 required)" },
      { status: 400 }
    );
  }

  const ip = readClientIp(req);
  const pnMasked = (body?.phoneNumber || "")
    .toString()
    .replace(/(\+?234)(\d{0,6})\d+/, "$1$2***");
  console.log("incoming:", {
    step,
    phone_masked: pnMasked || undefined,
    hasEmail: !!body?.email,
    hasPhoneOtp: !!body?.phoneOtp,
    hasEmailOtp: !!body?.emailOtp,
    sessionId_len: (body?.sessionId || "").toString().length || 0,
    clientIp: ip || "unknown",
  });

  /* ---- Turnstile enforcement ---- */
  const isProd = process.env.NODE_ENV === "production";
  const shouldEnforce = [1, 2].includes(step) || false;

  if (shouldEnforce) {
    const tsToken = readTurnstileToken(req, body);
    const allowDevBypass = !isProd && ALLOW_TURNSTILELESS_DEV;

    if (!tsToken) {
      if (allowDevBypass) {
        console.warn(
          "[signup] Turnstile token missing — allowed in dev (set ALLOW_TURNSTILELESS_DEV=false to enforce)"
        );
      } else {
        console.log("[signup] Missing Turnstile token → rejecting");
        console.log("=== /api/auth/signup-v2 DEBUG END ===");
        return NextResponse.json(
          { success: false, message: "Missing Turnstile token" },
          { status: 400 }
        );
      }
    } else {
      const verdict = await verifyTurnstile(tsToken, ip);
      if (!verdict.ok) {
        console.log(
          "[signup] Turnstile failed:",
          verdict.reason,
          verdict.data || ""
        );
        console.log("=== /api/auth/signup-v2 DEBUG END ===");
        return NextResponse.json(
          {
            success: false,
            message: "Turnstile verification failed",
            details: verdict.data ?? verdict.reason ?? "unknown",
          },
          { status: 403 }
        );
      } else {
        const { data } = verdict;
        console.log("[signup] Turnstile OK:", {
          action: data?.action,
          cdata: data?.cdata ? "[present]" : undefined,
          hostname: data?.hostname,
          challenge_ts: data?.challenge_ts,
        });
      }
    }
  }

  const incomingSession =
    String(body?.sessionId || "").trim() ||
    req.headers.get("x-session-id") ||
    "";

  const payload: any = { step };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (incomingSession) {
    payload.sessionId = incomingSession;
    headers["x-session-id"] = incomingSession;
  }

  switch (step) {
    case 1: {
      const pn = toE164Plus234(body?.phoneNumber);
      if (!pn) {
        console.log("[signup] step 1 missing phoneNumber");
        console.log("=== /api/auth/signup-v2 DEBUG END ===");
        return NextResponse.json(
          { success: false, message: "phoneNumber required for step 1" },
          { status: 400 }
        );
      }
      payload.phoneNumber = pn;
      break;
    }
    case 2: {
      const code = String(body?.phoneOtp || "");
      if (!code) {
        console.log("[signup] step 2 missing phoneOtp");
        console.log("=== /api/auth/signup-v2 DEBUG END ===");
        return NextResponse.json(
          { success: false, message: "phoneOtp required for step 2" },
          { status: 400 }
        );
      }
      payload.phoneOtp = code;
      break;
    }
    case 3: {
      const em = String(body?.email || "").trim().toLowerCase();
      if (!em) {
        console.log("[signup] step 3 missing email");
        console.log("=== /api/auth/signup-v2 DEBUG END ===");
        return NextResponse.json(
          { success: false, message: "email required for step 3" },
          { status: 400 }
        );
      }
      payload.email = em;
      break;
    }
    case 4: {
      const code = String(body?.emailOtp || "");
      if (!code) {
        console.log("[signup] step 4 missing emailOtp");
        console.log("=== /api/auth/signup-v2 DEBUG END ===");
        return NextResponse.json(
          { success: false, message: "emailOtp required for step 4" },
          { status: 400 }
        );
      }
      payload.emailOtp = code;
      break;
    }
    case 5: {
      const pn = toE164Plus234(body?.phoneNumber);
      const em = String(body?.email || "").trim().toLowerCase();
      if (!pn || !em) {
        console.log("[signup] step 5 missing phone/email");
        console.log("=== /api/auth/signup-v2 DEBUG END ===");
        return NextResponse.json(
          {
            success: false,
            message: "phoneNumber and email required for step 5",
          },
          { status: 400 }
        );
      }
      payload.phoneNumber = pn;
      payload.email = em;
      payload.role = String(body?.role || "AGENT");
      payload.mode = String(body?.mode || "SELF_CREATED");
      if (body?.deviceToken) payload.deviceToken = String(body.deviceToken);
      break;
    }
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);
  const url = joinUrl(V2, "/auth/signup");

  try {
    console.log("[signup] → upstream POST", {
      url,
      step,
      hasSession: !!incomingSession,
    });

    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: ac.signal,
    });

    const raw = await upstream.text();
    let data: any;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { message: raw || upstream.statusText };
    }

    // Try to find sessionId and token from upstream
    const headerSession = readHeaderSessionId(upstream.headers);
    const bodySession = data?.sessionId || data?.data?.sessionId || null;
    const finalSession = bodySession || headerSession || incomingSession || "";

    // Look for token in common places (body or nested)
    const bodyToken =
      data?.token ||
      data?.accessToken ||
      data?.data?.token ||
      data?.data?.accessToken ||
      data?.result?.token ||
      data?.result?.accessToken ||
      "";

    console.log("[signup] upstream status:", upstream.status, upstream.statusText, {
      headerSession_len: (headerSession || "").length || 0,
      bodySession_len: (bodySession || "").length || 0,
      finalSession_len: finalSession.length || 0,
      hasBodyToken: !!bodyToken,
    });

    // Build response mirroring upstream but include normalized sessionId and (optionally) token
    const resp = NextResponse.json(
      {
        ...data,
        sessionId: finalSession || undefined,
        // Expose token for clients that prefer localStorage; harmless if empty
        token: bodyToken || undefined,
      },
      { status: upstream.status }
    );

    // Forward any upstream Set-Cookie headers (if backend already sets auth cookies)
    const anyHeaders = upstream.headers as any;
    const setCookies =
      anyHeaders.getSetCookie?.() ||
      anyHeaders.raw?.()?.["set-cookie"] ||
      (upstream.headers.get("set-cookie")
        ? [upstream.headers.get("set-cookie")]
        : []);
    (setCookies || [])
      .filter(Boolean)
      .forEach((c: string) => resp.headers.append("set-cookie", c));

    // Always persist the session cookie for the flow
    if (finalSession) setSessionCookie(resp, finalSession);

    // If backend returned a token in JSON, persist as HttpOnly cookie for later steps
    if (bodyToken) setTokenCookie(resp, bodyToken);

    console.log("=== /api/auth/signup-v2 DEBUG END ===");
    return resp;
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    console.error("[signup] upstream error:", e);
    console.log("=== /api/auth/signup-v2 DEBUG END ===");
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
