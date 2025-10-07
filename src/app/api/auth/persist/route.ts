// app/api/auth/persist/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({} as any));
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Missing token" },
      { status: 400 }
    );
  }

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

  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    `lw_auth=${encodeURIComponent(token)}; ${cookieBase}`
  );
  headers.append(
    "Set-Cookie",
    `lw_token=${encodeURIComponent(token)}; ${cookieBase}`
  ); // legacy alias

  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
}
