/* app/api/telegram/link/route.ts */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function normalizeBackendBase(raw: string) {
  let b = String(raw || "").trim();
  b = b.replace(/\/+$/, ""); // remove trailing slashes
  b = b.replace(/\/v1$/i, ""); // prevent /v1/v1
  return b;
}

async function readJsonSafe(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return { ok: true as const, json: JSON.parse(text || "{}"), text };
  } catch {
    return { ok: false as const, json: null, text };
  }
}

export async function POST(req: Request) {
  try {
    const { token } = (await req.json()) as { token?: string };

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing token" },
        { status: 400 }
      );
    }

    const baseRaw =
      process.env.BACKEND_API_URL ||
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_API_URL;

    if (!baseRaw) {
      return NextResponse.json(
        { success: false, message: "Server misconfig: BACKEND_API_URL not set" },
        { status: 500 }
      );
    }

    // ✅ Read bearer from cookies set by /api/auth/persist (preferred)
    const jar = cookies();
    const bearer =
      jar.get("lw_token")?.value || jar.get("lw_auth")?.value || "";

    if (!bearer) {
      return NextResponse.json(
        { success: false, message: "Not authenticated (missing lw_token cookie)" },
        { status: 401 }
      );
    }

    const base = normalizeBackendBase(baseRaw);
    const url = `${base}/v1/agent/telegram/link`;

    // ✅ Add timeout so you don’t get random long hangs
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const parsed = await readJsonSafe(upstream);

    if (parsed.ok) {
      return NextResponse.json(parsed.json, { status: upstream.status });
    }

    return new NextResponse(parsed.text || "", {
      status: upstream.status,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (e: any) {
    const isAbort = e?.name === "AbortError";
    return NextResponse.json(
      {
        success: false,
        message: isAbort
          ? "Upstream timeout (15s) while linking Telegram"
          : e?.message || "Failed to link Telegram",
      },
      { status: 500 }
    );
  }
}
