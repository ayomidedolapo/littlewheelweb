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

    // Try common token shapes
    const token =
      data?.token ||
      data?.access_token ||
      data?.data?.token ||
      data?.data?.access_token ||
      data?.jwt ||
      null;

    // Cookie flags: allow local dev (no Secure on http://localhost)
    const isHttps =
      req.headers.get("x-forwarded-proto") === "https" ||
      req.nextUrl.protocol === "https:";

    const cookieParts = [
      `lw_token=${token ?? ""}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      token ? "" : "Max-Age=0", // clear if no token
      isHttps ? "Secure" : "",
    ].filter(Boolean);

    const headers: Record<string, string> = {};
    // Set cookie only if we have (or want to clear) a token key
    headers["Set-Cookie"] = cookieParts.join("; ");

    return NextResponse.json(
      { success: true, token, user: data?.user || data?.data?.user || null },
      { status: 200, headers }
    );
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "Login failed" },
      { status: 500 }
    );
  }
}
