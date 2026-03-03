// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

/** ===== Upstream API Base ===== */
const BASE_V1 =
  (process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_V1 ||
    "https://dev-api.insider.littlewheel.app/v1"
  ).replace(/\/+$/, "");

/** ===== reCAPTCHA config ===== */
const RECAPTCHA_SECRET = (process.env.RECAPTCHA_SECRET_KEY || "").trim();
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const ALLOW_DEV_WITHOUT_CAPTCHA =
  (process.env.ALLOW_TURNSTILELESS_DEV || "").toLowerCase() === "true";

/* ---------- utility helpers ---------- */
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

/** Read captcha token from body (support multiple possible field names) */
function readCaptchaToken(body: any) {
  return (
    String(
      body?.recaptchaToken || body?.captchaToken || body?.token || ""
    ).trim() || ""
  );
}

async function verifyRecaptcha(token: string, ip?: string) {
  if (!RECAPTCHA_SECRET) {
    return { ok: false as const, reason: "Missing RECAPTCHA_SECRET_KEY env" };
  }

  try {
    const params = new URLSearchParams({
      secret: RECAPTCHA_SECRET,
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    });

    const res = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const json = await res.json().catch(() => ({}));
    if (json?.success) return { ok: true as const, data: json };

    return {
      ok: false as const,
      data: json,
      reason: Array.isArray(json?.["error-codes"])
        ? json["error-codes"].join(",")
        : "recaptcha-failed",
    };
  } catch (e: any) {
    return { ok: false as const, reason: e?.message || "recaptcha-error" };
  }
}

export async function POST(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";

  try {
    const body = await req.json().catch(() => ({} as any));

    // ✅ accept either email or phoneNumber
    const email = (body?.email || "").trim().toLowerCase();
    const phoneNumber = (body?.phoneNumber || "").trim();
    const password = body?.password;
    const deviceToken = body?.deviceToken;

    const captchaToken = readCaptchaToken(body);
    const ip = readClientIp(req);

    if (!password || !deviceToken || (!email && !phoneNumber)) {
      return NextResponse.json(
        { success: false, message: "Missing login credentials" },
        { status: 400 }
      );
    }

    /** reCAPTCHA verification */
    if (!captchaToken) {
      if (isProd || !ALLOW_DEV_WITHOUT_CAPTCHA) {
        return NextResponse.json(
          { success: false, message: "Missing reCAPTCHA token" },
          { status: 400 }
        );
      }
    } else {
      const verdict = await verifyRecaptcha(captchaToken, ip);
      if (!verdict.ok) {
        return NextResponse.json(
          {
            success: false,
            message: "reCAPTCHA verification failed",
            details: verdict.data ?? verdict.reason ?? "unknown",
          },
          { status: 403 }
        );
      }
    }

    /** Upstream login (REST) */
    const url = `${BASE_V1}/auth/login`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);

    let r: Response;
    try {
      // ✅ forward both email + phoneNumber so backend can accept either
      const upstreamPayload: any = {
        password,
        deviceToken,
        ...(email ? { email } : {}),
        ...(phoneNumber ? { phoneNumber } : {}),
      };

      r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(upstreamPayload),
        cache: "no-store",
        signal: ctrl.signal,
      });
    } catch (e: any) {
      clearTimeout(t);
      return NextResponse.json(
        {
          success: false,
          message: "Network error contacting auth server",
          details: e?.message || "fetch failed",
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(t);
    }

    const text = await r.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { upstream: text };
    }

    if (!r.ok) {
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

    if (!token) {
      return NextResponse.json(
        { success: false, message: "No token returned from backend" },
        { status: 502 }
      );
    }

    // Return token (persist route will set cookies)
    return NextResponse.json(
      {
        success: true,
        token,
        user: data?.user || data?.data?.user || null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "Login failed" },
      { status: 500 }
    );
  }
}