/* app/agent-signup/components/create/page.tsx */
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Info, User } from "lucide-react";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

const onlyDigits = (v: string) => v.replace(/\D/g, "");

export default function AgentSignupCreatePage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(""); // local digits (10–11)
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState(""); // 6 digits
  const [showPin, setShowPin] = useState(false);

  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const phoneValid = useMemo(() => {
    const d = onlyDigits(phone);
    return d.length >= 10 && d.length <= 11;
  }, [phone]);

  const emailValid = useMemo(() => {
    const v = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }, [email]);

  const pinValid = useMemo(() => /^\d{6}$/.test(pin), [pin]);

  const formValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    phoneValid &&
    emailValid &&
    pinValid;

  const goBack = () => router.back();
  const goLogin = () => router.push("/agent-login");

  const handleSubmit = async () => {
    if (!formValid || sending) return;
    setSending(true);
    setErr(null);

    try {
      // UI-first: hook your backend here when ready
      // await fetch("/api/auth/signup", { ... })

      // for now, just move to next step if you have one:
      // router.push("/agent-signup/components/verify");
      router.push("/agent-signup/components/personal-details");
    } catch (e: any) {
      setErr(e?.message || "Something went wrong. Please try again.");
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-0 md:p-4">
      <LogoSpinner show={sending} />

      {/* Mobile full-screen; Desktop centered card */}
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden">
        <div className="px-4 pt-6 pb-3">
          {/* Back */}
          <button
            onClick={goBack}
            disabled={sending}
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-gray-700 hover:text-gray-900 disabled:text-gray-400"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white">
              <ArrowLeft className="h-4 w-4" />
            </span>
            Back
          </button>

          {/* Title */}
          <div className="mt-4">
            <h1 className="text-[22px] font-extrabold text-gray-900">
              Let’s Get Started
            </h1>
            <p className="text-[13px] text-gray-600 mt-1 leading-snug">
              Enter your phone number to get rolling with Little Wheel
            </p>
          </div>

          {/* Error (optional) */}
          {err && (
            <div
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800"
              role="alert"
              aria-live="assertive"
            >
              {err}
            </div>
          )}

          {/* First Name */}
          <div className="mt-6">
            <label className="block text-[12px] font-bold text-gray-800">
              First Name<span className="text-red-500">*</span>
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3">
              <User className="h-4 w-4 text-gray-500" />
              <input
                value={firstName}
                onChange={(e) => !sending && setFirstName(e.target.value)}
                placeholder="e.g John"
                className="flex-1 bg-transparent outline-none text-[13px] text-gray-900 placeholder-gray-400 disabled:cursor-not-allowed"
                disabled={sending}
              />
            </div>
          </div>

          {/* Last Name */}
          <div className="mt-4">
            <label className="block text-[12px] font-bold text-gray-800">
              Last Name<span className="text-red-500">*</span>
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3">
              <User className="h-4 w-4 text-gray-500" />
              <input
                value={lastName}
                onChange={(e) => !sending && setLastName(e.target.value)}
                placeholder="e.g Doe"
                className="flex-1 bg-transparent outline-none text-[13px] text-gray-900 placeholder-gray-400 disabled:cursor-not-allowed"
                disabled={sending}
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div className="mt-4">
            <label className="block text-[12px] font-bold text-gray-800">
              Mobile Number<span className="text-red-500">*</span>
            </label>

            <div className="mt-2 flex gap-2">
              {/* Country box */}
              <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3">
                <div className="h-5 w-5 rounded-full overflow-hidden bg-white border border-gray-200">
                  <Image
                    src="https://flagpedia.net/data/flags/w580/ng.png"
                    alt="NG"
                    width={20}
                    height={20}
                    className="h-full w-full"
                  />
                </div>
                <span className="text-[13px] font-bold text-gray-800">+234</span>
              </div>

              {/* Number input */}
              <div className="flex-1 rounded-xl bg-gray-100 px-3 py-3">
                <input
                  value={phone}
                  onChange={(e) => {
                    if (sending) return;
                    const d = onlyDigits(e.target.value).slice(0, 11);
                    setPhone(d);
                  }}
                  placeholder="000-0000-000"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full bg-transparent outline-none text-[13px] text-gray-900 placeholder-gray-400 disabled:cursor-not-allowed"
                  disabled={sending}
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="mt-4">
            <label className="block text-[12px] font-bold text-gray-800">
              Email<span className="text-red-500">*</span>
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3">
              <Image
                src="/uploads/emailicon.png"
                alt="Email"
                width={16}
                height={16}
                className="opacity-70"
              />
              <input
                value={email}
                onChange={(e) => !sending && setEmail(e.target.value)}
                placeholder="test@gmail.com"
                className="flex-1 bg-transparent outline-none text-[13px] text-gray-900 placeholder-gray-400 disabled:cursor-not-allowed"
                disabled={sending}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mt-4">
            <label className="block text-[12px] font-bold text-gray-800">
              Password (6-digits)<span className="text-red-500">*</span>
            </label>
            <div className="mt-2 relative flex items-center rounded-xl bg-gray-100 px-3 py-3">
              <input
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => {
                  if (sending) return;
                  setPin(onlyDigits(e.target.value).slice(0, 6));
                }}
                placeholder="••••••"
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full bg-transparent outline-none text-[13px] text-gray-900 placeholder-gray-400 tracking-[0.25em] pr-10 disabled:cursor-not-allowed"
                disabled={sending}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => !sending && setShowPin((s) => !s)}
                disabled={sending}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 disabled:text-gray-300"
                aria-label={showPin ? "Hide password" : "Show password"}
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Note row */}
            <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-600">
              <Info className="h-4 w-4 text-gray-500" />
              <span>Password is Numbers</span>
            </div>
          </div>

          {/* Spacer to mimic design */}
          <div className="h-10" />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!formValid || sending}
            className={`w-full h-12 rounded-xl text-[14px] font-semibold transition ${
              formValid && !sending
                ? "bg-black text-white hover:bg-black/90"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {sending ? "Submitting…" : "Submit"}
          </button>

          {/* Footer */}
          <div className="mt-5 mb-8 text-center text-[12px] text-gray-600">
            Already have an account?{" "}
            <button
              onClick={goLogin}
              disabled={sending}
              className="font-bold text-gray-900 underline underline-offset-2 disabled:text-gray-400"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}