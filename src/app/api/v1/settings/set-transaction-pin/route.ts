import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const UPSTREAM_PATH =
  process.env.BACKEND_SET_PIN_PATH || "/settings/set-transaction-pin";

async function getBearer(req: NextRequest) {
  const jar = await cookies();
  const ck =
    jar.get("authToken")?.value ||
    jar.get("lw_token")?.value ||
    jar.get("session")?.value ||
    jar.get("token")?.value ||
    "";
  const x = (req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const auth = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  return auth || x || ck || "";
}

export async function PATCH(req: NextRequest) {
  const token = await getBearer(req);
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const upstreamUrl = `${API_BASE}${UPSTREAM_PATH}`;
  console.log("[set-transaction-pin] PATCH ->", upstreamUrl, {
    hasPin: typeof body?.pin === "string",
    pwLen: typeof body?.password === "string" ? body.password.length : 0,
  });

  try {
    const resp = await fetch(upstreamUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-lw-auth": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await resp.text();
    try {
      const json = JSON.parse(text || "{}");
      if (!resp.ok)
        console.warn("[set-transaction-pin] Upstream error", resp.status, json);
      return NextResponse.json(json, { status: resp.status });
    } catch {
      return new NextResponse(text, {
        status: resp.status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  } catch (err) {
    console.error("[set-transaction-pin] Network error", err);
    return NextResponse.json(
      { success: false, message: "Upstream not reachable" },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Not Found" }, { status: 404 });
}
