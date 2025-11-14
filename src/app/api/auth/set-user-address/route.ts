// app/api/auth/set-user-address/route.ts
import { NextRequest, NextResponse } from "next/server";

const BASE_V1 = (process.env.BACKEND_API_URL || "https://dev-api.insider.littlewheel.app/v1").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

/** Read Turnstile token from headers or body (presence check only) */
function readTurnstileToken(req: NextRequest, body: any) {
  const hdr =
    req.headers.get("cf-turnstile-response") ||
    req.headers.get("x-turnstile-token") ||
    "";
  const inBody =
    String(
      body?.captchaToken ||
        body?.turnstileToken ||
        body?.["cf-turnstile-response"] ||
        ""
    ).trim() || "";
  return (hdr || "").trim() || inBody;
}

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

  // ✅ Only check that a Turnstile token is present; V1 will verify it
  const tsToken = readTurnstileToken(req, body);
  if (!tsToken) {
    return NextResponse.json(
      { success: false, message: "Missing Turnstile token" },
      { status: 400 }
    );
  }

  // Keep only expected fields + forward captcha token for V1
  const payload = {
    country: body?.country ?? "",
    state: body?.state ?? "",
    city: body?.city ?? "",
    lga: body?.lga ?? body?.localGovernment ?? "",
    address: body?.address ?? "",

    // 🔑 forward Turnstile token so V1 can verify it
    "cf-turnstile-response": tsToken,
    captchaToken: tsToken,
    turnstileToken: tsToken,
  };

  // Auth: Authorization > x-lw-auth > cookies
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
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

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

    // Bubble up upstream status verbatim so client can branch on 401/403/etc.
    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
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
