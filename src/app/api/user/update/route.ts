import { NextRequest, NextResponse } from "next/server";

/** Avoid static optimization (auth + cookies are dynamic) */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const V1 = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

async function readCookie(name: string) {
  try {
    const store = await (await import("next/headers")).cookies();
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
  // Prefer canonical cookie, then legacy names
  const cookieTok =
    (await readCookie("lw_auth")) ||
    (await readCookie("lw_token")) ||
    (await readCookie("token")) ||
    "";
  return header || altHdr || cookieTok || "";
}

// PATCH /api/user/update
export async function PATCH(req: NextRequest) {
  if (!V1) {
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

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  // IMPORTANT: Do not double-append /v1
  // If your BACKEND_API_URL already ends with /v1, this is correct:
  const url = `${V1}/users/update`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        "x-lw-auth": bearer,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: ac.signal,
      redirect: "manual",
    });

    const text = await upstream.text();
    const res = new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ||
          "application/json; charset=utf-8",
      },
    });

    // Relay Set-Cookie if upstream sets session cookies
    const anyHeaders = upstream.headers as any;
    const setCookies: string[] =
      anyHeaders.getSetCookie?.() ||
      anyHeaders.raw?.()["set-cookie"] ||
      (upstream.headers.get("set-cookie")
        ? [upstream.headers.get("set-cookie")!]
        : []);
    for (const c of (setCookies || []).filter(Boolean)) {
      res.headers.append("set-cookie", c);
    }

    return res;
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
