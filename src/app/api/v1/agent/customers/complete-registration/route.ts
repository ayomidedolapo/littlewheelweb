// app/api/v1/agent/customers/complete-registration/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

/**
 * BACKEND_API_URL should already include the API version ONCE, e.g.:
 *   https://dev-api.insider.littlewheel.app/v1
 */
const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const COMPLETE_PATH =
  process.env.BACKEND_COMPLETE_REGISTRATION_PATH ||
  "/agent/customers/complete-registration";

// Next 13/14 & 15-safe accessors
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
  const token = await getBearer(req);

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    // keep {} – upstream will validate
  }

  const upstreamUrl = `${API_BASE}${COMPLETE_PATH}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? { Authorization: `Bearer ${token}`, "x-lw-auth": token }
          : {}),
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await upstream.text();
    try {
      const json = text ? JSON.parse(text) : {};
      return NextResponse.json(json, { status: upstream.status });
    } catch {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        code: "UPSTREAM_UNREACHABLE",
        message:
          "Could not reach the registration service. Please try again shortly.",
        error: err?.message || "Unknown upstream connection error",
      },
      { status: 502 }
    );
  }
}
