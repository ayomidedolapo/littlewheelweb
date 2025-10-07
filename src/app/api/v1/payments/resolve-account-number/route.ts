import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const PATH = "/payments/resolve-account-number";
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 20000);

function redact(s: string) {
  if (!s) return "MISSING";
  return `[len:${s.length}] ${s.slice(0, 2)}…${s.slice(-2)}`;
}

async function readBearer(req: NextRequest) {
  const jar = await cookies();
  const auth = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const x = (req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const ck =
    jar.get("lw_token")?.value ||
    jar.get("authToken")?.value ||
    jar.get("session")?.value ||
    "";
  return auth || x || ck || "";
}

export async function GET(req: NextRequest) {
  try {
    if (!API_BASE) {
      return NextResponse.json(
        { success: false, message: "Missing BACKEND_API_URL" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const accountNumber = (searchParams.get("accountNumber") || "").replace(
      /\D/g,
      ""
    );
    const bankCode = String(searchParams.get("bankCode") || "").trim();

    if (!accountNumber || accountNumber.length !== 10 || !bankCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide 10-digit accountNumber and a valid bankCode.",
        },
        { status: 400 }
      );
    }

    const bearer = await readBearer(req);
    const upstreamUrl = `${API_BASE}${PATH}?accountNumber=${encodeURIComponent(
      accountNumber
    )}&bankCode=${encodeURIComponent(bankCode)}`;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

    console.log("[resolve-account-number] ->", {
      upstream: upstreamUrl,
      token: redact(bearer),
    });

    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        ...(bearer
          ? { Authorization: `Bearer ${bearer}`, "x-lw-auth": bearer }
          : {}),
        Accept: "application/json",
      },
      cache: "no-store",
      signal: ac.signal,
    });

    clearTimeout(timer);

    const text = await upstream.text();
    try {
      const json = text ? JSON.parse(text) : null;
      return NextResponse.json(json, { status: upstream.status });
    } catch {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? `Resolver timed out after ${TIMEOUT_MS}ms`
          : "Unexpected error",
      },
      { status: aborted ? 504 : 500 }
    );
  }
}
