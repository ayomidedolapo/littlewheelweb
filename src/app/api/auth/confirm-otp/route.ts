// app/api/auth/confirm-otp/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ROOT = (process.env.NEXT_PUBLIC_SWAGGER_API_BASE_URL || "").replace(/\/+$/, "");
const V1 = (process.env.BACKEND_API_URL_V1 || `${ROOT}/v1`).replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

// Log upstream in non-prod only
const DEBUG = process.env.NODE_ENV !== "production";

function jsonSafe(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { message: text };
  }
}

export async function POST(req: Request) {
  // 1) Parse incoming
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const otp = (body?.otp ?? "").toString().trim();
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

  // 2) Read Bearer token from cookies
  const store = cookies();
  const token =
    store.get("token")?.value ||
    store.get("lw_token")?.value ||
    undefined;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "token required (missing cookie). Please restart signup.",
      },
      { status: 401 }
    );
  }

  // 3) Build upstream request
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (captchaToken) headers["X-Recaptcha-Token"] = captchaToken;

  const upstreamBody: any = { otp };
  if (captchaToken) {
    // keep aliases; harmless if backend ignores them
    upstreamBody.captchaToken = captchaToken;
    upstreamBody.recaptchaToken = captchaToken;
    upstreamBody.reCaptchaToken = captchaToken;
  }

  const url = `${V1}/auth/confirm-otp`;

  // 4) Timeout/hard-fail logic
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(upstreamBody),
      cache: "no-store",
      signal: ac.signal,
    }).catch((err) => {
      if (DEBUG) console.error("confirm-otp upstream fetch failed:", err);
      throw new Error("Upstream fetch error");
    });

    const text = await r.text();
    const data = jsonSafe(text);

    if (DEBUG) {
      console.log("confirm-otp upstream:", {
        url,
        status: r.status,
        ok: r.ok,
        bodyPreview: text?.slice(0, 500),
      });
    }

    if (!r.ok) {
      const message =
        (data && (data as any).message) ||
        (data && (data as any).error) ||
        text ||
        `Upstream ${r.status} ${r.statusText}`;

      return NextResponse.json(
        { success: false, message, upstream: data ?? text ?? null },
        { status: r.status }
      );
    }

    // 5) If upstream returns a refreshed token, set it back in cookie (HttpOnly)
    const newToken =
      (data as any)?.token ??
      (data as any)?.data?.token ??
      (data as any)?.data?.accessToken ??
      null;

    const res = NextResponse.json({
      success: true,
      data,
      token: newToken ?? token, // keep for compatibility if client reads it
    });

    if (newToken) {
      const cookieOpts = {
        path: "/",
        sameSite: "lax" as const,
        httpOnly: true, // hardened
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
      };
      res.cookies.set("token", newToken, cookieOpts);
      res.cookies.set("lw_token", newToken, cookieOpts);
    }

    return res;
  } catch (e: any) {
    const aborted = e?.name === "AbortError";
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Proxy error",
      },
      { status: aborted ? 504 : 500 }
    );
  } finally {
    clearTimeout(timer);
  }
}
