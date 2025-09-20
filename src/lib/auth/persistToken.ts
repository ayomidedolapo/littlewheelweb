export function persistToken(token?: string | null) {
  if (!token) return;
  try {
    localStorage.setItem("lw_token", token);
  } catch {}
  try {
    document.cookie = `lw_token=${encodeURIComponent(
      token
    )}; Path=/; SameSite=Lax`;
  } catch {}
}
