// app/api/auth/submit-user-data/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const clean = (s = "") => s.replace(/\/+$/, "");
const V1 = clean(process.env.BACKEND_API_URL || "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

/* ---- helpers ---- */
async function readCookie(name: string) {
  try {
    const c = await cookies();
    return c.get(name)?.value || "";
  } catch {
    return "";
  }
}

function jsonSafe(text: string) {
  try {
    return JSON.parse(text || "{}");
  } catch {
    return { message: text };
  }
}

/* ---- ONLY signup token is allowed ---- */
async function readBearer(req: NextRequest, body: any) {
  const header = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  const alt = (req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  const bodyTok = String(body?.accessToken || body?.token || "").trim();

  const queryTok = new URL(req.url).searchParams.get("token") || "";

  const signupCookie = await readCookie("lw_signup_token");

  return header || alt || bodyTok || queryTok || signupCookie || "";
}

export async function POST(req: NextRequest) {
  if (!V1) {
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL" },
      { status: 500 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const bearer = await readBearer(req, body);
  if (!bearer) {
    return NextResponse.json(
      { success: false, message: "Missing signup Bearer token" },
      { status: 401 }
    );
  }

  const sessionId =
    body?.sessionId ||
    req.headers.get("x-session-id") ||
    (await readCookie("lw_signup_session")) ||
    "";

  const deviceToken =
    body?.deviceToken ||
    (await readCookie("lw_device_token")) ||
    "";

  const payload = {
    firstName: body.firstName,
    lastName: body.lastName,
    middleName: body.middleName,
    dob: body.dob,
    gender: body.gender,
    username: body.username,
    ...(body.avatarUrl ? { avatarUrl: body.avatarUrl } : {}),
    ...(body.referralCode ? { referralCode: body.referralCode } : {}),
    password: body.password || body.pin,
    ...(sessionId ? { sessionId } : {}),
    ...(deviceToken ? { deviceToken } : {}),
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${bearer}`,
    ...(sessionId ? { "x-session-id": sessionId } : {}),
    ...(deviceToken ? { "x-device-token": deviceToken } : {}),
  };

  const url = `${V1}/auth/submit-user-data`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

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

    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "Upstream error" },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
