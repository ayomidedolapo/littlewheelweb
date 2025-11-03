// app/api/auth/get-v1-token/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  console.log("=== GET V1 TOKEN (cookie-only) ===");

  // 0) Return HttpOnly token if we already have it
  try {
    const jar = cookies();
    const cookieToken =
      jar.get("lw_token")?.value ||
      jar.get("lw_auth")?.value ||
      jar.get("token")?.value ||
      "";

    if (cookieToken) {
      const resp = NextResponse.json({
        success: true,
        token: cookieToken,
        message: "V1 token from cookie",
        endpoint: "cookie",
      });

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

  // 1) No upstream probing here — follow the documented flow only.
  //    Token is minted by signup/login + confirm-otp; we don't "convert" sessions.
  return NextResponse.json(
    {
      success: false,
      message:
        "No cookie token present. Obtain a token via the documented flow: /v1|v2/auth/signup → /v1/auth/confirm-otp.",
    },
    { status: 400 }
  );
}
