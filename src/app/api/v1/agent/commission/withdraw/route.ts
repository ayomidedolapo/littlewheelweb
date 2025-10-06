import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE = (
  process.env.BACKEND_API_URL || "https://dev-api.insider.littlewheel.app/v1"
).replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

/** Read a cookie value from the raw Cookie header (works across Next versions) */
function readCookie(req: NextRequest, name: string): string {
  const header = req.headers.get("cookie") || "";
  for (const seg of header.split(/;\s*/)) {
    const [k, ...rest] = seg.split("=");
    if (k === name) return decodeURIComponent(rest.join("=") || "");
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Prefer Authorization/x-lw-auth; fall back to cookies
    const authHdr = (req.headers.get("authorization") || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    const xHdr = (req.headers.get("x-lw-auth") || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    const ck =
      readCookie(req, "lw_token") || readCookie(req, "authToken") || "";
    const token = authHdr || xHdr || ck;

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Missing agent token. Provide Authorization, x-lw-auth, or lw_token/authToken cookie.",
        },
        { status: 401 }
      );
    }

    const url = `${API_BASE}/agent/commission/withdraw`;

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "x-lw-auth": token,
      },
      body: JSON.stringify(body || {}),
      cache: "no-store",
      signal: ac.signal,
    });

    clearTimeout(t);

    const ct = upstream.headers.get("content-type") || "";
    const text = await upstream.text();
    if (ct.includes("application/json")) {
      try {
        return NextResponse.json(JSON.parse(text || "{}"), {
          status: upstream.status,
        });
      } catch {
        // fall through to text wrapper
      }
    }
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return NextResponse.json(
      {
        error: aborted
          ? `Timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Commission withdrawal failed.",
      },
      { status: aborted ? 504 : 502 }
    );
  }
}
