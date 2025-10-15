// app/api/_diag/turnstile/route.ts
import { NextRequest, NextResponse } from "next/server";

const TURNSTILE_SECRET = (process.env.TURNSTILE_SECRET_KEY || "").trim();
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Gate with env + optional header so it never leaks by accident
const ENABLE_TURNSTILE_DEBUG =
  (process.env.ENABLE_TURNSTILE_DEBUG || "").toLowerCase() === "true";

function readClientIp(req: NextRequest) {
  const cf = req.headers.get("CF-Connecting-IP");
  if (cf) return cf;
  const xff = req.headers.get("x-forwarded-for") || "";
  if (xff) return xff.split(",")[0].trim();
  const xr = req.headers.get("x-real-ip");
  if (xr) return xr;
  return "";
}

export async function POST(req: NextRequest) {
  try {
    // Require explicit enable
    const headerDebug =
      (req.headers.get("x-ts-debug") || "").toLowerCase() === "1";
    if (!ENABLE_TURNSTILE_DEBUG && !headerDebug) {
      return NextResponse.json(
        { ok: false, message: "Debug disabled" },
        { status: 403 }
      );
    }

    const { token } = await req.json().catch(() => ({} as any));
    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Missing token" },
        { status: 400 }
      );
    }
    if (!TURNSTILE_SECRET) {
      return NextResponse.json(
        { ok: false, message: "Missing TURNSTILE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const ip = readClientIp(req);
    const body = new URLSearchParams({
      secret: TURNSTILE_SECRET,
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    });

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = await res.json().catch(() => ({}));

    return NextResponse.json({
      ok: !!json?.success,
      status: res.status,
      data: json,
      meta: {
        ip,
        now: new Date().toISOString(),
        node_env: process.env.NODE_ENV,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
