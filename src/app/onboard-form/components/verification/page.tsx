"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const OTP_LEN = 4;

export default function MobileVerification() {
  const router = useRouter();

  const [code, setCode] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [timeLeft, setTimeLeft] = useState(305);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const isComplete = useMemo(() => code.every((d) => d !== ""), [code]);
  const valueAsString = useMemo(() => code.join(""), [code]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const focusIndex = (i: number) => inputsRef.current[i]?.focus();
  const setDigit = (i: number, v: string) => {
    const next = [...code];
    next[i] = v;
    setCode(next);
  };

  const handleChange = (index: number, raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 1);
    if (!v) return setDigit(index, "");
    setDigit(index, v);
    if (index < OTP_LEN - 1) focusIndex(index + 1);
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && code[index] === "" && index > 0) {
      e.preventDefault();
      setDigit(index - 1, "");
      focusIndex(index - 1);
    }
    if ((e.key === "ArrowLeft" || e.key === "ArrowUp") && index > 0) {
      e.preventDefault();
      focusIndex(index - 1);
    }
    if (
      (e.key === "ArrowRight" || e.key === "ArrowDown") &&
      index < OTP_LEN - 1
    ) {
      e.preventDefault();
      focusIndex(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const txt = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LEN);
    if (txt.length) {
      e.preventDefault();
      const next = txt
        .padEnd(OTP_LEN, " ")
        .split("")
        .slice(0, OTP_LEN)
        .map((c) => (/\d/.test(c) ? c : ""));
      setCode(next);
      focusIndex(Math.min(txt.length, OTP_LEN - 1));
    }
  };

  const handleSendAgain = async () => {
    if (resending) return;
    const token = sessionStorage.getItem("lw_reg_token");
    if (!token) {
      setErr("Missing registration token. Restart onboarding.");
      return;
    }
    setResending(true);
    setErr(null);
    try {
      const r = await fetch("/api/v1/agent/customers/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || j?.error || `HTTP ${r.status}`);
      }
      setTimeLeft(305);
      setStatus("idle");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  const handleProceed = async () => {
    // If you re-enable OTP later, this will verify it.
    if (!isComplete || submitting) return;
    const token = sessionStorage.getItem("lw_reg_token");
    if (!token) {
      setErr("Missing registration token. Restart onboarding.");
      return;
    }

    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(
        "/api/v1/agent/customers/confirm-registration-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ otp: valueAsString, token }),
        }
      );

      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text || "{}");
      } catch {}

      if (!res.ok) {
        setStatus("error");
        const msg = json?.message || json?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setStatus("success");
      const customerId =
        json?.data?.customerId || json?.data?.id || json?.customerId || null;
      if (customerId)
        sessionStorage.setItem("lw_onboarding_customer_id", String(customerId));

      setTimeout(
        () => router.push("./onboard-form/components/personal-details"),
        200
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Verification failed.");
      setTimeout(() => setStatus("idle"), 700);
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ SKIP here: bypass OTP and move forward
  const handleSkip = () => {
    router.push("./personal-details");
  };

  const baseBox =
    "w-12 h-12 md:w-14 md:h-14 text-center text-xl md:text-2xl font-bold rounded-lg border-2 focus:outline-none transition-all duration-150";
  const colorForStatus = (filled: boolean) => {
    if (status === "success")
      return "border-green-500 bg-green-50 text-green-700";
    if (status === "error") return "border-red-500 bg-red-50 text-red-700";
    return filled
      ? "border-black text-gray-900"
      : "border-black/70 text-gray-900";
  };
  const proceedEnabled = isComplete && !submitting;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-0 md:p-4">
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center p-4 pt-8 bg-white">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-6 bg-white flex flex-col h-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Verify Mobile Number
          </h1>
          <p className="text-gray-600 text-sm mb-2">
            A verification code has been sent to their mobile number
          </p>

          <div className="mb-2">
            <button
              onClick={handleSendAgain}
              disabled={resending}
              className="text-gray-900 text-sm underline hover:text-gray-700 disabled:opacity-60"
            >
              {resending ? "Sending…" : "Send code again"}
            </button>
          </div>

          {/* 4 inputs */}
          <div
            className={`flex justify-center gap-3 my-8 ${
              status === "error" ? "animate-[shake_0.6s_ease]" : ""
            }`}
          >
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className={`${baseBox} ${colorForStatus(
                  !!digit
                )} focus:ring-0 focus:border-black`}
              />
            ))}
          </div>

          <div className="text-center mb-3">
            <span className="text-gray-600 text-sm">
              {Math.floor(timeLeft / 60)}:
              {String(timeLeft % 60).padStart(2, "0")} left
            </span>
          </div>

          {err && (
            <p className="text-center text-xs text-red-600 mb-3" role="alert">
              {err}
            </p>
          )}

          {/* Primary actions */}
          <button
            onClick={handleProceed}
            disabled={!proceedEnabled}
            className={`w-full font-semibold py-4 px-6 rounded-xl transition-colors text-sm ${
              proceedEnabled
                ? "bg-black text-white hover:bg-black/90"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {submitting ? "Verifying…" : "Proceed"}
          </button>

          {/* Skip for now */}
          <button
            onClick={handleSkip}
            className="w-full font-semibold py-4 px-6 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-50 text-sm mt-3"
          >
            Skip for now
          </button>

          {/* Change number */}
          <button
            onClick={() => router.back()}
            className="flex items-center justify-between w-full py-3 text-gray-700 hover:text-gray-900 mt-6"
          >
            <span className="text-sm font-medium">Or Change phone number</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          10% {
            transform: translateX(-4px);
          }
          20% {
            transform: translateX(4px);
          }
          30% {
            transform: translateX(-4px);
          }
          40% {
            transform: translateX(4px);
          }
          50% {
            transform: translateX(-4px);
          }
          60% {
            transform: translateX(4px);
          }
          70% {
            transform: translateX(-2px);
          }
          80% {
            transform: translateX(2px);
          }
          90% {
            transform: translateX(-1px);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
