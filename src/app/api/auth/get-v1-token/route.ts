// app/api/auth/get-v1-token/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const V2 = (process.env.BACKEND_API_URL_V2 || "").replace(/\/+$/, "");
const V1 = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

export async function POST(req: Request) {
  console.log("=== GET V1 TOKEN ROUTE ===");

  // 0) If we already have a HttpOnly token cookie, just return it.
  try {
    const jar = cookies();
    const cookieToken =
      jar.get("lw_token")?.value ||
      jar.get("lw_auth")?.value ||
      jar.get("token")?.value ||
      "";

    if (cookieToken) {
      console.log(
        "Found HttpOnly cookie token; returning without upstream call."
      );
      const resp = NextResponse.json({
        success: true,
        token: cookieToken,
        message: "V1 token from cookie",
        endpoint: "cookie",
      });

      // refresh cookie (optional)
      const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
      resp.headers.append(
        "Set-Cookie",
        `lw_token=${encodeURIComponent(
          cookieToken
        )}; Path=/; ${secure}HttpOnly; SameSite=Lax; Max-Age=86400`
      );

      return resp;
    }
  } catch (e) {
    console.log("Cookie read error (non-fatal):", e);
  }

  // 1) Parse body
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const sessionId = (body.sessionId || "").trim();
  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: "sessionId required (no cookie token found)" },
      { status: 400 }
    );
  }

  console.log("Attempting to get V1 token with sessionId:", sessionId);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  // 2) Try known/guess endpoints only if we have no cookie token
  const possibleEndpoints = [
    V2 && `${V2}/auth/get-token`,
    V2 && `${V2}/auth/session-to-token`,
    V1 && `${V1}/auth/session-login`,
    V1 && `${V1}/auth/convert-session`,
    V2 && `${V2}/auth/complete-signup`,
    V1 && `${V1}/auth/complete-signup`,
  ].filter(Boolean) as string[];

  try {
    let lastError: any = null;

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Trying: ${endpoint}`);

        const r = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId,
          },
          body: JSON.stringify({ sessionId }),
          signal: ac.signal,
        });

        const text = await r.text();
        let data: any;
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { message: text || r.statusText };
        }

        console.log(`${endpoint} response:`, { status: r.status, data });

        const token =
          data?.token ||
          data?.access_token ||
          data?.data?.token ||
          data?.data?.access_token;

        if (r.ok && token) {
          console.log(`SUCCESS: Got token from ${endpoint}`);

          const resp = NextResponse.json({
            success: true,
            token,
            message: "V1 token acquired",
            endpoint,
          });

          const secure =
            process.env.NODE_ENV === "production" ? "Secure; " : "";
          resp.headers.append(
            "Set-Cookie",
            `lw_token=${encodeURIComponent(
              token
            )}; Path=/; ${secure}HttpOnly; SameSite=Lax; Max-Age=86400`
          );

          return resp;
        }

        lastError = { endpoint, status: r.status, data };
      } catch (fetchError) {
        console.log(`Error with ${endpoint}:`, fetchError);
        lastError = { endpoint, error: String(fetchError) };
        continue;
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not get V1 token from any endpoint (and no cookie token present)",
        lastError,
        sessionId,
        tried: possibleEndpoints,
      },
      { status: 400 }
    );
  } catch (e: any) {
    console.error("Get V1 token error:", e);
    return NextResponse.json(
      { success: false, message: e?.message || "Failed to get V1 token" },
      { status: 500 }
    );
  } finally {
    clearTimeout(timer);
  }
}
