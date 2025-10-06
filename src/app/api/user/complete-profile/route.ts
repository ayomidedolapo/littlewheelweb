// app/api/user/complete-profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const RAW = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
// avoid double /v1/v1
const UPSTREAM = /\/v1($|\/)/.test(RAW)
  ? `${RAW}/users/complete-profile`
  : `${RAW}/v1/users/complete-profile`;

const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

async function getBearer(req: NextRequest) {
  const hdr =
    (req.headers.get("authorization") || "")
      .replace(/^Bearer\s+/i, "")
      .trim() ||
    (req.headers.get("x-lw-auth") || "").replace(/^Bearer\s+/i, "").trim();

  const jar = await cookies();
  const cookieTok =
    jar.get("lw_auth")?.value ||
    jar.get("lw_token")?.value ||
    jar.get("authToken")?.value ||
    jar.get("token")?.value ||
    "";

  return hdr || cookieTok || "";
}

export async function PATCH(req: NextRequest) {
  if (!RAW) {
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL" },
      { status: 500 }
    );
  }

  const bearer = await getBearer(req);
  if (!bearer) {
    return NextResponse.json(
      { success: false, message: "Missing authentication token" },
      { status: 401 }
    );
  }

  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch {
    bodyText = "";
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

  try {
    const upstream = await fetch(UPSTREAM, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: bodyText || "{}",
      cache: "no-store",
      signal: ac.signal,
    });

    // Pass-through body/status exactly
    const txt = await upstream.text();
    let json: any = null;
    try {
      json = txt ? JSON.parse(txt) : null;
    } catch {
      // upstream returned text – wrap it
      json = { success: upstream.ok, message: txt || upstream.statusText };
    }

    return NextResponse.json(
      {
        ...json,
        // add a tiny hint that this came via proxy (handy in debugging)
        _proxy: { path: UPSTREAM, status: upstream.status },
      },
      { status: upstream.status }
    );
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
