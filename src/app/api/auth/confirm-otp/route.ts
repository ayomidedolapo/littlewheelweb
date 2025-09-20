import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ROOT = (process.env.NEXT_PUBLIC_SWAGGER_API_BASE_URL || "").replace(
  /\/+$/,
  ""
);
const V1 = (process.env.BACKEND_API_URL_V1 || `${ROOT}/v1`).replace(/\/+$/, "");

// Optional: set to true to log upstream debug to server console
const DEBUG = process.env.NODE_ENV !== "production";

export async function POST(req: Request) {
  try {
    // 1) Read incoming payload (otp + optional captcha token)
    const body = await req.json().catch(() => ({} as any));
    const otp: string | undefined = body?.otp;
    const captchaToken: string | undefined =
      body?.captchaToken ||
      body?.recaptchaToken ||
      body?.reCaptchaToken ||
      body?.gRecaptchaToken;

    if (!otp) {
      return NextResponse.json(
        { success: false, message: "otp required" },
        { status: 400 }
      );
    }

    // 2) Read Bearer token from cookies (set during /api/auth/signup-v1)
    const store = cookies();
    const token =
      store.get("token")?.value || store.get("lw_token")?.value || undefined;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "token required (missing cookie). Please restart signup.",
        },
        { status: 401 }
      );
    }

    // 3) Build headers & body for upstream
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (captchaToken) headers["X-Recaptcha-Token"] = captchaToken;

    const upstreamBody: any = { otp };
    // send all common names so we match backend expectations
    if (captchaToken) {
      upstreamBody.captchaToken = captchaToken;
      upstreamBody.recaptchaToken = captchaToken;
      upstreamBody.reCaptchaToken = captchaToken;
    }

    // 4) Call upstream
    const r = await fetch(`${V1}/auth/confirm-otp`, {
      method: "POST",
      headers,
      body: JSON.stringify(upstreamBody),
    }).catch((err) => {
      if (DEBUG) console.error("confirm-otp upstream fetch failed:", err);
      throw new Error("Upstream fetch error");
    });

    const text = await r.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      // keep raw text in debug (some backends return plain text on errors)
      if (DEBUG) console.warn("confirm-otp upstream non-JSON body:", text);
    }

    if (!r.ok) {
      const message =
        data?.message ||
        data?.error ||
        text ||
        `Upstream ${r.status} ${r.statusText}`;

      // Propagate upstream status (so you see 401/403/422 instead of generic 500)
      return NextResponse.json(
        { success: false, message, upstream: data ?? text ?? null },
        { status: r.status }
      );
    }

    // 5) If upstream returns a refreshed token, set it back in cookie
    const newToken =
      data?.token ?? data?.data?.token ?? data?.data?.accessToken ?? null;

    const res = NextResponse.json({
      success: true,
      data,
      token: newToken ?? token,
    });

    if (newToken) {
      const cookieOpts = {
        path: "/",
        sameSite: "lax" as const,
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
      };
      res.cookies.set("token", newToken, cookieOpts);
      res.cookies.set("lw_token", newToken, cookieOpts);
    }

    return res;
  } catch (e: any) {
    // Only hit when our proxy fails before getting upstream
    return NextResponse.json(
      { success: false, message: e?.message || "Proxy error" },
      { status: 500 }
    );
  }
}
