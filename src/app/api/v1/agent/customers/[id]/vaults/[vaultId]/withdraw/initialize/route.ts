// app/api/v1/agent/customers/[id]/set-withdrawal-method/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);
const ROUTE_REV = "set-withdrawal-method-R2";

type Ctx = {
  params:
    | { id: string }
    | Promise<{ id: string }>;
};

const upstreamPath = (id: string) =>
  `/agent/customers/${encodeURIComponent(id)}/set-withdrawal-method`;

/* ---------- Next 13/14/15-safe accessors ---------- */
async function getCookieStore() {
  const maybe = (cookiesFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}
async function getHeadersStore() {
  const maybe = (headersFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

/* ---------- Auth: prefer x-lw-auth, then Authorization, then cookies ---------- */
async function readBearer(req: NextRequest): Promise<string> {
  try {
    const jar = await getCookieStore();
    const hdrs = await getHeadersStore();

    const fromCookie =
      jar?.get?.("lw_token")?.value ||
      jar?.get?.("lw_auth")?.value ||
      jar?.get?.("authToken")?.value ||
      jar?.get?.("token")?.value ||
      jar?.get?.("session")?.value ||
      "";

    const fromAuth =
      (hdrs.get("authorization") || req.headers.get("authorization") || "")
        .replace(/^Bearer\s+/i, "")
        .trim() || "";

    const fromX =
      (hdrs.get("x-lw-auth") || req.headers.get("x-lw-auth") || "")
        .replace(/^Bearer\s+/i, "")
        .trim() || "";

    return fromX || fromAuth || fromCookie || "";
  } catch {
    // very defensive fallback
    return (
      (req.headers.get("authorization") || "")
        .replace(/^Bearer\s+/i, "")
        .trim() ||
      (req.headers.get("x-lw-auth") || "").replace(/^Bearer\s+/i, "").trim() ||
      ""
    );
  }
}

/* ---------- tiny helpers ---------- */
function j(body: any, status = 200) {
  const r = NextResponse.json(body, { status });
  r.headers.set("X-Route-Rev", ROUTE_REV);
  return r;
}

async function safeParams(ctx: Ctx): Promise<{ id: string } | undefined> {
  const maybe = (ctx as any).params;
  const resolved =
    typeof maybe?.then === "function" ? await maybe : maybe;
  return resolved;
}

/* ---------- GET: fetch customer's withdrawal method ---------- */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    if (!API_BASE) {
      return j({ success: false, message: "Missing BACKEND_API_URL" }, 500);
    }

    const params = await safeParams(ctx);
    const customerId = params?.id;

    if (!customerId) {
      return j(
        { success: false, message: "Missing customer id" },
        400
      );
    }

    const token = await readBearer(req);
    if (!token) {
      return j(
        { success: false, message: "Authentication required" },
        401
      );
    }

    const url = `${API_BASE}${upstreamPath(customerId)}`;

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

    try {
      const upstream = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          // send Bearer in BOTH headers
          Authorization: `Bearer ${token}`,
          "x-lw-auth": `Bearer ${token}`,
        },
        cache: "no-store",
        signal: ac.signal,
      });

      const ct = upstream.headers.get("content-type") || "";

      if (!upstream.ok && ct.includes("application/json")) {
        const payload = await upstream.json().catch(() => ({}));
        return j(
          {
            success: false,
            message:
              payload?.message ||
              payload?.error ||
              (upstream.status === 422
                ? "Validation failed (422)"
                : `HTTP ${upstream.status}`),
            upstreamStatus: upstream.status,
            upstreamBody: payload,
          },
          upstream.status
        );
      }

      if (ct.includes("application/json")) {
        const json = await upstream.json().catch(() => ({}));
        return j(json, upstream.status);
      } else {
        const text = await upstream.text().catch(() => "");
        return new NextResponse(text, {
          status: upstream.status,
          headers: { "Content-Type": ct || "text/plain; charset=utf-8" },
        });
      }
    } finally {
      clearTimeout(t);
    }
  } catch (err: any) {
    const aborted = err?.name === "AbortError" || err === "timeout";
    return j(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : err?.message || "Proxy error",
      },
      aborted ? 504 : 502
    );
  }
}

/* ---------- POST: set / update customer's withdrawal method ---------- */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    if (!API_BASE) {
      return j({ success: false, message: "Missing BACKEND_API_URL" }, 500);
    }

    const params = await safeParams(ctx);
    const customerId = params?.id;

    if (!customerId) {
      return j(
        { success: false, message: "Missing customer id" },
        400
      );
    }

    const token = await readBearer(req);
    if (!token) {
      return j(
        { success: false, message: "Authentication required" },
        401
      );
    }

    // Parse JSON (return a clean 400 if invalid)
    let body: any = {};
    try {
      const raw = await req.text();
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return j({ success: false, message: "Invalid JSON body" }, 400);
    }

    const url = `${API_BASE}${upstreamPath(customerId)}`;

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

    try {
      const upstream = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-lw-auth": `Bearer ${token}`,
        },
        body: JSON.stringify(body || {}),
        cache: "no-store",
        signal: ac.signal,
      });

      const ct = upstream.headers.get("content-type") || "";

      if (!upstream.ok && ct.includes("application/json")) {
        const payload = await upstream.json().catch(() => ({}));
        return j(
          {
            success: false,
            message:
              payload?.message ||
              payload?.error ||
              (upstream.status === 422
                ? "Validation failed (422)"
                : `HTTP ${upstream.status}`),
            upstreamStatus: upstream.status,
            upstreamBody: payload,
            hint:
              upstream.status === 422
                ? "Common causes: missing or invalid fields for withdrawal method (e.g. bank details, channel, or account)."
                : undefined,
          },
          upstream.status
        );
      }

      if (ct.includes("application/json")) {
        const json = await upstream.json().catch(() => ({}));
        return j(json, upstream.status);
      } else {
        const text = await upstream.text().catch(() => "");
        return new NextResponse(text, {
          status: upstream.status,
          headers: { "Content-Type": ct || "text/plain; charset=utf-8" },
        });
      }
    } finally {
      clearTimeout(t);
    }
  } catch (err: any) {
    const aborted = err?.name === "AbortError" || err === "timeout";
    return j(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : err?.message || "Proxy error",
      },
      aborted ? 504 : 502
    );
  }
}
