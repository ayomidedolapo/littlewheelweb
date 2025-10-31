// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

/** ===== Upstream API Base ===== */
const BASE_V1 =
  (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_V1 || "https://dev-api.insider.littlewheel.app/v1")
    .replace(/\/+$/, ""); // strip trailing slash

/** ===== Turnstile config ===== */
const TURNSTILE_SECRET = (process.env.TURNSTILE_SECRET_KEY || "").trim();
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Allow missing Turnstile token in dev if true */
const ALLOW_DEV_WITHOUT_TURNSTILE =
  (process.env.ALLOW_TURNSTILELESS_DEV || "").toLowerCase() === "true";

/* ---------- utility helpers ---------- */
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
    const body = new URLSearchParams({
      secret: TURNSTILE_SECRET,
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    });

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
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

  console.log("=== /api/auth/login DEBUG BEGIN ===");
  console.log("env:", {
    NODE_ENV: process.env.NODE_ENV,
    ALLOW_TURNSTILELESS_DEV: ALLOW_DEV_WITHOUT_TURNSTILE,
    TURNSTILE_SECRET_present: !!TURNSTILE_SECRET,
    BASE_V1,
  });

  try {
    const body = await req.json().catch(() => ({} as any));
    const { phoneNumber, password, deviceToken } = body || {};
    const tsToken = readTurnstileToken(body);
    const ip = readClientIp(req);

    console.log("incoming:", {
      phoneNumber_masked: maskPhone(phoneNumber),
      password_len: password ? String(password).length : 0,
      deviceToken_len: deviceToken ? String(deviceToken).length : 0,
      hasTurnstileToken: !!tsToken,
      clientIp: ip || "(none)",
    });

    /** Turnstile verification */
    if (!tsToken) {
      if (isProd || !ALLOW_DEV_WITHOUT_TURNSTILE) {
        console.warn("[login] Missing Turnstile token → rejecting");
        console.log("=== /api/auth/login DEBUG END ===");
        return NextResponse.json(
          { success: false, message: "Missing Turnstile token" },
          { status: 400 }
        );
      } else {
        console.warn("[login] Skipping Turnstile in dev mode");
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
      }
    }

    /** Upstream login */
    const url = `${BASE_V1}/auth/login`;
    console.log("upstream:", { url });

    // Short timeout + detailed error logging
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);

    let r: Response;
    try {
      r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, password, deviceToken }),
        cache: "no-store",
        signal: ctrl.signal,
      });
    } catch (e: any) {
      clearTimeout(t);
      console.error("fetch to upstream failed:", {
        name: e?.name,
        message: e?.message,
        code: e?.code,
        cause: e?.cause,
        errno: e?.errno,
        type: e?.type,
      });
      console.log("=== /api/auth/login DEBUG END ===");
      return NextResponse.json(
        {
          success: false,
          message: "Upstream connection failed",
          details: e?.message || "fetch failed",
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(t);
    }

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

    const isHttps =
      req.headers.get("x-forwarded-proto") === "https" ||
      req.nextUrl.protocol === "https:" ||
      process.env.NODE_ENV === "production";

    const maxAge = 60 * 60 * 24 * 7;
    const cookieBase = [
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      isHttps ? "Secure" : "",
      `Max-Age=${maxAge}`,
    ]
      .filter(Boolean)
      .join("; ");

    const cookies = [
      `lw_auth=${encodeURIComponent(token)}; ${cookieBase}`,
      `lw_token=${encodeURIComponent(token)}; ${cookieBase}`,
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
        token,
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
