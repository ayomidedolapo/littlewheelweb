// src/lib/api.ts (Next.js)
const API_V1 = (process.env.NEXT_PUBLIC_API_V1 || "").replace(/\/+$/, "");
const API_V2 = (process.env.NEXT_PUBLIC_API_V2 || "").replace(/\/+$/, "");

type ApiVersion = "v1" | "v2";
const base = (v: ApiVersion = "v1") => (v === "v2" ? API_V2 : API_V1);

export function joinUrl(version: ApiVersion, path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base(version)}${p}`;
}

export const PATH_ME =
  process.env.NEXT_PUBLIC_BACKEND_USER_ME_PATH || "/users/me";
