// app/api/auth/get-v1-token/route.ts
import { NextResponse } from "next/server";

const V2 = (process.env.BACKEND_API_URL_V2 || "").replace(/\/+$/, "");
const V1 = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

export async function POST(req: Request) {
  console.log("=== GET V1 TOKEN ROUTE ===");

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const sessionId = body.sessionId;
  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: "sessionId required" },
      { status: 400 }
    );
  }

  console.log("Attempting to get V1 token with sessionId:", sessionId);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  // Try multiple endpoints that might convert sessionId to token
  const possibleEndpoints = [
    `${V2}/auth/get-token`,
    `${V2}/auth/session-to-token`,
    `${V1}/auth/session-login`,
    `${V1}/auth/convert-session`,
    `${V2}/auth/complete-signup`,
    `${V1}/auth/complete-signup`,
  ];

  try {
    let lastError = null;

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

        // Look for token in response
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

          // Set cookie
          const secure =
            process.env.NODE_ENV === "production" ? "Secure; " : "";
          resp.headers.set(
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
        lastError = { endpoint, error: fetchError };
        continue;
      }
    }

    // If no endpoint worked, return the last error
    return NextResponse.json(
      {
        success: false,
        message: "Could not get V1 token from any endpoint",
        lastError,
        sessionId,
      },
      { status: 400 }
    );
  } catch (e: any) {
    console.error("Get V1 token error:", e);
    return NextResponse.json(
      {
        success: false,
        message: e?.message || "Failed to get V1 token",
      },
      { status: 500 }
    );
  } finally {
    clearTimeout(timer);
  }
}
