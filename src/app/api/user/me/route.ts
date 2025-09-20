// app/api/user/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const V1 = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

async function readCookie(name: string) {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(name)?.value || "";
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
  const cookieTok =
    (await readCookie("lw_token")) || (await readCookie("token"));
  return header || altHdr || cookieTok || "";
}

export async function GET(req: NextRequest) {
  console.log("=== GET USER PROFILE ===");

  if (!V1) {
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL" },
      { status: 500 }
    );
  }

  const bearer = await readBearer(req);

  console.log("Token check:", {
    hasAuthHeader: !!req.headers.get("authorization"),
    hasXLwAuth: !!req.headers.get("x-lw-auth"),
    hasCookieToken: !!(await readCookie("lw_token")),
    finalBearer: bearer ? `[${bearer.length} chars]` : "MISSING",
  });

  if (!bearer) {
    return NextResponse.json(
      { success: false, message: "Missing authentication token" },
      { status: 401 }
    );
  }

  const url = `${V1}/users/me`;

  console.log("Fetching user profile from:", url);

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

    console.log("User profile response:", {
      status: response.status,
      success: data?.success,
      hasUserData: !!data?.user || !!data?.data,
      dataKeys: data ? Object.keys(data) : [],
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Failed to fetch user profile",
        },
        { status: response.status }
      );
    }

    // Return the data in a consistent format
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
    console.error("Get user profile error:", e);

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
