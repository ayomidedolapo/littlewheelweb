// lib/userClient.ts (client-only helper)
export type UpdateUserPayload = {
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  avatarUrl?: string;
  username?: string;
};

export async function updateUserProfile(patch: UpdateUserPayload) {
  const res = await fetch("/api/user", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || "Update failed");
  }
  return data;
}
