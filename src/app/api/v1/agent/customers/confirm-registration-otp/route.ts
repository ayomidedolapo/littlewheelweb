// app/api/v1/agent/customers/confirm-registration-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");

// 13/14/15-safe helpers
async function getCookieStore() {
  const maybe = (cookiesFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}
async function getHeadersStore() {
  const maybe = (headersFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}
async function getBearer(req: NextRequest) {
  const jar = await getCookieStore();
  const hdrs = await getHeadersStore();

  const cookieTok =
    jar?.get?.("lw_token")?.value ||
    jar?.get?.("authToken")?.value ||
    jar?.get?.("token")?.value ||
    jar?.get?.("session")?.value ||
    "";

  const auth = (
    hdrs.get("authorization") ||
    req.headers.get("authorization") ||
    ""
  )
    .replace(/^Bearer\s+/i, "")
    .trim();

  const x = (hdrs.get("x-lw-auth") || req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  return cookieTok || auth || x || "";
}

export async function POST(req: NextRequest) {
  const bearer = await getBearer(req);
  if (!bearer) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const { otp, token, registrationToken } = body || {};
  if (!otp || !(token || registrationToken)) {
    return NextResponse.json(
      { success: false, message: "otp and token are required" },
      { status: 400 }
    );
  }

  // Send both keys for compatibility; backend can ignore extras
  const payload = {
    otp,
    token: token || registrationToken,
    registrationToken: registrationToken || token,
  };

  const url = `${API_BASE}/agent/customers/confirm-registration-otp`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "x-lw-auth": bearer,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await r.text();
  try {
    return NextResponse.json(JSON.parse(text || "{}"), { status: r.status });
  } catch {
    return new NextResponse(text, {
      status: r.status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
