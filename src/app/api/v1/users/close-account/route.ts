/* app/api/v1/users/close-account/route.ts */
import { NextRequest, NextResponse } from "next/server";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const UPSTREAM = `${API_BASE}/v1/users/close-account`;
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

function json(d: any, s = 200, extra: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(d), {
    status: s,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...extra,
    },
  });
}

/** CORS (if you hit this route directly from the app shell/browser) */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-lw-auth",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return json({}, 204, CORS);
}

export async function POST(req: NextRequest) {
  if (!API_BASE) {
    return json({ error: "Missing BACKEND_API_URL" }, 500, CORS);
  }

  // read client token (header preferred, fallback to cookie)
  const incomingHeaderToken = req.headers.get("x-lw-auth");
  const cookieToken =
    req.cookies.get("lw_token")?.value || req.cookies.get("lw_auth")?.value;
  const token = incomingHeaderToken || cookieToken || "";

  // validate body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, CORS);
  }
  const { feedback = "", action } = body || {};
  if (!action || (action !== "DE_ACTIVATE" && action !== "DELETE")) {
    return json(
      { error: "action must be 'DE_ACTIVATE' or 'DELETE'" },
      400,
      CORS
    );
  }

  // forward to upstream
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-lw-auth": token } : {}),
      },
      body: JSON.stringify({ feedback, action }),
      signal: controller.signal,
      // IMPORTANT: if your upstream needs cookies, add: credentials: "include",
    });

    clearTimeout(t);

    // stream upstream response through with same status
    const text = await res.text();
    const isJSON = res.headers
      .get("content-type")
      ?.includes("application/json");
    return new NextResponse(isJSON ? text : JSON.stringify({ data: text }), {
      status: res.status,
      headers: {
        "content-type": isJSON ? "application/json" : "application/json",
        ...CORS,
      },
    });
  } catch (err: any) {
    const aborted = err?.name === "AbortError";
    return json(
      {
        error: aborted ? "Upstream timeout" : "Upstream error",
        detail: String(err?.message || err),
      },
      502,
      CORS
    );
  }
}
