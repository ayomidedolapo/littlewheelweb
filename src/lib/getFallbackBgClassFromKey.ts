// lib/getFallbackBgClassFromKey.ts
export const avatarBgColors = [
  "bg-[#ef4444]",
  "bg-[#22c55e]",
  "bg-[#3b82f6]",
  "bg-[#eab308]",
  "bg-[#ec4899]",
  "bg-[#a855f7]",
  "bg-[#f97316]",
  "bg-[#14b8a6]",
  "bg-[#6366f1]",
  "bg-[#f43f5e]",
  "bg-[#10b981]",
  "bg-[#8b5cf6]",
  "bg-[#06b6d4]",
  "bg-[#84cc16]",
  "bg-[#f59e0b]",
  "bg-[#0ea5e9]",
  "bg-[#e11d48]",
  "bg-[#3f6212]",
  "bg-[#1d4ed8]",
  "bg-[#7c3aed]",
];

function getConsistentAvatarColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarBgColors.length;
  return avatarBgColors[index];
}

export function getFallbackBgClassFromKey(key?: string): string {
  if (!key?.trim()) return "bg-[#1B75BC]";
  return getConsistentAvatarColor(key);
}
