import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ROOT = (process.env.NEXT_PUBLIC_SWAGGER_API_BASE_URL || "").replace(
  /\/+$/,
  ""
);
const V1 = (process.env.BACKEND_API_URL_V1 || `${ROOT}/v1`).replace(/\/+$/, "");

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const store = cookies();
    const cookieToken =
      store.get("token")?.value || store.get("lw_token")?.value;
    const token: string | undefined = body?.token || cookieToken;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "token required" },
        { status: 401 }
      );
    }

    const r = await fetch(`${V1}/auth/resend-otp`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await r.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {}

    if (!r.ok) {
      const message =
        data?.message || data?.error || `Upstream ${r.status} ${r.statusText}`;
      return NextResponse.json(
        { success: false, message, upstream: data },
        { status: r.status }
      );
    }

    const otp =
      data?.otp ||
      data?.data?.otp ||
      data?.data?.code ||
      data?.data?.phoneOtp ||
      null;
    return NextResponse.json({ success: true, otp, data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "Network error" },
      { status: 500 }
    );
  }
}
