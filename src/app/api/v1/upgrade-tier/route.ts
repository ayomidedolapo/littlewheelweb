/* src/app/api/v1/upgrade-tier/route.ts */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Helpers */
function trimTrailingSlash(s: string) {
  return s.replace(/\/+$/, "");
}
function trimSlashes(s: string) {
  return s.replace(/^\/+|\/+$/g, "");
}
function joinUrl(...parts: Array<string | undefined | null>) {
  const [head, ...rest] = parts.filter(Boolean) as string[];
  if (!head) return "";
  const base = trimTrailingSlash(head);
  if (!rest.length) return base;
  return [base, ...rest.map(trimSlashes)].join("/");
}

/**
 * ENV:
 * - BACKEND_API_URL: e.g. "https://api.example.com" OR "https://api.example.com/v1"
 * - BACKEND_API_PREFIX (optional): default "/v1"
 * - UPSTREAM_UPGRADE_PATH (optional): default "users/upgrade-tier"
 *
 * This builder avoids "/v1/v1" duplicates no matter how you set the envs.
 */
const RAW_API_BASE = process.env.BACKEND_API_URL || "";
const API_PREFIX = process.env.BACKEND_API_PREFIX ?? "/v1";
const UPSTREAM_PATH = process.env.UPSTREAM_UPGRADE_PATH ?? "users/upgrade-tier";

/** Build upstream: handles whether BACKEND_API_URL already contains /v1 */
function buildUpstreamUrl() {
  const base = trimTrailingSlash(RAW_API_BASE);
  const baseHasV1 = /\/v1(?:\/|$)/.test(base);
  const prefix = baseHasV1 ? "" : API_PREFIX; // don't add another /v1 if base already has it
  return joinUrl(base, prefix, UPSTREAM_PATH);
}

const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

async function readBearer(req: NextRequest) {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const cookieTok =
    store.get("lw_auth")?.value ||
    store.get("lw_token")?.value ||
    store.get("token")?.value ||
    "";
  const header =
    req.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() || "";
  const alt =
    req.headers
      .get("x-lw-auth")
      ?.replace(/^Bearer\s+/i, "")
      .trim() || "";
  return header || alt || cookieTok || "";
}

export async function POST(req: NextRequest) {
  if (!RAW_API_BASE) {
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL" },
      { status: 500 }
    );
  }

  const bearer = await readBearer(req);
  if (!bearer) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  const upstreamUrl = buildUpstreamUrl(); // <- safe, no /v1/v1
  const body = await req.text();

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

  try {
    const r = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${bearer}`,
        "x-lw-auth": bearer,
      },
      body,
      cache: "no-store",
      signal: ac.signal,
      redirect: "manual",
    });

    const text = await r.text();
    const out = new NextResponse(text, {
      status: r.status,
      headers: {
        "content-type":
          r.headers.get("content-type") || "application/json; charset=utf-8",
      },
    });

    // forward Set-Cookie from upstream if present
    const anyHeaders = r.headers as any;
    const setCookies =
      anyHeaders.getSetCookie?.() ||
      anyHeaders.raw?.()["set-cookie"] ||
      (r.headers.get("set-cookie") ? [r.headers.get("set-cookie")] : []);
    (setCookies || []).filter(Boolean).forEach((c: string) => {
      out.headers.append("set-cookie", c);
    });

    return out;
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
  } finally {
    clearTimeout(timer);
  }
}

/* Optional: GET to verify the route is mounted */
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/v1/upgrade-tier" });
}
