"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

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
        () => router.push("/onboard-form/components/personal-details"),
        200
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Verification failed.");
      setTimeout(() => setStatus("idle"), 700);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.push("./personal-details");
  };

  const baseBox =
    "w-12 h-12 md:w-14 md:h-14 text-center text-xl md:text-2xl font-bold rounded-xl border-2 focus:outline-none transition-all duration-150";
  const colorForStatus = (filled: boolean) => {
    if (status === "success")
      return "border-green-500 bg-green-50 text-green-700";
    if (status === "error") return "border-red-500 bg-red-50 text-red-700";
    return filled
      ? "border-black text-gray-900 bg-white"
      : "border-gray-300 text-gray-900 bg-white";
  };
  const proceedEnabled = isComplete && !submitting;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 flex items-center justify-center px-0 py-0 md:px-6 md:py-8"
      aria-busy={submitting || resending}
    >
      {/* Global overlay spinner if LogoSpinner supports `show` */}
      <LogoSpinner show={submitting || resending} />

      <div
        className="
          w-full 
          bg-white 
          min-h-screen 
          md:min-h-0 
          md:max-w-5xl 
          md:rounded-3xl 
          md:shadow-[0_18px_60px_rgba(15,23,42,0.14)] 
          md:border md:border-gray-100 
          overflow-hidden
          flex flex-col
        "
      >
        {/* Top header + step bar */}
        <div className="border-b border-gray-100 bg-white/90 backdrop-blur-sm">
          <div className="px-4 md:px-8 pt-4 pb-3 flex items-center justify-between gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-60"
              disabled={submitting || resending}
            >
              <ArrowLeft className="w-4 h-4 text-black" />
              Back
            </button>

            <div className="hidden md:flex items-center gap-2 text-[11px] font-medium text-gray-500">
              <span className="h-1.5 w-16 rounded-full bg-black" />
              <span className="h-1.5 w-16 rounded-full bg-black" />
              <span className="h-1.5 w-16 rounded-full bg-gray-200" />
              <span className="ml-3 tracking-wide uppercase">
                Step 2 of 3 • Verify phone
              </span>
            </div>
          </div>

          <div className="h-1 w-full bg-gray-100">
            <div className="h-full bg-black rounded-r-full w-2/3" />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 px-4 md:px-8 py-6 md:py-8 flex flex-col">
          {/* Intro + error banner */}
          <div className="max-w-md">
            <p className="inline-flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-600 mb-3">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              Onboarding • Phone verification
            </p>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900 tracking-tight">
              Verify mobile number
            </h1>
            <p className="text-sm text-gray-600 mt-1.5">
              Enter the 4-digit code sent to the customer&apos;s phone to
              confirm their number.
            </p>
          </div>

          {err && (
            <div
              className="mt-4 max-w-md flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
              role="alert"
            >
              <span className="mt-0.5 text-sm">⚠️</span>
              <p>{err}</p>
            </div>
          )}

          {/* Middle: OTP boxes centered */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* 4 inputs */}
            <div className="flex justify-center gap-3 my-4 md:my-6">
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
                  )} focus:ring-2 focus:ring-gray-100 focus:border-black`}
                />
              ))}
            </div>

            {/* Timer */}
            <div className="text-center mb-3">
              <span className="text-gray-600 text-sm">
                {Math.floor(timeLeft / 60)}:
                {String(timeLeft % 60).padStart(2, "0")} left
              </span>
            </div>

            {/* Resend link */}
            <button
              onClick={handleSendAgain}
              disabled={resending}
              className="text-gray-900 text-sm underline hover:text-gray-700 disabled:opacity-60 inline-flex items-center gap-2 mt-2"
            >
              {resending ? (
                <>
                  <LogoSpinner className="w-4 h-4" />
                  Sending code…
                </>
              ) : (
                "Send code again"
              )}
            </button>
          </div>

          {/* Bottom actions */}
          <div className="mt-4">
            {/* Proceed */}
            <button
              onClick={handleProceed}
              disabled={!proceedEnabled}
              className={`w-full px-7 py-3.5 rounded-2xl text-sm font-semibold tracking-wide inline-flex items-center justify-center gap-2 transition-all ${
                proceedEnabled && !submitting
                  ? "bg-black text-white hover:bg-black/90 shadow-[0_14px_30px_rgba(15,23,42,0.25)]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <>
                  <LogoSpinner className="w-4 h-4" />
                  Verifying…
                </>
              ) : (
                "Proceed"
              )}
            </button>

            {/* Skip */}
            <button
              onClick={handleSkip}
              className="w-full font-semibold py-3.5 px-6 rounded-2xl border border-gray-200 text-gray-800 hover:bg-gray-50 text-sm mt-3"
            >
              Skip for now
            </button>

            {/* Change number */}
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-full py-3 text-gray-700 hover:text-gray-900 mt-4"
            >
              <span className="text-sm font-medium underline">
                Or change phone number
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
