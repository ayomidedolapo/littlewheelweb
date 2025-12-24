"use client";

import { useEffect, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import LogoSpinner from "../../../../../components/loaders/LogoSpinner";

/* ---------- Centered full-screen spinner ---------- */
function GlobalRouteSpinner({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
      <LogoSpinner show={true} />
    </div>
  );
}

export default function SecurityPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /* 🔴 NEW — error message state */
  const [routeError, setRouteError] = useState<string | null>(null);

  /* Prefetch pages */
  useEffect(() => {
    try {
      router.prefetch("/dash/components/settings/security/change-password");
      router.prefetch("/dash/components/settings/security/transaction-pin");
    } catch {}
  }, [router]);

  /* Helper to safely navigate with error handling */
  function safeNav(action: () => void) {
    try {
      setRouteError(null);
      startTransition(action);
    } catch (e: any) {
      setRouteError("Navigation failed. Please try again.");
    }
  }

  const goBack = () => safeNav(() => router.back());
  const goChangePassword = () =>
    safeNav(() =>
      router.push("/dash/components/settings/security/change-password")
    );
  const goPin = () =>
    safeNav(() =>
      router.push("/dash/components/settings/security/transaction-pin")
    );

  return (
    <div className="min-h-screen bg-gray-50" aria-busy={isPending}>
      {/* Global spinner */}
      <GlobalRouteSpinner show={isPending} />

      {/* Header */}
      <div className="bg-white">
        <div className="max-w-sm mx-auto px-4 py-3">
          <button
            onClick={goBack}
            className="flex items-center text-left disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Back"
            disabled={isPending}
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 mr-2" />
            <span className="text-gray-700 text-base">Back</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-sm mx-auto px-4 pt-4 pb-10">
        <h1 className="text-xl font-semibold text-black mb-4">Security</h1>

        {/* 🔴 Error style (Modern Little Wheel UI) */}
        {routeError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            <AlertCircle className="w-4 h-4 mt-[2px]" />
            <p>{routeError}</p>
          </div>
        )}

        {/* Change Password */}
        <button
          onClick={goChangePassword}
          className="w-full bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-gray-100 px-4 py-4 flex items-center justify-between mb-3 active:scale-[0.995] transition disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isPending}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <Lock className="w-4 h-4 text-gray-700" />
            </div>
            <div className="text-left">
              <p className="text-[14px] font-semibold text-gray-900">
                Change Password
              </p>
              <p className="text-[12px] text-gray-500">
                Update your current password for better security
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* Transaction PIN with icon */}
        <button
          onClick={goPin}
          className="w-full bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-gray-100 px-4 py-4 flex items-center justify-between active:scale-[0.995] transition disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isPending}
        >
          <div className="flex items-start gap-3">
            {/* Icon badge, like Change Password but with Key icon */}
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-gray-700" />
            </div>
            <div className="text-left">
              <p className="text-[14px] font-semibold text-gray-900">
                Transaction PIN
              </p>
              <p className="text-[12px] text-gray-500">
                Set or update the PIN for your withdrawals
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
