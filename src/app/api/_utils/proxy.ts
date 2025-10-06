// api/_utils/proxy.ts
import { NextRequest, NextResponse } from "next/server";

const RAW_BASE =
  process.env.BACKEND_API_URL?.replace(/\/+$/, "") ||
  process.env.BACKEND_URL?.replace(/\/+$/, "") ||
  "";

const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

function ensureBase(): string {
  if (!RAW_BASE) throw new Error("Missing BACKEND_API_URL/BACKEND_URL");
  return RAW_BASE;
}

function join(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

/** Pull token from Authorization, x-lw-auth or cookies (works across Next versions) */
function readCookie(req: NextRequest, name: string): string {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(/;\s*/)) {
    const [k, ...rest] = part.split("=");
    if (k === name) return decodeURIComponent(rest.join("=") || "");
  }
  return "";
}

function readBearer(req: NextRequest): string {
  const auth =
    req.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() || "";
  const xlw = (req.headers.get("x-lw-auth") || "").trim();
  const jar =
    readCookie(req, "lw_token") ||
    readCookie(req, "authToken") ||
    readCookie(req, "token") ||
    readCookie(req, "session") ||
    "";
  return auth || xlw || jar || "";
}

type ProxyInit = RequestInit & {
  /** Optional absolute or relative path; if omitted, use req.nextUrl.pathname */
  path?: string;
  /** Optional extra query params to append/override */
  query?: Record<string, string | number | boolean | undefined | null>;
};

/** Generic proxy helper for API routes */
export async function proxy(req: NextRequest, path?: string, init?: ProxyInit) {
  try {
    const base = ensureBase();

    // Compose target URL
    const targetPath = init?.path ?? path ?? req.nextUrl.pathname;
    const url = new URL(join(base, targetPath));

    // Forward incoming query params
    req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

    // Optional overrides/extra query params
    if (init?.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }

    // Auth
    const bearer = readBearer(req);

    // Headers
    const headers = new Headers(init?.headers || {});
    // Preserve Accept if caller set it, else default to JSON
    if (!headers.has("accept")) headers.set("accept", "application/json");

    // Send both flavors to satisfy different upstreams
    if (bearer && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${bearer}`);
    }
    if (bearer && !headers.has("x-lw-auth")) {
      headers.set("x-lw-auth", bearer);
    }

    // Only set Content-Type if we will send a body and caller didn't set it
    const method = (init?.method || req.method || "GET").toUpperCase();
    const willSendBody = !["GET", "HEAD"].includes(method);
    if (willSendBody && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    // Body: prefer explicit init.body, else forward incoming body for non-GET/HEAD
    let body: BodyInit | undefined = undefined;
    if (willSendBody) {
      if (init?.body !== undefined) {
        body = init.body as BodyInit;
      } else {
        // Forward request body as text for simplicity; upstream can parse JSON
        const text = await req.text();
        body = text.length ? text : undefined;
      }
    }

    // Timeout guard
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

    const resp = await fetch(url.toString(), {
      method,
      headers,
      body,
      cache: "no-store",
      signal: ac.signal,
      redirect: init?.redirect,
      credentials: "omit",
    }).finally(() => clearTimeout(timer));

    // Pass through response as-is (type-aware)
    const ct =
      resp.headers.get("content-type") || "application/json; charset=utf-8";
    const text = await resp.text();

    return new NextResponse(text, {
      status: resp.status,
      headers: {
        "content-type": ct,
      },
    });
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Proxy error",
      },
      { status: aborted ? 504 : 502 }
    );
  }
}
