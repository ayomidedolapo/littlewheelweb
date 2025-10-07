import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

type RechargeStatus = "pending" | "approved" | "rejected";
const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const RECHARGE_PATH =
  process.env.BACKEND_AGENT_RECHARGE_PATH || "/agent/recharge";
const USER_ME_PATH = process.env.BACKEND_USER_ME_PATH || ""; // optional
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

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

async function tryGetUser(token: string) {
  if (!USER_ME_PATH) return null;
  try {
    const r = await fetch(`${API_BASE}${USER_ME_PATH}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    const raw = await r.json().catch(() => ({}));
    const u = raw?.user || raw?.data || raw;
    return {
      id: u?.id || u?._id || null,
      email: u?.email || null,
      name:
        [u?.firstName || u?.first_name, u?.lastName || u?.last_name]
          .filter(Boolean)
          .join(" ") ||
        u?.email ||
        null,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const { amount, bankId, selectedBank } = await req.json().catch(() => ({}));
    const numeric = Number(String(amount || "").replace(/[^\d]/g, ""));
    if (!numeric || isNaN(numeric) || numeric <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_AMOUNT",
          message: "Invalid amount provided",
        },
        { status: 400 }
      );
    }
    if (numeric < 100) {
      return NextResponse.json(
        {
          success: false,
          error: "AMOUNT_TOO_LOW",
          message: "Minimum recharge amount is ₦100",
        },
        { status: 400 }
      );
    }
    if (numeric > 1_000_000) {
      return NextResponse.json(
        {
          success: false,
          error: "AMOUNT_TOO_HIGH",
          message: "Maximum recharge amount is ₦1,000,000",
        },
        { status: 400 }
      );
    }

    const user = await tryGetUser(token);

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

    const rechargeResp = await fetch(`${API_BASE}${RECHARGE_PATH}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-lw-auth": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ amount: String(numeric) }),
      cache: "no-store",
      signal: ac.signal,
    });

    clearTimeout(t);

    const txt = await rechargeResp.text();
    const parsed = (() => {
      try {
        return JSON.parse(txt);
      } catch {
        return null;
      }
    })();

    if (!rechargeResp.ok) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "BACKEND_RECHARGE_FAILED",
          status: rechargeResp.status,
          upstream: parsed ?? txt,
        }),
        {
          status: rechargeResp.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const requestId =
      parsed?.data?.id ||
      parsed?.id ||
      parsed?.data?.requestId ||
      parsed?.requestId ||
      `recharge_${Date.now()}`;

    return NextResponse.json(
      {
        success: true,
        message: "Recharge request submitted. Admin notified.",
        data: {
          requestId,
          amount: numeric,
          status: "pending" as RechargeStatus,
          bankUsed: selectedBank || bankId || "WEMA BANK",
          createdAt: new Date().toISOString(),
          estimatedProcessingTime: "5-30 minutes",
          user,
        },
      },
      { status: 201 }
    );
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return NextResponse.json(
      {
        success: false,
        error: aborted ? "TIMEOUT" : "INTERNAL_ERROR",
        message: e?.message || "Server error",
      },
      { status: aborted ? 504 : 500 }
    );
  }
}
