/* app/login/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import LogoSpinner from "../../components/loaders/LogoSpinner";
import { ReCaptcha } from "../../../components/ReCaptcha";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // 6-digit PIN
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

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

  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email]
  );

  const pinValid = useMemo(() => /^\d{6}$/.test(password), [password]);
  const formValid = emailValid && pinValid;

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

    try {
      // captcha required in production (your route.ts already supports dev-bypass flag)
      if (process.env.NODE_ENV === "production" && !captchaToken) {
        setErr("Please confirm you’re not a robot.");
        setSending(false);
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password, // 6-digit PIN
          deviceToken,
          recaptchaToken: captchaToken,
        }),
      });

      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        data = { message: raw };
      }

      if (!res.ok || data?.success === false) {
        setErr(data?.message || data?.error || "Login failed");
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

      router.replace("/dash");
    } catch (e: any) {
      setErr(e?.message || "Network error.");
      setSending(false);
    }
  };

  const goSignup = () => !sending && router.push("/agent-signup");
  const goForgotPassword = () => !sending && router.push("/forgot-pin");

  return (
    <div className="min-h-screen bg-white flex flex-col py-10" aria-busy={sending}>
      <LogoSpinner show={sending} />

      <div className="w-full flex-1 flex justify-center px-2 lg:px-4">
        <div className="w-full max-w-[1200px]">
          <div className="lg:rounded-2xl lg:border lg:border-gray-100 lg:shadow-sm lg:overflow-hidden bg-white">
            <div className="lg:grid lg:grid-cols-2 lg:min-h-[700px]">
              {/* LEFT PANEL */}
              <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="flex justify-center lg:justify-start pb-4 px-4 lg:px-10 pt-4">
                  <Image
                    src="/uploads/littlewh.png"
                    alt="Little Wheel"
                    width={140}
                    height={36}
                    priority
                  />
                </div>

                {/* MOBILE IMAGE */}
                <div className="block lg:hidden px-4">
                  <Image
                    src="/uploads/coinguy.png"
                    alt="Illustration"
                    width={900}
                    height={520}
                    className="w-full h-auto object-contain"
                    priority
                  />
                </div>

                {/* DESKTOP IMAGE */}
                <div className="hidden lg:flex flex-1 items-center justify-center px-6">
                  <Image
                    src="/uploads/Little wheel onboarding 5 bw 1.png"
                    alt="Onboarding"
                    width={900}
                    height={900}
                    className="max-h-[600px] w-auto object-contain"
                    priority
                  />
                </div>
              </div>

              {/* RIGHT PANEL */}
              <div className="px-5 pt-4 lg:px-12 lg:pt-14 pb-10">
                <div className="mb-4 lg:mb-8">
                  <h1 className="text-[18px] lg:text-[22px] font-extrabold text-gray-900">
                    Glad to See You Again!
                  </h1>
                  <p className="text-[12px] lg:text-[13px] text-gray-500 mt-1">
                    Enter your email to get rolling with Little Wheel
                  </p>
                </div>

                {err && (
                  <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                    {err}
                  </div>
                )}

                {/* EMAIL */}
                <div className="mb-4">
                  <label className="text-[12px] font-bold mb-2 block">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-3">
                    <Image
                      src="/uploads/emailicon.png"
                      alt="Email"
                      width={16}
                      height={16}
                    />
                    <input
                      type="email"
                      placeholder="test@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-[13px] outline-none"
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                  </div>
                  {!emailValid && email.length > 0 && (
                    <p className="mt-1 text-[11px] text-rose-600">
                      Enter a valid email address.
                    </p>
                  )}
                </div>

                {/* PASSWORD */}
                <div className="mb-2">
                  <label className="text-[12px] font-bold mb-2 block">
                    Password (6-digits)<span className="text-red-600">*</span>
                  </label>

                  <div className="relative bg-gray-100 rounded-xl px-3 py-3 flex items-center">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className="w-full bg-transparent text-[13px] outline-none pr-10 tracking-[0.25em]"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-gray-500"
                      aria-label={showPassword ? "Hide PIN" : "Show PIN"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="text-right mt-2">
                    <button
                      onClick={goForgotPassword}
                      className="text-[12px] underline font-semibold"
                      disabled={sending}
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <ReCaptcha onChange={setCaptchaToken} />
                </div>

                <div className="mt-5">
                  <button
                    onClick={handleLogin}
                    disabled={!formValid || sending}
                    className={`w-full h-[46px] rounded-xl text-[14px] font-semibold ${
                      formValid ? "bg-black text-white" : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {sending ? "Logging in…" : "Login"}
                  </button>
                </div>

                <div className="mt-5 text-center text-[12px] text-gray-600">
                  Don’t have an account?{" "}
                  <button onClick={goSignup} className="font-bold underline" disabled={sending}>
                    Create account
                  </button>
                </div>
              </div>
              {/* END RIGHT */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}