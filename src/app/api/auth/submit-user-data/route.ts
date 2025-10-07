// app/api/auth/submit-user-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const clean = (s = "") => s.replace(/\/+$/, "");
const V1 = clean(process.env.BACKEND_API_URL || "");
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

function jsonSafe(text: string) {
  try {
    return JSON.parse(text || "{}");
  } catch {
    return { message: text };
  }
}

export async function POST(req: NextRequest) {
  console.log("=== SUBMIT USER DATA ROUTE DEBUG ===");

  if (!V1) {
    console.error("Missing BACKEND_API_URL:", process.env.BACKEND_API_URL);
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL (v1)" },
      { status: 500 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const bearer = await readBearer(req);
  const sessionId =
    body?.sessionId ||
    req.headers.get("x-session-id") ||
    (await readCookie("lw_signup_session")) ||
    "";

  console.log("Token sources check:", {
    authHeader: req.headers.get("authorization")
      ? `Bearer [${
          req.headers.get("authorization")!.replace(/^Bearer\s+/i, "").length
        } chars]`
      : "MISSING",
    xLwAuthHeader: req.headers.get("x-lw-auth")
      ? `[${req.headers.get("x-lw-auth")!.length} chars]`
      : "MISSING",
    cookieToken: (await readCookie("lw_token"))
      ? `[${(await readCookie("lw_token")).length} chars]`
      : "MISSING",
    finalBearer: bearer ? `[${bearer.length} chars]` : "MISSING",
    sessionId: sessionId || "MISSING",
    V1: V1,
  });

  if (!bearer) {
    console.error("NO BEARER TOKEN FOUND");
    return NextResponse.json(
      {
        success: false,
        message: "Missing Bearer token. Please verify/login again.",
        debug: {
          authHeader: !!req.headers.get("authorization"),
          xLwAuth: !!req.headers.get("x-lw-auth"),
          cookieToken: !!(await readCookie("lw_token")),
          sessionId: !!sessionId,
        },
      },
      { status: 401 }
    );
  }

  // Use the exact V1 endpoint from your Swagger: /v1/auth/submit-user-data
  const url = `${V1}/auth/submit-user-data`;

  // Prepare payload exactly matching your V1 Swagger schema
  const payload = {
    firstName: body.firstName,
    lastName: body.lastName,
    middleName: body.middleName,
    dob: body.dob,
    ...(body.avatarUrl ? { avatarUrl: body.avatarUrl } : {}),
    ...(body.referralCode ? { referralCode: body.referralCode } : {}),
    password: body.password || body.pin,
    gender: body.gender,
    username: body.username,
  };

  console.log("=== TOKEN DEBUG ===");
  console.log("Bearer token first 50 chars:", bearer.substring(0, 50) + "...");
  console.log(
    "Bearer token last 20 chars:",
    "..." + bearer.substring(bearer.length - 20)
  );
  console.log("Token length:", bearer.length);
  console.log("Token starts with:", bearer.substring(0, 10));
  console.log("===================");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${bearer}`,
    ...(sessionId ? { "x-session-id": sessionId } : {}),
  };

  console.log("Making request to V1:", {
    url,
    headers: {
      ...headers,
      Authorization: `Bearer [${bearer.length} chars]`,
    },
    payload: {
      ...payload,
      password: "[REDACTED]",
    },
  });

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

  try {
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: ac.signal,
    });

    const text = await r.text();
    const data = jsonSafe(text);

    console.log("V1 response details:", {
      status: r.status,
      statusText: r.statusText,
      success: data?.success,
      message: data?.message,
      fullResponseText: text,
      hasData: !!data,
    });

    if (!r.ok) {
      console.error("V1 request failed details:", {
        status: r.status,
        headers: Object.fromEntries(r.headers.entries()),
        data: data,
      });
    }

    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    console.error("Submit user data error:", e);

    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Upstream fetch failed",
      },
      { status: aborted ? 504 : 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
