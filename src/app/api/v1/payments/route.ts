import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ORIGIN = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
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

  const cookieTok =
    (await readCookie("lw_auth")) ||
    (await readCookie("lw_token")) ||
    (await readCookie("token")) ||
    "";

  return header || altHdr || cookieTok || "";
}

export async function GET(req: NextRequest) {
  if (!ORIGIN) {
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

  // Build upstream URL safely: add /v1 only if ORIGIN doesn't already end with /v1
  const hasV1 = /\/v1(?:\/)?$/.test(ORIGIN);
  const search = new URL(req.url).search; // includes ?...
  const url = `${ORIGIN}${hasV1 ? "" : "/v1"}/payments${search}`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      cache: "no-store",
      signal: ac.signal,
    });

    const text = await upstream.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text || upstream.statusText };
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Failed to fetch payments",
          ...data,
        },
        { status: upstream.status }
      );
    }

    // keep raw payload and also expose a normalized list for your UI
    const list =
      (Array.isArray(data) && data) ||
      data?.data ||
      data?.results ||
      data?.items ||
      data?.payments ||
      data?.docs ||
      [];

    return NextResponse.json({ success: true, data, list }, { status: 200 });
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
