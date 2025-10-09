export const clean = (s = "") => s.replace(/\/+$/, "");
const RAW_BASE =
  process.env.API_BASE ||
  process.env.VITE_API_BASE || // optional alias
  process.env.VITE_API || // if you must keep it for now
  "";

export const API_BASE = clean(RAW_BASE);
export const API_VERSION = (process.env.API_VERSION || "v1").replace(
  /^\/+|\/+$/g,
  ""
);
export const V1 = API_BASE ? `${API_BASE}/${API_VERSION}` : "";
export const V2 = API_BASE ? `${API_BASE}/v2` : "";
export const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45_000);

/* Back-compat for old code using BACKEND_API_URL(_V2) */
export const BACKEND_API_URL_COMPAT = process.env.BACKEND_API_URL || V1;
export const BACKEND_API_URL_V2_COMPAT = process.env.BACKEND_API_URL_V2 || V2;
