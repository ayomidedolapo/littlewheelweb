// app/api/auth/signup-v2/route.ts

import { NextResponse } from "next/server";

/* ========== helpers ========== */
const trim = (s: string) => (s || "").replace(/\/+$/, "");
const joinUrl = (base: string, path: string) =>
  `${trim(base)}/${String(path || "").replace(/^\/+/, "")}`;
const readHeaderSessionId = (h: Headers) =>
  h.get("x-session-id") || h.get("x-lw-session-id") || "";

/* Normalize phone to +234xxxxxxxx */
const toE164 = (raw?: string) => {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("234")) return `+${d}`;
  if (d.startsWith("0")) return `+234${d.slice(1)}`;
  return `+234${d}`;
};

/* ---------- cookies ---------- */
function setSignupSessionCookie(res: NextResponse, sessionId: string) {
  if (!sessionId) return;
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("lw_signup_session", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

function setSignupTokenCookie(res: NextResponse, token: string) {
  if (!token) return;
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("lw_signup_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

function setDeviceTokenCookie(res: NextResponse, token: string) {
  if (!token) return;
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("lw_device_token", token, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/* ---------- config ---------- */
const V2 = trim(process.env.BACKEND_API_URL_V2 || "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

/* ---------- main handler ---------- */
export async function POST(req: Request) {
  if (!V2) {
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL_V2" },
      { status: 500 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const step = Number(body?.step);
  if (![1, 2, 3, 4, 5].includes(step)) {
    return NextResponse.json(
      { success: false, message: "Invalid step (1-5)" },
      { status: 400 }
    );
  }

  const incomingSession =
    String(body?.sessionId || "").trim() ||
    req.headers.get("x-session-id") ||
    "";

  const deviceToken = String(body?.deviceToken || "").trim();

  const payload: any = { step };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (incomingSession) {
    payload.sessionId = incomingSession;
    headers["x-session-id"] = incomingSession;
  }

  /* ---- step based fields ---- */
  switch (step) {
    case 1: {
      const pn = toE164(body?.phoneNumber);
      if (!pn)
        return NextResponse.json(
          { success: false, message: "phoneNumber required" },
          { status: 400 }
        );
      payload.phoneNumber = pn;
      break;
    }

    case 2: {
      if (!body?.phoneOtp)
        return NextResponse.json(
          { success: false, message: "phoneOtp required" },
          { status: 400 }
        );
      payload.phoneOtp = String(body.phoneOtp);
      break;
    }

    case 3: {
      const email = String(body?.email || "").trim().toLowerCase();
      if (!email)
        return NextResponse.json(
          { success: false, message: "email required" },
          { status: 400 }
        );
      payload.email = email;
      break;
    }

    case 4: {
      if (!body?.emailOtp)
        return NextResponse.json(
          { success: false, message: "emailOtp required" },
          { status: 400 }
        );
      payload.emailOtp = String(body.emailOtp);
      break;
    }

    case 5: {
      const pn = toE164(body?.phoneNumber);
      const em = String(body?.email || "").trim().toLowerCase();

      if (!pn && !em)
        return NextResponse.json(
          {
            success: false,
            message:
              "At least one of phoneNumber or email is required for step 5",
          },
          { status: 400 }
        );

      if (pn) payload.phoneNumber = pn;
      if (em) payload.email = em;

      payload.role = String(body?.role || "AGENT");
      payload.mode = String(body?.mode || "SELF_CREATED");

      if (deviceToken) payload.deviceToken = deviceToken;

      break;
    }
  }

  /* ---- upstream call ---- */
  const url = joinUrl(V2, "/auth/signup");
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: ac.signal,
    });

    const raw = await upstream.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }

    /* ---- normalize sessionId ---- */
    const headerSession = readHeaderSessionId(upstream.headers);
    const bodySession = data?.sessionId || data?.data?.sessionId || null;
    const finalSession =
      bodySession || headerSession || incomingSession || "";

    /* ---- STEP 5 → Extract signup token ---- */
    let signupToken = "";
    if (step === 5) {
      signupToken =
        data?.token ||
        data?.data?.token ||
        data?.data?.accessToken ||
        "";
    }

    const resp = NextResponse.json(
      {
        ...data,
        sessionId: finalSession || undefined,
        signupToken: signupToken || undefined,
      },
      { status: upstream.status }
    );

    /* ---- persist cookies ---- */
    if (finalSession) setSignupSessionCookie(resp, finalSession);

    if (signupToken) setSignupTokenCookie(resp, signupToken);

    if (deviceToken) setDeviceTokenCookie(resp, deviceToken);

    return resp;
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "Upstream error" },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
