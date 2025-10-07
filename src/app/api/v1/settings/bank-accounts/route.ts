import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const BANK_ACCOUNTS_PATH =
  process.env.BACKEND_BANK_ACCOUNTS_PATH || "/settings/bank-accounts";

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

export async function GET(req: NextRequest) {
  const token = await getBearer(req);
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: "UNAUTHORIZED",
        message: "Authentication required",
      },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "30";

  const upstream = `${API_BASE}${BANK_ACCOUNTS_PATH}?page=${encodeURIComponent(
    page
  )}&limit=${encodeURIComponent(limit)}`;

  const resp = await fetch(upstream, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-lw-auth": token,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await resp.text();
  try {
    return NextResponse.json(JSON.parse(text || "{}"), { status: resp.status });
  } catch {
    return new NextResponse(text, {
      status: resp.status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
