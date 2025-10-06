// app/api/user/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const V1 = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

async function readCookie(name: string) {
  try {
    const store = await cookies();
    return store.get(name)?.value || "";
  } catch {
    return "";
  }
}

async function readBearer(req: NextRequest) {
  const header = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const altHdr = (req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  // Prefer canonical cookie, then legacy, then any older names
  const cookieTok =
    (await readCookie("lw_auth")) ||
    (await readCookie("lw_token")) || // legacy alias
    (await readCookie("token")) ||
    "";

  return header || altHdr || cookieTok || "";
}

export async function GET(req: NextRequest) {
  if (!V1) {
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL" },
      { status: 500 }
    );
  }

  const bearer = await readBearer(req);

  if (!bearer) {
    return NextResponse.json(
      { success: false, message: "Missing authentication token" },
      { status: 401 }
    );
  }

  const url = `${V1}/users/me`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      cache: "no-store",
      signal: ac.signal,
    });

    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text || response.statusText };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Failed to fetch user profile",
        },
        { status: response.status }
      );
    }

    // Keep original payload, but also include a normalized "user" root for consumers.
    return NextResponse.json(
      {
        success: true,
        user: data?.user || data?.data || data,
        ...data,
      },
      { status: response.status }
    );
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Request timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Network error",
      },
      { status: aborted ? 504 : 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
