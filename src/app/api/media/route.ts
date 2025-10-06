// app/api/media/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-lw-auth",
    "Access-Control-Max-Age": "86400",
  };
}

async function readBearer(req: NextRequest): Promise<string> {
  const cookieStore = await (await import("next/headers")).cookies();
  const fromCookie =
    cookieStore.get("authToken")?.value ||
    cookieStore.get("lw_token")?.value ||
    cookieStore.get("token")?.value ||
    "";
  const fromAuth =
    req.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() || "";
  const fromX =
    req.headers
      .get("x-lw-auth")
      ?.replace(/^Bearer\s+/i, "")
      .trim() || "";
  return fromCookie || fromAuth || fromX || "";
}

/** Preflight */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * GET /api/media?u=<encoded absolute or relative url>
 * - We add Authorization cookie/header and stream the file back.
 */
export async function GET(req: NextRequest) {
  try {
    const inUrl = new URL(req.url);
    const raw = inUrl.searchParams.get("u") || "";
    if (!raw) {
      return NextResponse.json(
        { success: false, message: "Missing ?u param" },
        { status: 400, headers: corsHeaders() }
      );
    }

    let target = raw;
    // If relative like "/uploads/xyz.jpg", prefix API_BASE
    if (!/^https?:\/\//i.test(target)) {
      if (!API_BASE) {
        return NextResponse.json(
          {
            success: false,
            message: "Missing BACKEND_API_URL for relative media",
          },
          { status: 500, headers: corsHeaders() }
        );
      }
      target = `${API_BASE.replace(/\/+$/, "")}/${target.replace(/^\/+/, "")}`;
    }

    const bearer = await readBearer(req);

    const headers = new Headers();
    if (bearer) {
      headers.set("authorization", `Bearer ${bearer}`);
      headers.set("x-lw-auth", bearer);
    }
    const cookie = req.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

    const r = await fetch(target, {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: ac.signal,
    }).finally(() => clearTimeout(timer));

    // Body as a stream/buffer
    const buf = Buffer.from(await r.arrayBuffer());

    const out = new NextResponse(buf, {
      status: r.status,
      headers: {
        ...corsHeaders(),
        "content-type":
          r.headers.get("content-type") || "application/octet-stream",
        "cache-control": "private, max-age=60", // small cache
      },
    });

    return out;
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Media proxy error",
      },
      { status: aborted ? 504 : 502, headers: corsHeaders() }
    );
  }
}
