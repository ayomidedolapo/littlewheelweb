import { NextRequest } from "next/server";

const BASE =
  process.env.BACKEND_API_URL ||
  `${process.env.NEXT_PUBLIC_SWAGGER_API_BASE_URL}${process.env.NEXT_PUBLIC_SWAGGER_API_VERSION}`;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const incoming = new URL(req.url);
  const vaultId = incoming.searchParams.get("vaultId") || "";

  const url = new URL(`${BASE}/agent/customers/${id}/vaults/contributions`);
  if (vaultId) url.searchParams.set("vaultId", vaultId);

  // accept either header name from the client
  const rawAuth =
    req.headers.get("x-lw-auth") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  const headers: Record<string, string> = {};
  if (rawAuth) {
    headers["x-lw-auth"] = rawAuth;
    headers["authorization"] = `Bearer ${rawAuth}`;
  }

  const upstream = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  // pass-through response
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") || "application/json",
      "cache-control": "no-store, must-revalidate",
    },
  });
}
