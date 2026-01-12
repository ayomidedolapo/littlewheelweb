/* src/app/api/agent/push/subscribe/route.ts */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeBase(base: string) {
  let b = (base || "").trim();
  b = b.replace(/\/+$/, "");     // remove trailing slashes
  b = b.replace(/\/v1$/i, "");   // remove trailing /v1 if present
  return b;
}

type PushSubscribePayload = {
  deviceToken: string; // UUID from /me
  fcmToken: string;    // Firebase Web Messaging token
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ Route OK: POST /api/agent/push/subscribe",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("✅ HIT: /api/agent/push/subscribe");
    console.log("Raw body received:", body);

    const payload = body as PushSubscribePayload;

    if (!payload?.deviceToken || typeof payload.deviceToken !== "string") {
      return NextResponse.json(
        {
          ok: false,
          message: "deviceToken is required and must be a string",
        },
        { status: 400 }
      );
    }

    if (!payload?.fcmToken || typeof payload.fcmToken !== "string") {
      return NextResponse.json(
        {
          ok: false,
          message: "fcmToken is required and must be a string",
        },
        { status: 400 }
      );
    }

    console.log("✅ Parsed payload for backend:", {
      deviceToken: payload.deviceToken,
      fcmToken: payload.fcmToken,
    });

    const rawBase = process.env.BACKEND_API_URL;
    if (!rawBase) {
      return NextResponse.json(
        { ok: false, message: "Missing BACKEND_API_URL" },
        { status: 500 }
      );
    }

    const base = normalizeBase(rawBase);

    const cookie = req.headers.get("cookie") || "";
    const auth = req.headers.get("authorization") || "";

    // 🔁 Keep this for now; Tobi can wire /v1/agent/push/subscribe to save the FCM token
    const targetUrl = `${base}/v1/agent/push/subscribe`;

    const r = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await r.text();
    let backendResp: any = null;

    try {
      backendResp = text ? JSON.parse(text) : null;
    } catch {
      backendResp = { raw: text };
    }

    if (!r.ok) {
      console.error("❌ Backend rejected FCM token subscription:", backendResp);

      return NextResponse.json(
        {
          ok: false,
          message: "Backend rejected FCM token",
          status: r.status,
          sentTo: targetUrl,
          backend: backendResp,
        },
        { status: r.status }
      );
    }

    console.log("✅ Backend accepted FCM token:", backendResp);

    return NextResponse.json({
      ok: true,
      sentTo: targetUrl,
      backend: backendResp,
    });
  } catch (e: any) {
    console.error("❌ Error in /api/agent/push/subscribe proxy:", e);

    return NextResponse.json(
      {
        ok: false,
        message: e?.message || "Failed to proxy FCM token",
      },
      { status: 400 }
    );
  }
}
