// app/api/v1/agent/customers/[id]/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

/**
 * ENV NOTE
 * If BACKEND_API_URL already ends with /v1, set BACKEND_CUSTOMERS_PATH=/agent/customers
 * Else set BACKEND_CUSTOMERS_PATH=/v1/agent/customers
 */
const API_BASE = process.env.BACKEND_API_URL!;
const CUSTOMERS_PATH =
  process.env.BACKEND_CUSTOMERS_PATH ?? "/v1/agent/customers";

function join(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

// Next 13/14 & 15 compatible accessors
async function getCookieStore() {
  const maybe = (cookiesFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}
async function getHeadersStore() {
  const maybe = (headersFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

async function getBearer() {
  const jar = await getCookieStore();
  const hdrs = await getHeadersStore();

  const cookieTok =
    jar?.get?.("lw_auth")?.value ||
    jar?.get?.("lw_token")?.value ||
    jar?.get?.("authToken")?.value ||
    jar?.get?.("token")?.value ||
    jar?.get?.("session")?.value ||
    "";

  const forwarded = (hdrs.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  const x = (hdrs.get("x-lw-auth") || "").replace(/^Bearer\s+/i, "").trim();

  return cookieTok || forwarded || x || "";
}

async function buildAuthHeaders() {
  const bearer = await getBearer();
  const h: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (bearer) h.Authorization = `Bearer ${bearer}`;
  return h;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.text(); // pass-through body
    const url = join(
      API_BASE,
      join(CUSTOMERS_PATH, `${encodeURIComponent(params.id)}/update`)
    );

    const r = await fetch(url, {
      method: "PATCH",
      headers: await buildAuthHeaders(),
      body,
      cache: "no-store",
    });

    const txt = await r.text();
    let json: any;
    try {
      json = JSON.parse(txt || "{}");
    } catch {
      json = { message: txt };
    }

    return NextResponse.json(json, { status: r.status });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "Proxy error" },
      { status: 500 }
    );
  }
}
