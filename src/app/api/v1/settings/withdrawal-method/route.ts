import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const PATH =
  process.env.BACKEND_WITHDRAWAL_METHOD_PATH || "/settings/withdrawal-method";
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

async function readBearer(req: NextRequest) {
  const jar = await cookies();
  const ck =
    jar.get("authToken")?.value ||
    jar.get("lw_token")?.value ||
    jar.get("token")?.value ||
    "";
  const auth = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const x = (req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  return auth || x || ck || "";
}

async function forward(
  req: NextRequest,
  method: "GET" | "POST" | "PATCH",
  body?: any
) {
  if (!API_BASE) {
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL" },
      { status: 500 }
    );
  }

  const url = `${API_BASE}${PATH}`;
  const bearer = await readBearer(req);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
      headers["x-lw-auth"] = bearer;
    }
    if (method !== "GET") headers["Content-Type"] = "application/json";

    const upstream = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: ac.signal,
    });

    const text = await upstream.text();
    try {
      const json = text ? JSON.parse(text) : null;
      return NextResponse.json(json, { status: upstream.status });
    } catch {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    if (method === "GET" && aborted)
      return new NextResponse(null, { status: 204 });
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Upstream error",
      },
      { status: aborted ? 504 : 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  return forward(req, "GET");
}
export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  return forward(req, "POST", payload);
}
export async function PATCH(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  return forward(req, "PATCH", payload);
}
