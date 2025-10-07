// app/api/v1/agent/customers/set-address/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, ""); // includes /v1
const UPSTREAM_PATH =
  process.env.BACKEND_SET_ADDRESS_PATH || "/agent/customers/set-address";

function safeJoin(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

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
  try {
    const token = await getBearer(req);
    const body = await req.text(); // pass-through

    const url = safeJoin(API_BASE, UPSTREAM_PATH);
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token
          ? { Authorization: `Bearer ${token}`, "x-lw-auth": token }
          : {}),
      },
      body,
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
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "Proxy error" },
      { status: 500 }
    );
  }
}
