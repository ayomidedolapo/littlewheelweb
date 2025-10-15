/* app/login/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import LogoSpinner from "../../components/loaders/LogoSpinner";

/* ---------- Turnstile (invisible execute) ---------- */
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

function ensureTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    const w = window as any;
    if (w.turnstile && typeof w.turnstile.execute === "function")
      return resolve();

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-lw="turnstile"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    s.defer = true;
    s.setAttribute("data-lw", "turnstile");
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

async function getTurnstileToken(action: string): Promise<string | null> {
  try {
    if (!TURNSTILE_SITE_KEY) return null;
    await ensureTurnstileScript();
    const w = window as any;
    if (!w.turnstile || typeof w.turnstile.execute !== "function") return null;
    const token: string = await w.turnstile
      .execute(TURNSTILE_SITE_KEY, { action })
      .catch(() => null);
    return token && typeof token === "string" ? token : null;
  } catch {
    return null;
  }
}
/* ---------- /Turnstile ---------- */

function toNgE164(localish: string) {
  const d = localish.replace(/\D/g, "");
  const local = d.startsWith("0") ? d.slice(1) : d;
  return `+234${local}`;
}

/* avatar helpers */
function isBareBase64Jpeg(s?: string) {
  return !!s && /^\/9j\//.test(s);
}
function looksLikeDataUrl(s?: string) {
  return !!s && /^data:image\/[a-z]+;base64,/i.test(s || "");
}
function normalizeImgSrc(u?: string) {
  if (!u) return "";
  if (looksLikeDataUrl(u)) return u;
  if (isBareBase64Jpeg(u)) return `data:image/jpeg;base64,${u}`;
  return u;
}

