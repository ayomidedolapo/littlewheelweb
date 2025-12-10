/* app/dash/components/settings/security/change-password/ResetPasswordClient.tsx */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  HelpCircle,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import LogoSpinner from "../../../../../../components/loaders/LogoSpinner";

const API_RESET_PASSWORD = "/api/auth/reset-password";

/* ---------- CLEAN OVERLAY WITH ONLY LOGO SPINNER ---------- */
function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
      {/* Centered Logo Spinner */}
      <LogoSpinner show={true} />
    </div>
  );
}

export default function ResetPasswordClient({ token }: { token?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const PIN_LENGTH = 5;
  const isValidPin = /^\d{5}$/.test(pin);
  const matches = pin === confirmPin;
  const formValid = isValidPin && matches;

  const loading = submitting || isPending;

  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    setPin(digits);
  }

  function handleConfirmPinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    setConfirmPin(digits);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(API_RESET_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pin }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.success === false) {
        setErrorMsg(
          json?.message || "Could not reset password. Please try again."
        );
        setSubmitting(false);
        return;
      }

      setSuccessMsg("Password reset successfully.");
      setPin("");
      setConfirmPin("");

      setTimeout(() => {
        startTransition(() => router.push("/dash"));
      }, 700);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50" aria-busy={loading}>
      {/* Updated spinner overlay */}
      <LoadingOverlay show={loading} />

      {/* Header */}
      <div className="bg-white">
        <div className="max-w-sm mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => startTransition(() => router.back())}
            className="flex items-center text-left disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Back"
            disabled={loading}
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 mr-2" />
            <span className="text-gray-700 text-base">Back</span>
          </button>

          <HelpCircle className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Body */}
      <div className="max-w-sm mx-auto px-4 pt-3 pb-10">
        <h1 className="text-xl font-semibold text-black">Reset Password</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Set a new 5-digit password to secure your account.
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            {/* New PIN */}
            <div>
              <label className="block text-[13px] text-gray-700 mb-2">
                Enter new 5-digit password
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={handlePinChange}
                  className="w-full h-11 rounded-xl bg-gray-50 border border-gray-200 px-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  inputMode="numeric"
                  maxLength={PIN_LENGTH}
                />
                <button
                  type="button"
                  onClick={() => setShowPin((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 disabled:opacity-40"
                  aria-label={showPin ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showPin ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {pin.length > 0 && !isValidPin && (
                <p className="mt-1 text-[11px] text-red-600">
                  Password must be exactly {PIN_LENGTH} digits.
                </p>
              )}
            </div>

            {/* Confirm PIN */}
            <div>
              <label className="block text-[13px] text-gray-700 mb-2">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPin ? "text" : "password"}
                  value={confirmPin}
                  onChange={handleConfirmPinChange}
                  className="w-full h-11 rounded-xl bg-gray-50 border border-gray-200 px-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  inputMode="numeric"
                  maxLength={PIN_LENGTH}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 disabled:opacity-40"
                  aria-label={
                    showConfirmPin ? "Hide password" : "Show password"
                  }
                  disabled={loading}
                >
                  {showConfirmPin ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {confirmPin.length > 0 && !matches && (
                <p className="mt-1 text-[11px] text-red-600">
                  Passwords do not match.
                </p>
              )}
            </div>
          </div>

          {/* Global error/success */}
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              <AlertCircle className="w-4 h-4" />
              <p>{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <p>{successMsg}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!formValid || loading}
            className={`w-full h-12 rounded-2xl font-semibold transition ${
              !formValid || loading
                ? "bg-black/30 text-white"
                : "bg-black text-white hover:bg-black/90"
            }`}
          >
            {loading ? " " : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
