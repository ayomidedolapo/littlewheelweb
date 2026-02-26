/* app/forgot-pin/reset/page.tsx */
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import LogoSpinner from "../../../components/loaders/LogoSpinner";

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const email = (sp.get("email") || "").trim();
  const otp = (sp.get("otp") || "").trim();

  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ centered popup like your screenshot
  const [successOpen, setSuccessOpen] = useState(false);

  const pin1Valid = useMemo(() => /^\d{6}$/.test(pin1), [pin1]);
  const pin2Valid = useMemo(() => /^\d{6}$/.test(pin2), [pin2]);
  const pinsMatch = useMemo(
    () => pin1Valid && pin2Valid && pin1 === pin2,
    [pin1, pin2, pin1Valid, pin2Valid]
  );

  const canSubmit = pinsMatch && !sending;

  const goBack = () => router.back();

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSending(true);
    setErr(null);

    try {
      // Hook your backend:
      // await fetch("/api/auth/forgot-pin/reset", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email, otp, newPassword: pin1 }),
      // });

      // ✅ show overlay popup exactly like design
      setSending(false);
      setSuccessOpen(true);
    } catch (e: any) {
      setErr(e?.message || "Failed to reset password. Please try again.");
      setSending(false);
    }
  };

  const backToLogin = () => {
    setSuccessOpen(false);
    router.replace("/agent-login");
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-0 md:p-4 relative">
      <LogoSpinner show={sending} />

      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden flex flex-col">
        <div className="px-4 pt-6">
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

          <h1 className="mt-6 text-[18px] font-extrabold text-gray-900">
            Reset Password
          </h1>

          <p className="mt-2 text-[13px] text-gray-600 leading-snug">
            Enter your phone number to get rolling with Little Wheel
          </p>

          {err && (
            <div
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800"
              role="alert"
              aria-live="assertive"
            >
              {err}
            </div>
          )}

          {/* New Password */}
          <div className="mt-8">
            <label className="block text-[12px] font-bold text-gray-800">
              New Password (6-digits)<span className="text-red-500">*</span>
            </label>
            <div className="mt-2 relative flex items-center rounded-xl bg-white border border-gray-200 px-3 py-3">
              <input
                type={show1 ? "text" : "password"}
                value={pin1}
                onChange={(e) =>
                  setPin1(onlyDigits(e.target.value).slice(0, 6))
                }
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full bg-transparent outline-none text-[13px] text-gray-900 tracking-[0.35em] pr-10"
                disabled={sending}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShow1((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                disabled={sending}
                aria-label={show1 ? "Hide password" : "Show password"}
              >
                {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="mt-6">
            <label className="block text-[12px] font-bold text-gray-800">
              Confirm New Password (6-digits)
              <span className="text-red-500">*</span>
            </label>
            <div className="mt-2 relative flex items-center rounded-xl bg-white border border-gray-200 px-3 py-3">
              <input
                type={show2 ? "text" : "password"}
                value={pin2}
                onChange={(e) =>
                  setPin2(onlyDigits(e.target.value).slice(0, 6))
                }
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full bg-transparent outline-none text-[13px] text-gray-900 tracking-[0.35em] pr-10"
                disabled={sending}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShow2((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                disabled={sending}
                aria-label={show2 ? "Hide password" : "Show password"}
              >
                {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="mt-10 px-4">
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className={[
              "w-full h-12 rounded-xl text-[14px] font-semibold transition-colors",
              canSubmit
                ? "bg-black text-white hover:bg-black/90"
                : "bg-gray-200 text-gray-500 cursor-not-allowed",
            ].join(" ")}
          >
            {sending ? "Submitting…" : "Submit"}
          </button>
        </div>

        <div className="flex-1" />
      </div>

      {/* ✅ Centered popup overlay (matches your screenshot) */}
      {successOpen && (
        <div className="fixed inset-0 z-50">
          {/* dim background */}
          <div className="absolute inset-0 bg-black/60" />

          {/* modal card */}
          <div className="absolute inset-0 flex items-end justify-center px-4 pb-10">
            <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
              {/* small handle */}
              <div className="flex justify-center pt-3">
                <div className="h-1.5 w-10 rounded-full bg-gray-200" />
              </div>

              <div className="px-6 pt-6 pb-7">
                {/* circle + check */}
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center">
                    {/* using a simple check mark style like design */}
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                <h2 className="mt-6 text-center text-[18px] font-extrabold text-gray-900">
                  Password reset successful
                </h2>
                <p className="mt-2 text-center text-[12px] text-gray-600 leading-snug">
                  Ensure you save this new password somewhere safe.
                </p>

                <button
                  onClick={backToLogin}
                  className="mt-6 w-full h-12 rounded-xl bg-black text-white text-[14px] font-semibold hover:bg-black/90"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}