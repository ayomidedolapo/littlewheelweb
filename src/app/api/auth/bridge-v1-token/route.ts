// app/api/auth/bridge-v1-token/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const phoneNumber = String(body?.phoneNumber || "").trim();
  const otp = String(body?.otp || "").trim();

  console.log(
    "Bridge V1 request - but V1 has no OTP endpoint, using V2 token approach"
  );

  // Based on your Swagger, V1 doesn't have an OTP verification endpoint
  // The V2 signup flow should already return a token that works with V1
  // So this bridge is mainly for token persistence/format conversion

  // In reality, we should already have the token from the V2 verification
  // This endpoint will just acknowledge the request and return success
  // The real token should come from your V2 signup verification

  return NextResponse.json({
    success: true,
    message: "V1 bridge acknowledged - using V2 token for V1 endpoints",
    note: "V1 API has no OTP endpoint, using V2 token for V1 requests",
  });
}
