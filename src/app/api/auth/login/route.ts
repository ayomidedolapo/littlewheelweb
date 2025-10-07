// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

const BASE_V1 =
  process.env.BACKEND_API_URL || "https://dev-api.insider.littlewheel.app/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const url = `${BASE_V1.replace(/\/$/, "")}/auth/login`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

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

    // Extract common token shapes
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

    return new NextResponse(
      JSON.stringify({
        success: true,
        token, // optional to return; client doesn't need to store it
        user: data?.user || data?.data?.user || null,
      }),
      { status: 200, headers }
    );
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "Login failed" },
      { status: 500 }
    );
  }
}
