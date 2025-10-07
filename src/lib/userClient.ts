// lib/userClient.ts (client-only helper)

export type UpdateUserPayload = {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  avatarUrl?: string;
  username?: string;
};

type UpdateUserResponse<T = any> = {
  success?: boolean;
  message?: string;
  user?: T;
  data?: T;
  [k: string]: any;
};

function sanitizePatch(input: UpdateUserPayload): UpdateUserPayload {
  const out: UpdateUserPayload = {};
  (Object.keys(input) as (keyof UpdateUserPayload)[]).forEach((k) => {
    const v = input[k];
    if (v === undefined || v === null) return;
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length === 0) return; // drop empty strings
      (out as any)[k] = t;
    } else {
      (out as any)[k] = v;
    }
  });
  return out;
}

function getToken(): string {
  try {
    return localStorage.getItem("lw_token") || "";
  } catch {
    return "";
  }
}

/**
 * PATCH /api/user
 * Sends partial profile updates.
 * - Uses cookie auth if present
 * - Also forwards token via x-lw-auth (fallback for when cookie isn’t set)
 */
export async function updateUserProfile(
  patch: UpdateUserPayload,
  opts?: { signal?: AbortSignal }
) {
  const body = sanitizePatch(patch);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const tok = getToken();
  if (tok) headers["x-lw-auth"] = tok;

  const res = await fetch("/api/user", {
    method: "PATCH",
    headers,
    credentials: "include", // allow cookie-based auth too
    body: JSON.stringify(body),
    cache: "no-store",
    signal: opts?.signal,
  });

  const text = await res.text();
  let data: UpdateUserResponse;
  try {
    data = (text ? JSON.parse(text) : {}) as UpdateUserResponse;
  } catch {
    data = { success: false, message: text || res.statusText };
  }

  if (!res.ok || data?.success === false) {
    const msg =
      data?.message ||
      (data as any)?.error ||
      `Update failed (HTTP ${res.status})`;
    throw new Error(msg);
  }

  // normalize return value to the updated user object
  return (data.user ?? data.data ?? data) as any;
}
