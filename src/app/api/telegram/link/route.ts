/* app/api/telegram/link/route.ts */
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token, authToken } = (await req.json()) as {
      token?: string;
      authToken?: string;
    };

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing token" },
        { status: 400 }
      );
    }
    if (!authToken || typeof authToken !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing authToken" },
        { status: 401 }
      );
    }

    const base =
      process.env.BACKEND_API_URL ||
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_API_URL;

    if (!base) {
      return NextResponse.json(
        { success: false, message: "Server misconfig: BACKEND_API_URL not set" },
        { status: 500 }
      );
    }

    const url = `${base.replace(/\/$/, "")}/v1/agent/telegram/link`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });

    const text = await upstream.text().catch(() => "");
    // pass-through response (JSON if possible)
    try {
      const json = JSON.parse(text || "{}");
      return NextResponse.json(json, { status: upstream.status });
    } catch {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        message: e?.message || "Failed to link Telegram",
      },
      { status: 500 }
    );
  }
}
