/* src/app/api/agent/push/subscribe/route.ts
   ✅ Fix: prevents /v1/v1 by stripping trailing /v1 from BACKEND_API_URL if present
*/

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeBase(base: string) {
  let b = (base || "").trim();

  // remove trailing slashes
  b = b.replace(/\/+$/, "");

  // ✅ if user stored BACKEND_API_URL like https://api.domain.com/v1
  // strip the trailing /v1 so we don't end up with /v1/v1/...
  b = b.replace(/\/v1$/i, "");

  return b;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ Route OK: POST /api/agent/push/subscribe",
  });
}

export async function POST(req: Request) {
  try {
    const subscription = await req.json();

    console.log("✅ HIT: /api/agent/push/subscribe");
    console.log("Web Push Subscription received:", subscription);

    const rawBase = process.env.BACKEND_API_URL;
    if (!rawBase) {
      return NextResponse.json(
        { ok: false, message: "Missing BACKEND_API_URL" },
        { status: 500 }
      );
    }

    const base = normalizeBase(rawBase);

    // Forward cookie + authorization header (supports cookie auth or bearer tokens)
    const cookie = req.headers.get("cookie") || "";
    const auth = req.headers.get("authorization") || "";

    // ✅ Always build exactly one /v1/...
    const targetUrl = `${base}/v1/agent/push/subscribe`;

    const r = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(subscription),
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
      return NextResponse.json(
        {
          ok: false,
          message: "Backend rejected subscription",
          status: r.status,
          sentTo: targetUrl, // ✅ helps you confirm no /v1/v1
          backend: backendResp,
        },
        { status: r.status }
      );
    }

    return NextResponse.json({ ok: true, sentTo: targetUrl, backend: backendResp });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Failed to proxy subscription" },
      { status: 400 }
    );
  }
}
