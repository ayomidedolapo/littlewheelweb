import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const subscription = await req.json();

    // keep for debugging
    console.log("Web Push Subscription received:", subscription);

    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return NextResponse.json(
        { ok: false, message: "Missing BACKEND_API_URL" },
        { status: 500 }
      );
    }

    // Forward cookies (works if your auth is cookie-based)
    const cookie = req.headers.get("cookie") || "";

    const r = await fetch(`${base}/v1/agent/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie,
      },
      body: JSON.stringify(subscription),
      cache: "no-store",
    });

    const text = await r.text();
    let backendResp: any = null;
    try {
      backendResp = JSON.parse(text || "null");
    } catch {
      backendResp = { raw: text };
    }

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, message: "Backend rejected subscription", backend: backendResp },
        { status: r.status }
      );
    }

    return NextResponse.json({ ok: true, backend: backendResp });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Failed to proxy subscription" },
      { status: 400 }
    );
  }
}
