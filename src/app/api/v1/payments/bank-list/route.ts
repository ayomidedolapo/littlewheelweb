import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import localBanks from "../../data/bank.json"; // keep this file at app/api/v1/data/bank.json

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const BANK_LIST_PATH =
  process.env.BACKEND_BANK_LIST_PATH || "/payments/bank-list";

async function getBearer(req: NextRequest) {
  const jar = await cookies();
  const fromCookie =
    jar.get("authToken")?.value ||
    jar.get("lw_token")?.value ||
    jar.get("session")?.value ||
    jar.get("token")?.value ||
    "";
  const auth = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const x = (req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  return auth || x || fromCookie || "";
}

export async function GET(req: NextRequest) {
  const token = await getBearer(req);

  try {
    const upstream = await fetch(`${API_BASE}${BANK_LIST_PATH}`, {
      headers: {
        ...(token
          ? { Authorization: `Bearer ${token}`, "x-lw-auth": token }
          : {}),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (upstream.ok) {
      const data = await upstream.json().catch(() => ({}));
      return NextResponse.json(data, { status: 200 });
    }
    console.warn("Bank list upstream failed:", upstream.status);
  } catch (e) {
    console.warn("Bank list upstream error:", e);
  }

  // Fallback to local JSON
  return NextResponse.json(
    { success: true, source: "local", data: localBanks },
    { status: 200 }
  );
}
