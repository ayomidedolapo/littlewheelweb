// app/api/auth/resend-otp/route.ts
import { NextResponse } from "next/server";

const V2 = (process.env.BACKEND_API_URL_V2 || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

const normPhone = (p?: string) => {
  if (!p) return "";
  const d = p.replace(/\D/g, "");
  return p.startsWith("+") ? p : d ? `+${d}` : "";
};
const normEmail = (e?: string) => (e || "").trim().toLowerCase();

export async function POST(req: Request) {
  if (!V2) {
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL_V2 env" },
      { status: 500 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const sessionId = body?.sessionId || req.headers.get("x-session-id") || "";
  const phoneNumber = normPhone(body?.phoneNumber);
  const email = normEmail(body?.email);

  if (!sessionId || (!phoneNumber && !email)) {
    return NextResponse.json(
      {
        success: false,
        message:
          "sessionId and at least one of phoneNumber or email are required to resend OTP (v2 flow).",
      },
      { status: 400 }
    );
  }

  // Build payload: resend just (phone/email) without any OTP digits
  const upstreamPayload: Record<string, any> = {
    step: 1,
    sessionId,
    ...(phoneNumber ? { phoneNumber } : {}),
    ...(email ? { email } : {}),
  };

  // FORCE CHANNEL based on what we’re resending OR explicit body.otpChannel
  const otpChannel = (
    body?.otpChannel || (email ? "email" : "sms")
  ).toLowerCase();
  upstreamPayload.channel = otpChannel === "email" ? "EMAIL" : "SMS";

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(`${V2}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-session-id": sessionId,
        "x-otp-channel": otpChannel, // header hint
      },
      body: JSON.stringify(upstreamPayload),
      cache: "no-store",
      signal: ac.signal,
    });

    const text = await r.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text || r.statusText };
    }

    const newSession = data?.sessionId || data?.data?.sessionId || null;

    const resp = NextResponse.json(
      {
        success: r.ok && data?.success !== false,
        message:
          data?.message ||
          data?.data?.message ||
          (r.ok ? "OTP resent successfully." : "Resend failed."),
        sessionId: newSession || sessionId,
        data,
      },
      { status: r.status }
    );

    if (newSession) {
      const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
      resp.headers.set(
        "Set-Cookie",
        `lw_signup_session=${encodeURIComponent(
          newSession
        )}; Path=/; ${secure}HttpOnly; SameSite=Lax; Max-Age=1800`
      );
    }

    return resp;
  } catch (e: any) {
    const aborted = e?.name === "AbortError";
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
