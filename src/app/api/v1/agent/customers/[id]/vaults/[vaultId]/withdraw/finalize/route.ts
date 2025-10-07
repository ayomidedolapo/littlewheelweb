// app/api/v1/agent/customers/[id]/vaults/[vaultId]/withdraw/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);
const ROUTE_REV = "withdraw-finalize-R2";

const finalizePath = (id: string, vaultId: string) =>
  `/agent/customers/${encodeURIComponent(id)}/vaults/${encodeURIComponent(
    vaultId
  )}/withdraw/finalize`;

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

export async function POST(
  req: NextRequest,
  ctx: {
    params:
      | Promise<{ id: string; vaultId: string }>
      | { id: string; vaultId: string };
  }
) {
  try {
    const { id, vaultId } =
      typeof (ctx.params as any)?.then === "function"
        ? await (ctx.params as any)
        : (ctx.params as any);

    if (!API_BASE) {
      return j({ ok: false, message: "Missing BACKEND_API_URL" }, 500);
    }
    if (!id || !vaultId) {
      return j({ ok: false, message: "Missing customerId or vaultId" }, 400);
    }

    const token = await readBearer(req);
    if (!token) {
      return j({ ok: false, message: "Authentication required" }, 401);
    }

    // Parse JSON (return a clean 400 if invalid)
    let body: any = {};
    try {
      const raw = await req.text();
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return j({ ok: false, message: "Invalid JSON body" }, 400);
    }

    const upstreamUrl = `${API_BASE}${finalizePath(id, vaultId)}`;

    // Timeout control
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

    try {
      const upstream = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          // IMPORTANT: send Bearer in BOTH headers (some gateways check one or the other)
          Authorization: `Bearer ${token}`,
          "x-lw-auth": `Bearer ${token}`,
        },
        body: JSON.stringify(body || {}),
        cache: "no-store",
        signal: ac.signal,
      });

      const ct = upstream.headers.get("content-type") || "";

      // On errors, surface upstream validation details if JSON
      if (!upstream.ok && ct.includes("application/json")) {
        const payload = await upstream.json().catch(() => ({}));
        return j(
          {
            ok: false,
            message:
              payload?.message ||
              payload?.error ||
              (upstream.status === 422
                ? "Validation failed (422)"
                : `HTTP ${upstream.status}`),
            upstreamStatus: upstream.status,
            upstreamErrors: payload?.errors || payload?.details || undefined,
            hint:
              upstream.status === 422
                ? "Common causes: missing/invalid reference, OTP/face token, or method constraints."
                : undefined,
          },
          upstream.status
        );
      }

      // Proxy success (or non-JSON errors) as-is
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
        ok: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : err?.message || "Proxy error",
      },
      aborted ? 504 : 502
    );
  }
}
