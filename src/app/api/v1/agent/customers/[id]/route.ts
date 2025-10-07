// app/api/v1/agent/customers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

// BACKEND_API_URL already includes /v1 in your env
const BASE_V1 =
  process.env.BACKEND_API_URL?.replace(/\/+$/, "") ||
  "https://dev-api.insider.littlewheel.app/v1";

// ---- helpers: Next 13/14 (sync) & Next 15 (async) safe ----
async function getCookieStore() {
  const maybe = (cookiesFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}
async function getHeaders() {
  const maybe = (headersFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}
async function getParams(ctx: any) {
  const p = ctx?.params;
  return typeof p?.then === "function" ? await p : p;
}

async function getBearer(req: NextRequest) {
  const jar = await getCookieStore();
  const hdrs = await getHeaders();

  const cookieTok =
    jar?.get?.("lw_auth")?.value ||
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

// ---- GET /api/v1/agent/customers/:id (proxy) ----
export async function GET(req: NextRequest, ctx: any) {
  try {
    const params = await getParams(ctx);
    const id = String(params?.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const token = await getBearer(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const upstream = `${BASE_V1}/agent/customers/${encodeURIComponent(id)}`;

    const r = await fetch(upstream, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const body = await r.text();
    return new NextResponse(body, {
      status: r.status,
      headers: {
        "Content-Type": r.headers.get("content-type") || "application/json",
      },
    });
  } catch (err) {
    console.error("[proxy:/api/v1/agent/customers/[id]]", err);
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}
