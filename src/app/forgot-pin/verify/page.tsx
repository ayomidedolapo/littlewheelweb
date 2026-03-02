/* app/forgot-pin/verify/page.tsx */
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import LogoSpinner from "../../../components/loaders/LogoSpinner";

function maskEmail(email: string) {
  const e = (email || "").trim();
  const at = e.indexOf("@");
  if (at <= 1) return e;
  const name = e.slice(0, at);
  const domain = e.slice(at + 1);
  const head = name.slice(0, 4);
  return `${head}***@${domain}`;
}

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

/**
 * ✅ useSearchParams() must be inside a component wrapped by <Suspense>.
 * UI is unchanged — only structure.
 */
function ForgotPinVerifyOtpInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const qsEmail = (sp.get("email") || "").trim();
    setEmail(qsEmail || "your email");
  }, [sp]);

  const otpValue = useMemo(() => otp.join(""), [otp]);
  const otpValid = useMemo(() => /^\d{6}$/.test(otpValue), [otpValue]);
  const canConfirm = otpValid && !sending;

  const focusIndex = (i: number) => {
    const el = inputsRef.current[i];
    if (el) el.focus();
  };

  const setDigit = (i: number, v: string) => {
    const d = onlyDigits(v).slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (d && i < 5) focusIndex(i + 1);
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSending(true);
    setErr(null);

    try {
      // Hook verify endpoint:
      // await fetch("/api/auth/forgot-pin/verify", { method: "POST", body: JSON.stringify({ email, otp: otpValue }) })

      router.push(
        `/forgot-pin/reset?email=${encodeURIComponent(
          email
        )}&otp=${encodeURIComponent(otpValue)}`
      );
    } catch (e: any) {
      setErr(e?.message || "Verification failed. Try again.");
      setSending(false);
    }
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      setOtp((prev) => {
        const next = [...prev];
        if (next[i]) {
          next[i] = "";
          return next;
        }
        if (i > 0) {
          next[i - 1] = "";
          setTimeout(() => focusIndex(i - 1), 0);
        }
        return next;
      });
      return;
    }

    if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      focusIndex(i - 1);
    }
    if (e.key === "ArrowRight" && i < 5) {
      e.preventDefault();
      focusIndex(i + 1);
    }
    if (e.key === "Enter" && canConfirm) {
      e.preventDefault();
      void handleConfirm();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = onlyDigits(e.clipboardData.getData("text")).slice(0, 6);
    if (!pasted) return;
    e.preventDefault();

    const arr = pasted.split("");
    setOtp((prev) => {
      const next = [...prev];
      for (let i = 0; i < 6; i++) next[i] = arr[i] || "";
      return next;
    });

    const lastIndex = Math.min(pasted.length - 1, 5);
    setTimeout(() => focusIndex(Math.max(lastIndex, 0)), 0);
  };

  const handleResend = async () => {
    if (sending) return;
    setSending(true);
    setErr(null);
    try {
      // Hook resend endpoint
      // await fetch("/api/auth/forgot-pin/resend", { method: "POST", body: JSON.stringify({ email }) })

      await new Promise((r) => setTimeout(r, 400)); // UI placeholder
      setSending(false);
    } catch (e: any) {
      setErr(e?.message || "Failed to resend code.");
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
            onClick={() => router.back()}
            disabled={sending}
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-gray-700 hover:text-gray-900 disabled:text-gray-400"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white">
              <ArrowLeft className="h-4 w-4" />
            </span>
            Back
          </button>

          <h1 className="mt-6 text-[18px] font-extrabold text-gray-900">
            Confirm OTP Code
          </h1>

          <p className="mt-2 text-[12px] text-gray-600 leading-snug">
            Enter your OTP code sent to your Email Address you provided:{" "}
            <span className="font-bold text-blue-600">{maskEmail(email)}</span>
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

          {/* OTP boxes */}
          <div className="mt-7 flex items-center gap-2">
            {otp.map((v, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                value={v}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
                disabled={sending}
                className={[
                  "h-11 w-11 rounded-lg border bg-white text-center text-[14px] font-semibold",
                  "outline-none",
                  i === 0
                    ? "border-blue-500 ring-2 ring-blue-100"
                    : "border-gray-200",
                  sending ? "text-gray-400" : "text-gray-900",
                ].join(" ")}
                aria-label={`OTP digit ${i + 1}`}
              />
            ))}
          </div>

          {/* Resend row */}
          <div className="mt-3 text-[12px] text-gray-600">
            Didn’t receive the code?{" "}
            <button
              onClick={handleResend}
              disabled={sending}
              className="font-bold text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              Resend code
            </button>
          </div>
        </div>

        {/* Bottom Confirm button */}
        <div className="mt-10 px-4">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={[
              "w-full h-12 rounded-xl text-[14px] font-semibold transition-colors",
              canConfirm
                ? "bg-black text-white hover:bg-black/90"
                : "bg-gray-200 text-gray-500 cursor-not-allowed",
            ].join(" ")}
          >
            Confirm
          </button>
        </div>

        <div className="flex-1" />
      </div>
    </div>
  );
}

export default function ForgotPinVerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-[12px] text-gray-600">Loading...</div>
        </div>
      }
    >
      <ForgotPinVerifyOtpInner />
    </Suspense>
  );
}