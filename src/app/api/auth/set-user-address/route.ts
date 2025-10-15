// app/api/auth/set-user-address/route.ts
import { NextRequest, NextResponse } from "next/server";

const BASE_V1 =
  process.env.BACKEND_API_URL || "https://dev-api.insider.littlewheel.app/v1";

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

export async function POST(req: NextRequest) {
  // read body from client
  const body = await req.json().catch(() => ({} as any));

  /* 🔐 Enforce Turnstile (recommended for this step) */
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
  // (Optional hardening) if client used action: "signup_address"
  // const { action, hostname } = verdict.data || {};
  // if (action !== "signup_address") return NextResponse.json({ success:false, message:"Bad action" }, { status: 403 });

  // keep only the fields swagger expects
  const payload = {
    country: body?.country ?? "",
    state: body?.state ?? "",
    city: body?.city ?? "",
    lga: body?.lga ?? body?.localGovernment ?? "",
    address: body?.address ?? "",
  };

  // auth: prefer x-lw-auth header, fall back to lw_token cookie
  const headerToken = req.headers.get("x-lw-auth");
  const cookieToken = req.cookies.get("lw_token")?.value;
  const token =
    headerToken && headerToken !== "undefined" ? headerToken : cookieToken;

  // forward session id if present (your client sends it)
  const sessionId = req.headers.get("x-session-id") || body?.sessionId || "";

  const url = `${BASE_V1.replace(/\/$/, "")}/auth/set-user-address`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(sessionId ? { "x-session-id": sessionId } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await r.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { upstream: text };
    }

    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Upstream error",
        upstream: e?.message || String(e),
      },
      { status: 502 }
    );
  }
}
