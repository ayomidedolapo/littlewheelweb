import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

function postPath(customerId: string) {
  // 👉 Backend route to CREATE/UPDATE withdrawal method for a customer
  return `/agent/customers/${encodeURIComponent(
    customerId
  )}/set-withdrawal-method`;
}

function customerDetailPath(customerId: string) {
  // 👉 Backend route that returns customer + withdrawalMethod
  return `/agent/customers/${encodeURIComponent(customerId)}`;
}

/* ---------- Read token ---------- */
async function readBearer(req: NextRequest) {
  const jar = await cookies();
  const ck =
    jar.get("authToken")?.value ||
    jar.get("lw_token")?.value ||
    jar.get("token")?.value ||
    "";

  const auth = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s*/i, "")
    .trim();

  const x = (req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s*/i, "")
    .trim();

  return auth || x || ck || "";
}

/* ---------- Forward POST (save/update withdrawal method) ---------- */
async function forwardPost(req: NextRequest, customerId: string) {
  if (!API_BASE)
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL" },
      { status: 500 }
    );

  const token = await readBearer(req);
  const body = await req.json().catch(() => null);
  const url = `${API_BASE}${postPath(customerId)}`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(token ? { "x-lw-auth": token } : {}),
      },
      cache: "no-store",
      signal: ac.signal,
      body: JSON.stringify(body),
    });

    const text = await res.text();

    try {
      const json = text ? JSON.parse(text) : null;
      return NextResponse.json(json, { status: res.status });
    } catch {
      return new NextResponse(text, {
        status: res.status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Upstream error",
      },
      { status: aborted ? 504 : 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Forward GET (read withdrawalMethod from customer) ---------- */
async function forwardGet(req: NextRequest, customerId: string) {
  if (!API_BASE)
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL" },
      { status: 500 }
    );

  const token = await readBearer(req);
  const url = `${API_BASE}${customerDetailPath(customerId)}`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(token ? { "x-lw-auth": token } : {}),
      },
      cache: "no-store",
      signal: ac.signal,
    });

    const text = await res.text();

    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // if backend didn't return JSON, just bubble it as-is
      return new NextResponse(text, {
        status: res.status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    if (!res.ok) {
      const msg =
        json?.message || json?.error || `Customer fetch failed (HTTP ${res.status})`;
      return NextResponse.json(
        {
          success: false,
          message: msg,
          upstreamStatus: res.status,
        },
        { status: 422 }
      );
    }

    // swagger sample:
    // { ..., withdrawalMethod: { id, userId, bankName, ... } }
    const base = json?.data || json;
    const wm = base?.withdrawalMethod || null;

    return NextResponse.json(
      {
        success: true,
        data: wm, // ✅ this is what page.tsx reads as j?.data
      },
      { status: 200 }
    );
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Upstream error",
      },
      { status: aborted ? 504 : 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}

/* ==========================================================
   =                 HANDLERS                               =
   ========================================================== */

type Ctx = { params: { id: string } };

/* ---------- GET: returns *customer's* withdrawalMethod only ---------- */
export async function GET(req: NextRequest, ctx: Ctx) {
  const customerId = ctx.params?.id;
  if (!customerId) {
    return NextResponse.json(
      { success: false, message: "Missing customer id" },
      { status: 400 }
    );
  }

  return forwardGet(req, customerId);
}

/* ---------- POST: SAVE/UPDATE METHOD ---------- */
export async function POST(req: NextRequest, ctx: Ctx) {
  const customerId = ctx.params?.id;
  if (!customerId) {
    return NextResponse.json(
      { success: false, message: "Missing customer id" },
      { status: 400 }
    );
  }

  return forwardPost(req, customerId);
}
