/* app/forgot-pin/page.tsx */
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import LogoSpinner from "../../components/loaders/LogoSpinner";

export default function ForgotPinEmailPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const emailValid = useMemo(() => {
    const v = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }, [email]);

  const canProceed = emailValid && !sending;

  const goBack = () => router.back();

  const handleProceed = async () => {
    if (!canProceed) return;
    setSending(true);
    setErr(null);

    try {
      // Hook your backend here:
      // await fetch("/api/auth/forgot-pin", { method: "POST", body: JSON.stringify({ email }) })
      // Then route to OTP screen:
      // router.push(`/forgot-pin/verify?email=${encodeURIComponent(email.trim())}`);

      router.push(`/forgot-pin/verify?email=${encodeURIComponent(email.trim())}`);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong. Please try again.");
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-0 md:p-4">
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

          {/* Title */}
          <h1 className="mt-6 text-[18px] font-extrabold text-gray-900">
            Enter your Email Address
          </h1>

          <p className="mt-2 text-[13px] text-gray-600 leading-snug">
            Enter your <span className="font-bold text-blue-600">Email Address</span>{" "}
            to get rolling with Little Wheel
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

          {/* Email */}
          <div className="mt-10">
            <label className="block text-[12px] font-bold text-gray-800">
              Email<span className="text-red-500">*</span>
            </label>

            <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3 border border-gray-200">
              <Image
                src="/uploads/emailicon.png"
                alt="Email"
                width={16}
                height={16}
                className="opacity-70"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => !sending && setEmail(e.target.value)}
                placeholder="test@gmail.com"
                disabled={sending}
                className="w-full bg-transparent outline-none text-[13px] text-gray-900 placeholder-gray-400 disabled:cursor-not-allowed"
                autoComplete="email"
              />
            </div>
          </div>
        </div>

        {/* Button at bottom with large spacing like design */}
        <div className="mt-auto px-4 pb-10 pt-16">
          <button
            onClick={handleProceed}
            disabled={!canProceed}
            className={`w-full h-12 rounded-xl text-[14px] font-semibold transition-colors ${
              canProceed
                ? "bg-black text-white hover:bg-black/90"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {sending ? "Processing…" : "Proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}