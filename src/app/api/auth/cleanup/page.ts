// app/api/auth/cleanup/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // optional but fine

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", "", { path: "/", maxAge: 0 });
  return res;
}
