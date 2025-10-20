// app/api/auth/set-user-address/route.ts
import { NextRequest, NextResponse } from "next/server";

const BASE_V1 = (
  process.env.BACKEND_API_URL || "https://dev-api.insider.littlewheel.app/v1"
).replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

/* ---------- Turnstile config ---------- */
const TURNSTILE_SECRET = (process.env.TURNSTILE_SECRET_KEY || "").trim();
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function readClientIp(req: NextRequest) {
  const cf = req.headers.get("CF-Connecting-IP");
  if (cf) return cf;
  const xff =
    req.headers.get("X-Forwarded-For") || req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xr = req.headers.get("x-real-ip");
  if (xr) return xr;
  return "";
}

function readTurnstileToken(body: any) {
  return (
    String(
      body?.captchaToken ||
        body?.turnstileToken ||
        body?.["cf-turnstile-response"] ||
        ""
    ).trim() || ""
  );
}

async function verifyTurnstile(token: string, ip?: string) {
  if (!TURNSTILE_SECRET) {
    return { ok: false as const, reason: "Missing TURNSTILE_SECRET_KEY env" };
  }
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
        idempotency_key:
          (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (json?.success) return { ok: true as const, data: json };
    return {
      ok: false as const,
      data: json,
      reason: Array.isArray(json?.["error-codes"])
        ? json["error-codes"].join(",")
        : "turnstile-failed",
    };
  } catch (e: any) {
    return { ok: false as const, reason: e?.message || "turnstile-error" };
  }
}
/* ---------- /Turnstile config ---------- */

function jsonSafe(text: string) {
  try {
    return JSON.parse(text || "{}");
  } catch {
    return { message: text };
  }
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  /* 🔐 Enforce Turnstile */
  const tsToken = readTurnstileToken(body);
  if (!tsToken) {
    return NextResponse.json(
      { success: false, message: "Missing Turnstile token" },
      { status: 400 }
    );
  }
  const ip = readClientIp(req);
  const verdict = await verifyTurnstile(tsToken, ip);
  if (!verdict.ok) {
    return NextResponse.json(
      {
        success: false,
        message: "Turnstile verification failed",
        details: verdict.data ?? verdict.reason ?? "unknown",
      },
      { status: 403 }
    );
  }
  // Optional: check action === "signup_address"
  // const { action } = verdict.data || {};
  // if (action !== "signup_address") return NextResponse.json({ success:false, message:"Bad captcha action" }, { status: 403 });

  // keep only expected fields
  const payload = {
    country: body?.country ?? "",
    state: body?.state ?? "",
    city: body?.city ?? "",
    lga: body?.lga ?? body?.localGovernment ?? "",
    address: body?.address ?? "",
  };

  // auth precedence: Authorization > x-lw-auth > cookie
  const authHeader = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const altHeader = (req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const cookieToken =
    req.cookies.get("lw_token")?.value ||
    req.cookies.get("lw_auth")?.value ||
    "";
  const token = authHeader || altHeader || cookieToken;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: missing token" },
      { status: 401 }
    );
  }

  const sessionId = req.headers.get("x-session-id") || body?.sessionId || "";

  const url = `${BASE_V1}/auth/set-user-address`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(sessionId ? { "x-session-id": sessionId } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: ac.signal,
    });

    const text = await r.text();
    const data = jsonSafe(text);
    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    const aborted = e?.name === "AbortError";
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : "Upstream error",
        upstream: e?.message || String(e),
      },
      { status: aborted ? 504 : 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
