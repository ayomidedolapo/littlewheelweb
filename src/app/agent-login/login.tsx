/* app/login/page.tsx (or wherever you mount it) */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

function toNgE164(localish: string) {
  const d = localish.replace(/\D/g, "");
  const local = d.startsWith("0") ? d.slice(1) : d;
  return `+234${local}`;
}

export default function MobileLogin() {
  const router = useRouter();

  const [phone, setPhone] = useState(""); // local digits only (10/11)
  const [password, setPassword] = useState(""); // 5-digit PIN
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
            : Math.random().toString(36).slice(2) + Date.now().toString(36);
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

  const gotoSignup = () => router.push("/agent-signup");

  // Persists server-side HttpOnly cookie for cross-device sessions
  async function persistAuthCookie(token: string) {
    const resp = await fetch("/api/auth/persist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // cookies are set by the route; no need to include credentials here
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
      // 1) Call your backend-facing login route
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // no token yet, so no credentials needed; the route will talk to your backend
        body: JSON.stringify({
          phoneNumber: e164,
          password,
          deviceToken,
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
          "Login failed";
        setErr(String(msg));
        setSending(false);
        return;
      }

      // 2) Extract token from whatever your backend returns
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

      // 3) Persist HttpOnly cookie so all future requests are authenticated (cross-device)
      await persistAuthCookie(token);

      // (Optional) keep a client copy ONLY for legacy pages still reading localStorage
      try {
        localStorage.setItem("authToken", token);
        localStorage.setItem("lw_token", token);
      } catch {}

      // 4) Go to app home (your authenticated area)
      router.replace("/dash");
    } catch (e: any) {
      setErr(e?.message || "Network error. Please try again.");
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-0 md:p-4">
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-end items-center p-4 pt-6 bg-white">
          <button
            onClick={gotoSignup}
            className="text-gray-600 text-xs font-bold underline hover:text-gray-800 transition-colors"
          >
            Signup account
          </button>
        </div>

        {/* Main */}
        <div className="px-6 py-4 bg-white">
          {/* Greeting */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gray-300 rounded-full overflow-hidden flex items-center justify-center relative">
              <Image
                src="/images/user-avatar.jpg"
                alt="User Avatar"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-md font-bold text-gray-800">
              Hi <span className="text-xl">👋</span>
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
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 11) setPhone(value);
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="flex-1 bg-transparent text-gray-700 placeholder-gray-400 outline-none text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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
                  const v = e.target.value.replace(/\D/g, "").slice(0, 5);
                  setPassword(v);
                }}
                className="w-full bg-gray-100 rounded-xl px-3 py-3 text-gray-700 placeholder-gray-400 outline-none pr-10 text-sm tracking-widest"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                aria-invalid={!pinValid}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
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
                onClick={() => router.push("/forgot-pin")}
                className="text-gray-600 text-xs font-bold underline hover:text-gray-800 transition-colors"
              >
                Forgot Login Pin
              </button>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-[120px]" />

          {/* Login */}
          <div className="pb-4">
            <button
              onClick={handleLogin}
              className={`w-full font-semibold py-3 px-6 rounded-xl transition-colors text-sm ${
                formValid && !sending
                  ? "bg-black hover:bg-black/90 text-white"
                  : "bg-gray-300 text-gray-700 cursor-not-allowed"
              }`}
              disabled={!formValid || sending}
            >
              {sending ? "Logging in…" : "Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
