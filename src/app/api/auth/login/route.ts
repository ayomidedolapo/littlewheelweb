// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

/** ===== Upstream (unchanged) ===== */
const BASE_V1 =
  process.env.BACKEND_API_URL || "https://dev-api.insider.littlewheel.app/v1";

/** ===== Turnstile config ===== */
const TURNSTILE_SECRET = (process.env.TURNSTILE_SECRET_KEY || "").trim();
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Optional: set to "true" to allow missing token in dev */
const ALLOW_DEV_WITHOUT_TURNSTILE =
  (process.env.ALLOW_TURNSTILELESS_DEV || "").toLowerCase() === "true";

/* ---------- debug helpers (safe) ---------- */
function safeStrLen(s?: string | null) {
  return s ? `[len:${String(s).length}]` : "[len:0]";
}
function maskPhone(e164?: string) {
  if (!e164) return "";
  const d = String(e164);
  return d.length <= 6 ? "***" : d.slice(0, 3) + "***" + d.slice(-4);
}
function preview(text: string, n = 200) {
  const t = text ?? "";
  return t.length > n ? t.slice(0, n) + "…(trunc)" : t;
}

function readClientIp(req: NextRequest) {
  const cf = req.headers.get("CF-Connecting-IP");
  if (cf) return cf;
  const xff = req.headers.get("x-forwarded-for") || "";
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

export async function POST(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";

  /* ----------- top-level env debug ----------- */
  console.log("=== /api/auth/login DEBUG BEGIN ===");
  console.log("env:", {
    NODE_ENV: process.env.NODE_ENV,
    ALLOW_TURNSTILELESS_DEV: ALLOW_DEV_WITHOUT_TURNSTILE,
    TURNSTILE_SECRET_present: TURNSTILE_SECRET ? true : false,
    TURNSTILE_SECRET_len: TURNSTILE_SECRET ? TURNSTILE_SECRET.length : 0,
    BASE_V1: BASE_V1,
  });

  try {
    const body = await req.json().catch(() => ({} as any));
    const { phoneNumber, password, deviceToken } = body || {};
    const tsToken = readTurnstileToken(body);
    const ip = readClientIp(req);

    /* ----------- request body debug (safe) ----------- */
    console.log("incoming:", {
      phoneNumber_masked: maskPhone(phoneNumber),
      password_len: password ? String(password).length : 0,
      deviceToken_len: deviceToken ? String(deviceToken).length : 0,
      hasTurnstileToken: !!tsToken,
      clientIp: ip || "(none)",
    });

    /** 🔐 Turnstile verification (lenient in dev) */
    if (!tsToken) {
      if (isProd || !ALLOW_DEV_WITHOUT_TURNSTILE) {
        console.warn("[login] Missing Turnstile token → rejecting");
        console.log("=== /api/auth/login DEBUG END ===");
        return NextResponse.json(
          { success: false, message: "Missing Turnstile token" },
          { status: 400 }
        );
      } else {
        console.warn(
          "[login] Turnstile token missing — allowed in dev (set ALLOW_TURNSTILELESS_DEV=false to enforce)"
        );
      }
    } else {
      const verdict = await verifyTurnstile(tsToken, ip);
      if (!verdict.ok) {
        console.warn("[login] Turnstile verify FAILED:", {
          reason: verdict.reason,
          data: verdict.data,
        });
        console.log("=== /api/auth/login DEBUG END ===");
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
        console.log("[login] Turnstile verify OK:", {
          action: data?.action,
          hostname: data?.hostname,
          cdata_present: !!data?.cdata,
          challenge_ts: data?.challenge_ts,
        });
        // (optional) harden on action/hostname here
      }
    }

    /** ===== upstream login request ===== */
    const url = `${BASE_V1.replace(/\/$/, "")}/auth/login`;
    console.log("upstream:", { url });

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Pass through only what the backend expects
      body: JSON.stringify({
        phoneNumber,
        password,
        deviceToken,
      }),
      cache: "no-store",
    });

    const text = await r.text();
    console.log("upstream response:", {
      status: r.status,
      statusText: r.statusText,
      text_preview: preview(text),
    });

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { upstream: text };
    }

    if (!r.ok) {
      console.log("upstream not ok → forwarding error");
      console.log("=== /api/auth/login DEBUG END ===");
      return NextResponse.json(
        { success: false, message: data?.message || data || "Login failed" },
        { status: r.status }
      );
    }

    // Extract common token shapes
    const token =
      data?.token ||
      data?.access_token ||
      data?.data?.token ||
      data?.data?.access_token ||
      data?.jwt ||
      null;

    console.log("token presence:", {
      hasToken: !!token,
      token_len: token ? String(token).length : 0,
    });

    if (!token) {
      console.log("no token returned from upstream");
      console.log("=== /api/auth/login DEBUG END ===");
      return NextResponse.json(
        { success: false, message: "No token returned from backend" },
        { status: 502 }
      );
    }

    // Cookie flags — support local dev over http
    const isHttps =
      req.headers.get("x-forwarded-proto") === "https" ||
      req.nextUrl.protocol === "https:" ||
      process.env.NODE_ENV === "production";

    const maxAge = 60 * 60 * 24 * 7; // 7 days
    const cookieBase = [
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      isHttps ? "Secure" : "",
      `Max-Age=${maxAge}`,
    ]
      .filter(Boolean)
      .join("; ");

    // Canonical cookie + legacy alias for backward-compat
    const cookies = [
      `lw_auth=${encodeURIComponent(token)}; ${cookieBase}`,
      `lw_token=${encodeURIComponent(token)}; ${cookieBase}`, // legacy alias
    ];

    const headers = new Headers();
    headers.append("Set-Cookie", cookies[0]);
    headers.append("Set-Cookie", cookies[1]);

    console.log("set-cookies:", {
      lw_auth_len: token.length,
      lw_token_len: token.length,
      secure: isHttps,
    });

    console.log("=== /api/auth/login DEBUG END ===");
    return new NextResponse(
      JSON.stringify({
        success: true,
        token, // optional to return; client doesn't need to store it
        user: data?.user || data?.data?.user || null,
      }),
      { status: 200, headers }
    );
  } catch (e: any) {
    console.error("route error:", e?.message || e);
    console.log("=== /api/auth/login DEBUG END ===");
    return NextResponse.json(
      { success: false, message: e?.message || "Login failed" },
      { status: 500 }
    );
  }
}
