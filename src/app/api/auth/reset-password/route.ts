// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const RESET_PATH =
  process.env.BACKEND_RESET_PASSWORD_PATH || "/auth/reset-password";

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // extract new 5-digit password
  const rawPassword =
    body.password ?? body.newPassword ?? body.pin ?? body.code ?? "";

  const password = String(rawPassword).replace(/\D/g, "").slice(0, 5);

  if (!/^\d{5}$/.test(password)) {
    return NextResponse.json(
      {
        success: false,
        message: "Password must be exactly 5 digits.",
      },
      { status: 400 }
    );
  }

  const upstreamUrl = `${API_BASE}${RESET_PATH}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ password }),
      cache: "no-store",
    });

    const text = await upstream.text();
    let json: any = {};
    try {
      json = JSON.parse(text || "{}");
    } catch {}

    if (!upstream.ok || json?.success === false) {
      return NextResponse.json(
        {
          success: false,
          status: upstream.status,
          message:
            json?.message ||
            json?.error ||
            `Failed to reset password (HTTP ${upstream.status})`,
        },
        { status: upstream.status }
      );
    }

    // return upstream (with new token)
    return NextResponse.json(json, { status: upstream.status });
  } catch (error) {
    console.warn("Reset password upstream error:", error);
    return NextResponse.json(
      {
        success: false,
        status: 500,
        message: "Unable to reach reset-password service.",
      },
      { status: 500 }
    );
  }
}
