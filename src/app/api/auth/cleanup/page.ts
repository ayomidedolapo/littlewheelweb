// app/api/auth/cleanup/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Unset all auth/session cookies with consistent options
  const secure = process.env.NODE_ENV === "production";
  const baseOpts = {
    path: "/",
    sameSite: "lax" as const,
    secure,
    httpOnly: true,
    maxAge: 0, // expire immediately
  };

  res.cookies.set("token", "", baseOpts);
  res.cookies.set("lw_token", "", baseOpts);
  res.cookies.set("lw_signup_session", "", baseOpts);

  return res;
}
