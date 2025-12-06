/* app/dash/components/settings/security/change-password/ResetPasswordClient.tsx */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, HelpCircle, Eye, EyeOff } from "lucide-react";
import LogoSpinner from "../../../../../../components/loaders/LogoSpinner";

const API_RESET_PASSWORD = "/api/auth/reset-password";

/* ---------- overlay using shared LogoSpinner ---------- */
function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px] flex items-center justify-center"
    >
      <div className="rounded-xl bg-white px-4 py-3 shadow-2xl flex items-center gap-3">
        <LogoSpinner className="w-5 h-5" />
        <span className="text-[13px] font-semibold text-gray-900">
          Loading…
        </span>
      </div>
    </div>
  );
}

export default function ResetPasswordClient({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // we now receive token via props
  const resetToken = token || "";

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // only 5 digits
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
        body: JSON.stringify({
          password: pin,
          token: resetToken,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.success === false) {
        setErrorMsg(
          json?.message ||
            "Could not reset password. Please check the link and try again."
        );
        setSubmitting(false);
        return;
      }

      setSuccessMsg("Password reset successfully.");
      setPin("");
      setConfirmPin("");

      setTimeout(() => {
        startTransition(() => router.push("/agent-login"));
      }, 700);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50" aria-busy={loading}>
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
                  className="w-full h-11 rounded-xl bg-gray-50 border border-gray-200 px-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-60"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={PIN_LENGTH}
                  autoComplete="new-password"
                  disabled={loading}
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
              <div className="mt-1 text-[11px]">
                {pin.length > 0 && !isValidPin && (
                  <span className="text-red-600">
                    Password must be exactly {PIN_LENGTH} digits.
                  </span>
                )}
              </div>
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
                  className="w-full h-11 rounded-xl bg-gray-50 border border-gray-200 px-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-60"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={PIN_LENGTH}
                  autoComplete="new-password"
                  disabled={loading}
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
            <p className="text-[12px] text-red-600 px-1">{errorMsg}</p>
          )}
          {successMsg && (
            <p className="text-[12px] text-emerald-600 px-1">{successMsg}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!formValid || submitting}
            className={`w-full h-12 rounded-2xl font-semibold transition ${
              !formValid || submitting
                ? "bg-black/30 text-white cursor-not-allowed"
                : "bg-black text-white hover:bg-black/90"
            }`}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <LogoSpinner className="w-4 h-4" /> Resetting…
              </span>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
