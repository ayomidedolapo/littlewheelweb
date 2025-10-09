"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, HelpCircle, Eye, EyeOff } from "lucide-react";
import LogoSpinner from "../../../../../../components/loaders/LogoSpinner";

const API_CHANGE_PASSWORD = "/api/settings/change-password";

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

export default function ChangePasswordPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // simple rules – tweak as needed
  const minLen = 6;
  const newValid = newPwd.length >= minLen;
  const matches = newPwd === confirmPwd;
  const different = newPwd && currentPwd && newPwd !== currentPwd;

  const formValid = currentPwd.length >= 1 && newValid && matches && different;
  const loading = submitting || isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(API_CHANGE_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPwd,
          newPassword: newPwd,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.success === false) {
        setErrorMsg(
          json?.message ||
            "Could not update password. Please check your details and try again."
        );
        setSubmitting(false);
        return;
      }

      setSuccessMsg("Password updated successfully.");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");

      setTimeout(() => {
        startTransition(() => router.back());
      }, 700);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50" aria-busy={loading}>
      {/* global overlay while submitting or navigating */}
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
        <h1 className="text-xl font-semibold text-black">Change Password</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Update your current password for better security.
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          {/* Group card for inputs */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            {/* Current */}
            <div>
              <label className="block text-[13px] text-gray-700 mb-2">
                Enter your current password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className="w-full h-11 rounded-xl bg-gray-50 border border-gray-200 px-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-60"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 disabled:opacity-40"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showCurrent ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New */}
            <div>
              <label className="block text-[13px] text-gray-700 mb-2">
                Enter New password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full h-11 rounded-xl bg-gray-50 border border-gray-200 px-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-60"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 disabled:opacity-40"
                  aria-label={showNew ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showNew ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {/* Inline helper / errors for new password */}
              <div className="mt-1 text-[11px]">
                {!newValid && newPwd.length > 0 && (
                  <span className="text-red-600">
                    Must be at least {minLen} characters.
                  </span>
                )}
                {newValid && !different && currentPwd && (
                  <span className="text-red-600">
                    New password must be different from current password.
                  </span>
                )}
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-[13px] text-gray-700 mb-2">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="w-full h-11 rounded-xl bg-gray-50 border border-gray-200 px-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-60"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 disabled:opacity-40"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {confirmPwd.length > 0 && !matches && (
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
                <LogoSpinner className="w-4 h-4" /> Updating…
              </span>
            ) : (
              "Update Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
