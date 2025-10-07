import { NextResponse } from "next/server";

/* helpers */
const trimTrailingSlash = (s: string) => (s || "").replace(/\/+$/, "");
const joinUrl = (base: string, path: string) =>
  `${trimTrailingSlash(base)}/${String(path || "").replace(/^\/+/, "")}`;
const readHeaderSessionId = (h: Headers) =>
  h.get("x-session-id") || h.get("x-lw-session-id") || "";

function setSessionCookie(res: NextResponse, sessionId: string) {
  if (!sessionId) return;
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("lw_signup_session", sessionId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure,
    maxAge: 60 * 60 * 24,
  });
}

/** Always normalize to +234XXXXXXXXXX */
const toE164Plus234 = (raw?: string) => {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("234")) return `+${d}`;
  if (d.startsWith("0")) return `+234${d.slice(1)}`;
  return `+234${d}`;
};

/* config */
const V2 = trimTrailingSlash(process.env.BACKEND_API_URL_V2 || "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

export async function POST(req: Request) {
  if (!V2) {
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL_V2 env" },
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
      { success: false, message: "Invalid or missing step (1..5 required)" },
      { status: 400 }
    );
  }

  const incomingSession =
    String(body?.sessionId || "").trim() ||
    req.headers.get("x-session-id") ||
    "";

  const payload: any = { step };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (incomingSession) {
    payload.sessionId = incomingSession;
    headers["x-session-id"] = incomingSession;
  }

  switch (step) {
    case 1: {
      const pn = toE164Plus234(body?.phoneNumber);
      if (!pn) {
        return NextResponse.json(
          { success: false, message: "phoneNumber required for step 1" },
          { status: 400 }
        );
      }
      payload.phoneNumber = pn; // *** +234xxxx ***
      break;
    }
    case 2: {
      const code = String(body?.phoneOtp || "");
      if (!code) {
        return NextResponse.json(
          { success: false, message: "phoneOtp required for step 2" },
          { status: 400 }
        );
      }
      payload.phoneOtp = code;
      break;
    }
    case 3: {
      const em = String(body?.email || "")
        .trim()
        .toLowerCase();
      if (!em) {
        return NextResponse.json(
          { success: false, message: "email required for step 3" },
          { status: 400 }
        );
      }
      payload.email = em;
      break;
    }
    case 4: {
      const code = String(body?.emailOtp || "");
      if (!code) {
        return NextResponse.json(
          { success: false, message: "emailOtp required for step 4" },
          { status: 400 }
        );
      }
      payload.emailOtp = code;
      break;
    }
    case 5: {
      const pn = toE164Plus234(body?.phoneNumber);
      const em = String(body?.email || "")
        .trim()
        .toLowerCase();
      if (!pn || !em) {
        return NextResponse.json(
          {
            success: false,
            message: "phoneNumber and email required for step 5",
          },
          { status: 400 }
        );
      }
      payload.phoneNumber = pn; // *** +234xxxx ***
      payload.email = em;
      payload.role = String(body?.role || "AGENT");
      payload.mode = String(body?.mode || "SELF_CREATED");
      if (body?.deviceToken) payload.deviceToken = String(body.deviceToken);
      break;
    }
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);
  const url = joinUrl(V2, "/auth/signup");

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
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { message: raw || upstream.statusText };
    }

    const headerSession = readHeaderSessionId(upstream.headers);
    const bodySession = data?.sessionId || data?.data?.sessionId || null;
    const finalSession = bodySession || headerSession || incomingSession || "";

    const resp = NextResponse.json(
      { ...data, sessionId: finalSession || undefined },
      { status: upstream.status }
    );

    // forward any set-cookie headers
    const anyHeaders = upstream.headers as any;
    const setCookies =
      anyHeaders.getSetCookie?.() ||
      anyHeaders.raw?.()["set-cookie"] ||
      (upstream.headers.get("set-cookie")
        ? [upstream.headers.get("set-cookie")]
        : []);
    (setCookies || [])
      .filter(Boolean)
      .forEach((c: string) => resp.headers.append("set-cookie", c));

    if (finalSession) setSessionCookie(resp, finalSession);

    return resp;
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Upstream fetch failed",
      },
      { status: aborted ? 504 : 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
