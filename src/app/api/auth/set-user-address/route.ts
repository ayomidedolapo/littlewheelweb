import { NextRequest, NextResponse } from "next/server";

const BASE_V1 =
  process.env.BACKEND_API_URL || "https://dev-api.insider.littlewheel.app/v1";

export async function POST(req: NextRequest) {
  // read body from client
  const body = await req.json().catch(() => ({} as any));

  // keep only the fields swagger expects
  const payload = {
    country: body?.country ?? "",
    state: body?.state ?? "",
    city: body?.city ?? "",
    lga: body?.lga ?? body?.localGovernment ?? "",
    address: body?.address ?? "",
  };

  // auth: prefer x-lw-auth header, fall back to lw_token cookie
  const headerToken = req.headers.get("x-lw-auth");
  const cookieToken = req.cookies.get("lw_token")?.value;
  const token =
    headerToken && headerToken !== "undefined" ? headerToken : cookieToken;

  const url = `${BASE_V1.replace(/\/$/, "")}/auth/set-user-address`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await r.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { upstream: text };
    }

    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    return NextResponse.json(
      { message: "Upstream error", upstream: e?.message || String(e) },
      { status: 502 }
    );
  }
}