export default function MobileLogin() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [lastAvatar, setLastAvatar] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");

  useEffect(() => {
    try {
      const a =
        localStorage.getItem("lw_last_avatar") ||
        sessionStorage.getItem("lw_last_avatar") ||
        "";
      const n =
        localStorage.getItem("lw_last_name") ||
        sessionStorage.getItem("lw_last_name") ||
        "";
      setLastAvatar(normalizeImgSrc(a || ""));
      setLastName((n || "").trim());
    } catch {}
  }, []);

  // persistent device token
  const [deviceToken, setDeviceToken] = useState("web-client");
  useEffect(() => {
    try {
      const existing = localStorage.getItem("lw_device_token");
      if (existing) setDeviceToken(existing);
      else {
        const gen =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(0, 10) + Date.now().toString(36);
        localStorage.setItem("lw_device_token", gen);
        setDeviceToken(gen);
      }
    } catch {}
  }, []);

  const phoneValid = useMemo(() => {
    const d = phone.replace(/\D/g, "");
    return d.length >= 10 && d.length <= 11;
  }, [phone]);

  const pinValid = useMemo(() => /^\d{5}$/.test(password), [password]);
  const formValid = phoneValid && pinValid;

  const goSignup = async () => {
    if (sending) return;
    setSending(true);
    router.push("/agent-signup");
  };

  const goForgotPin = async () => {
    if (sending) return;
    setSending(true);
    router.push("/forgot-pin");
  };

  async function persistAuthCookie(token: string) {
    const resp = await fetch("/api/auth/persist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`Persist cookie failed (${resp.status}): ${t}`);
    }
  }

  const handleLogin = async () => {
    if (!formValid || sending) return;
    setSending(true);
    setErr(null);

    const e164 = toNgE164(phone);

    try {
      /* 🔐 fetch Turnstile token for login */
      const captchaToken = await getTurnstileToken("login");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: e164,
          password,
          deviceToken,
          ...(captchaToken ? { captchaToken } : {}),
        }),
      });

      const raw = await res.text();
      const data: any = (() => {
        try {
          return JSON.parse(raw);
        } catch {
          return { message: raw };
        }
      })();

      if (!res.ok || data?.success === false) {
        const msg =
          data?.message?.message ||
          data?.message ||
          data?.error ||
          (res.status === 403
            ? "Verification failed. Try again."
            : "Login failed");
        setErr(String(msg));
        setSending(false);
        return;
      }

      const token =
        data?.token ||
        data?.access_token ||
        data?.data?.token ||
        data?.data?.access_token ||
        data?.jwt ||
        null;

      if (!token) {
        setErr("No token returned from backend.");
        setSending(false);
        return;
      }

      await persistAuthCookie(token);

      try {
        localStorage.setItem("authToken", token);
        localStorage.setItem("lw_token", token);
      } catch {}

      // Best-effort profile fetch to cache name/avatar
      try {
        const meRes = await fetch("/api/user/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });
        if (meRes.ok) {
          const meRaw = await meRes.text();
          let me: any = {};
          try {
            me = JSON.parse(meRaw || "{}");
          } catch {}
          const userData = me?.user || me?.data || me || {};
          const avatarUrl = normalizeImgSrc(
            userData.avatarUrl || userData.avatar_url || userData.avatar || ""
          );
          const firstName =
            userData.firstName ||
            userData.first_name ||
            userData.username ||
            "";
          try {
            if (avatarUrl) {
              localStorage.setItem("lw_last_avatar", avatarUrl);
              sessionStorage.setItem("lw_last_avatar", avatarUrl);
            } else {
              localStorage.removeItem("lw_last_avatar");
              sessionStorage.removeItem("lw_last_avatar");
            }
            if (firstName) {
              localStorage.setItem("lw_last_name", String(firstName));
              sessionStorage.setItem("lw_last_name", String(firstName));
            }
          } catch {}
        }
      } catch {}

      router.replace("/dash");
    } catch (e: any) {
      setErr(e?.message || "Network error. Please try again.");
      setSending(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-100 flex items-center justify-center p-0 md:p-4"
      aria-busy={sending}
    >
      {/* Centered overlay spinner for ALL actions */}
      <LogoSpinner show={sending} />

      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-end items-center p-4 pt-6 bg-white">
          <button
            onClick={goSignup}
            disabled={sending}
            className="text-gray-600 text-xs font-bold underline hover:text-gray-800 transition-colors disabled:text-gray-400"
          >
            Signup account
          </button>
        </div>

        {/* Main */}
        <div className="px-6 py-4 bg-white">
          {/* Greeting */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gray-300 rounded-full overflow-hidden flex items-center justify-center relative">
              {lastAvatar ? (
                <Image
                  src={lastAvatar}
                  alt="Last user avatar"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <Image
                  src="/images/user-avatar.jpg"
                  alt="User Avatar"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <span className="text-md font-bold text-gray-800">
              Hi{lastName ? `, ${lastName}` : ""}{" "}
              <span className="text-xl">👋</span>
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>

          {err && (
            <p className="mb-3 text-[12px] text-rose-600" role="alert">
              {err}
            </p>
          )}

          {/* Phone */}
          <div className="mb-5">
            <label className="text-gray-700 font-bold mb-2 block text-sm">
              Mobile Number
            </label>

            <div className="flex gap-2">
              <div className="flex items-center bg-gray-100 rounded-xl px-3 py-3 min-w-fit">
                <div className="w-5 h-5 rounded-full overflow-hidden mr-2 flex items-center justify-center bg-white">
                  <Image
                    src="https://flagpedia.net/data/flags/w580/ng.png"
                    alt="Nigeria Flag"
                    width={24}
                    height={24}
                    className="w-full h-full"
                  />
                </div>
                <span className="text-gray-700 font-bold text-sm">+234</span>
              </div>

              <div className="flex-1">
                <div className="flex items-center bg-gray-100 rounded-xl px-3 py-3">
                  <input
                    type="tel"
                    placeholder="000-0000-000"
                    value={phone}
                    onChange={(e) => {
                      if (sending) return;
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 11) setPhone(value);
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    disabled={sending}
                    className="flex-1 bg-transparent text-gray-700 placeholder-gray-400 outline-none text-sm disabled:cursor-not-allowed"
                    onKeyDown={(e) =>
                      !sending && e.key === "Enter" && handleLogin()
                    }
                    aria-invalid={!phoneValid}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="mb-5">
            <label className="text-gray-700 font-bold mb-2 block text-sm">
              Password (5-digit PIN)
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="•••••"
                value={password}
                onChange={(e) => {
                  if (sending) return;
                  const v = e.target.value.replace(/\D/g, "").slice(0, 5);
                  setPassword(v);
                }}
                className="w-full bg-gray-100 rounded-xl px-3 py-3 text-gray-700 placeholder-gray-400 outline-none pr-10 text-sm tracking-widest disabled:cursor-not-allowed"
                onKeyDown={(e) =>
                  !sending && e.key === "Enter" && handleLogin()
                }
                aria-invalid={!pinValid}
                disabled={sending}
              />
              <button
                type="button"
                onClick={() => !sending && setShowPassword((s) => !s)}
                disabled={sending}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 disabled:text-gray-300"
                aria-label={showPassword ? "Hide PIN" : "Show PIN"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="text-right mt-2">
              <button
                onClick={goForgotPin}
                disabled={sending}
                className="text-gray-600 text-xs font-bold underline hover:text-gray-800 transition-colors disabled:text-gray-400"
              >
                Forgot Login Pin
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[120px]" />

          <div className="pb-4">
            <button
              onClick={handleLogin}
              className={`w-full font-semibold py-3 px-6 rounded-xl transition-colors text-sm ${
                formValid && !sending
                  ? "bg-black hover:bg-black/90 text-white"
                  : "bg-gray-300 text-gray-700 cursor-not-allowed"
              }`}
              disabled={!formValid || sending}
              aria-busy={sending}
            >
              {sending ? "Logging in…" : "Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
