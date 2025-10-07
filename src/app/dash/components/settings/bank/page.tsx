"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Landmark, Lock } from "lucide-react";

/* ---------- tiny spinner + overlay (same as BottomTabs) ---------- */
function Spinner({ className = "w-4 h-4 text-black" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        className="opacity-25"
      />
      <path
        fill="currentColor"
        className="opacity-90"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}
function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px] flex items-center justify-center"
    >
      <div className="rounded-xl bg-white px-4 py-3 shadow-2xl flex items-center gap-3">
        <Spinner className="w-5 h-5" />
        <span className="text-[13px] font-semibold text-gray-900">
          Loading…
        </span>
      </div>
    </div>
  );
}

export default function WithdrawalSettingsPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      router.prefetch("/dash/components/settings/bank/details");
      router.prefetch("/dash/components/settings/withdrawal-pin");
    } catch {}
  }, [router]);

  const goBack = () => startTransition(() => router.back());
  const goBankDetails = () =>
    startTransition(() =>
      router.push("/dash/components/settings/bank/details")
    );
  const goWithdrawalPin = () =>
    startTransition(() =>
      router.push("/dash/components/settings/withdrawal-pin")
    );

  return (
    <div className="min-h-screen bg-gray-50" aria-busy={isPending}>
      {/* global overlay while routing */}
      <LoadingOverlay show={isPending} />

      {/* Header */}
      <div className="bg-white">
        <div className="max-w-sm mx-auto px-4 py-3">
          <button
            onClick={goBack}
            className="flex items-center text-gray-700 hover:text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isPending}
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            <span className="text-base">Back</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-sm mx-auto px-4 pt-4 pb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Withdrawal settings
        </h1>

        <div className="mt-4 space-y-3">
          {/* Card 1: Bank Details */}
          <button
            onClick={goBankDetails}
            className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow px-4 py-4 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isPending}
          >
            <div className="flex items-center">
              <div className="shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                <Landmark className="w-5 h-5 text-gray-700" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Bank Details
                </p>
                <p className="text-[12px] text-gray-500">
                  Add your bank details and enjoy smooth transactions
                </p>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
            </div>
          </button>

          {/* Card 2: Change Withdrawal PIN */}
          <button
            onClick={goWithdrawalPin}
            className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow px-4 py-4 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isPending}
          >
            <div className="flex items-center">
              <div className="shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                <Lock className="w-5 h-5 text-gray-700" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Change Withdrawal PIN
                </p>
                <p className="text-[12px] text-gray-500">
                  Create a 6-digit PIN
                </p>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
