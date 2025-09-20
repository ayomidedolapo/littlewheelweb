// app/api/auth/signup-v2/route.ts
import { NextResponse } from "next/server";

function joinUrl(base: string, path: string) {
  const b = (base || "").replace(/\/+$/, "");
  const p = (path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

const V2 = (process.env.BACKEND_API_URL_V2 || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);

export async function POST(req: Request) {
  console.log("=== SIGNUP V2 ROUTE START ===");

  if (!V2) {
    console.error(
      "Missing BACKEND_API_URL_V2:",
      process.env.BACKEND_API_URL_V2
    );
    return NextResponse.json(
      { success: false, message: "Missing BACKEND_API_URL_V2 env" },
      { status: 500 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
    console.log("Parsed request body:", {
      ...body,
      phoneOtp: body.phoneOtp ? "[REDACTED]" : undefined,
      emailOtp: body.emailOtp ? "[REDACTED]" : undefined,
    });
  } catch (parseError) {
    console.error("JSON parse error:", parseError);
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Just pass the body through with minimal changes
  const url = joinUrl(V2, "/auth/signup");
  console.log("Making request to:", url);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: ac.signal,
    });

    console.log("Upstream response status:", upstream.status);

    const text = await upstream.text();
    console.log("Upstream response text length:", text.length);

    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (jsonError) {
      console.error("Failed to parse upstream response as JSON:", jsonError);
      data = { message: text || upstream.statusText };
    }

    console.log("Parsed upstream data:", data);

    // Return the response
    const resp = NextResponse.json(data, { status: upstream.status });

    console.log("=== SIGNUP V2 ROUTE END ===");
    return resp;
  } catch (fetchError: any) {
    console.error("Fetch error:", fetchError);
    const aborted = fetchError?.name === "AbortError";

    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : fetchError?.message || "Upstream fetch failed",
        error: fetchError?.message,
      },
      { status: aborted ? 504 : 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
