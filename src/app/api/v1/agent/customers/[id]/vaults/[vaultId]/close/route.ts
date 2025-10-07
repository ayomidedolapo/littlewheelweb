// app/api/v1/agent/customers/[id]/vaults/[vaultId]/close/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");

// Next 13/14 & 15-safe accessors
async function getCookieStore() {
  const maybe = (cookiesFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}
async function getHeadersStore() {
  const maybe = (headersFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

async function getBearer(req: NextRequest) {
  const jar = await getCookieStore();
  const hdrs = await getHeadersStore();

  const cookieTok =
    jar?.get?.("lw_auth")?.value ||
    jar?.get?.("lw_token")?.value ||
    jar?.get?.("authToken")?.value ||
    jar?.get?.("token")?.value ||
    jar?.get?.("session")?.value ||
    "";

  const auth = (
    hdrs.get("authorization") ||
    req.headers.get("authorization") ||
    ""
  )
    .replace(/^Bearer\s+/i, "")
    .trim();

  const x = (hdrs.get("x-lw-auth") || req.headers.get("x-lw-auth") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  return cookieTok || auth || x || "";
}

export async function DELETE(
  req: NextRequest,
  ctx: {
    params:
      | Promise<{ id: string; vaultId: string }>
      | { id: string; vaultId: string };
  }
) {
  if (!API_BASE) {
    return NextResponse.json(
      { error: "Missing BACKEND_API_URL" },
      { status: 500 }
    );
  }

  const { id, vaultId } =
    typeof (ctx.params as any)?.then === "function"
      ? await (ctx.params as any)
      : (ctx.params as any);

  const token = await getBearer(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = `${API_BASE}/agent/customers/${encodeURIComponent(
    id
  )}/vaults/${encodeURIComponent(vaultId)}/close`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "x-lw-auth": token,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json",
    },
  });
}
