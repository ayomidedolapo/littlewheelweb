"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info, X, Plus } from "lucide-react";

/* ✅ Logo spinner overlay */
import LogoSpinner from "../../../components/loaders/LogoSpinner";

/* ---------- money ---------- */
const NGN = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
});

/* ---------- tiny spinner (for small inline buttons) ---------- */
function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

export default function CommissionSummary({
  total = 60000,
  withdrawablePct = 0.7,
  onWithdraw,
  onOnboard, // (optional) custom handler for the floating CTA
}: {
  total?: number;
  withdrawablePct?: number;
  onWithdraw?: () => void | Promise<void>;
  onOnboard?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const router = useRouter();

  const pctLabel = `${Math.round(withdrawablePct * 100)}% withdrawable`;

  // navigation/loading states
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [navOverlay, startTransition] = useTransition();
  const [forceOverlay, setForceOverlay] = useState(false);

  // keep overlay visible for at least ~500ms so it feels intentional
  useEffect(() => {
    if (!navOverlay) return;
    setForceOverlay(true);
    const t = setTimeout(() => setForceOverlay(false), 500);
    return () => clearTimeout(t);
  }, [navOverlay]);

  const goOnboard = async () => {
    // If a custom handler is supplied, await it with overlay; otherwise navigate.
    if (onOnboard) {
      setForceOverlay(true);
      try {
        await Promise.resolve(onOnboard());
      } finally {
        // Grace delay to avoid flicker
        setTimeout(() => setForceOverlay(false), 400);
      }
      return;
    }
    // Show overlay while Next.js navigates
    startTransition(() => {
      router.push("./onboard");
    });
  };

  const doWithdraw = async () => {
    if (!onWithdraw) return;
    setIsWithdrawing(true);
    try {
      await Promise.resolve(onWithdraw());
    } finally {
      setIsWithdrawing(false);
    }
  };

  const showOverlay = navOverlay || forceOverlay;

  return (
    <>
      {/* ✅ full-screen logo spinner while routing / custom onboard action */}
      <LogoSpinner show={showOverlay} />

      {/* Floating CTA */}
      <div
        className="fixed right-4 z-50 pointer-events-none"
        style={{ top: `calc(env(safe-area-inset-top) + 580px)` }}
      >
        <button
          type="button"
          onClick={goOnboard}
          aria-label="Onboard new user"
          aria-busy={showOverlay}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-sm bg-black px-5 py-3
               text-white text-[12px] font-semibold shadow-xl shadow-black/40 active:scale-[0.98] transition disabled:opacity-70 disabled:cursor-not-allowed"
          disabled={showOverlay}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
            {showOverlay ? (
              <Spinner className="w-4 h-4 text-black" />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            )}
          </span>
          {showOverlay ? "Opening…" : "Onboard new user"}
        </button>
      </div>

      {/* Black commission bar */}
      <section className="mt-4 w-full bg-black px-6 py-6 h-28">
        <div className="flex items-center justify-between">
          {/* Left: label + amount + info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-300">
                Total Commission
              </span>

              {/* Info button */}
              <div className="relative">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-gray-500/60 text-white hover:bg-gray-800 w-4 h-4"
                  aria-label="Show withdrawable info"
                  aria-expanded={open}
                  aria-controls={tooltipId}
                  onClick={() => setOpen((v) => !v)}
                >
                  <Info className="w-3 h-3" />
                </button>

                {/* Tooltip */}
                {open && (
                  <div
                    id={tooltipId}
                    role="tooltip"
                    className="absolute z-10 left-0 mt-2 rounded-md bg-gray-900 text-gray-200 px-3 py-2 text-[10px] shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span>{pctLabel}</span>
                      <button
                        type="button"
                        aria-label="Close"
                        className="text-gray-400 hover:text-white"
                        onClick={() => setOpen(false)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* caret */}
                    <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-900 rotate-45" />
                  </div>
                )}
              </div>
            </div>

            <p className="mt-1 text-[22px] font-semibold text-white">
              {NGN.format(total)}
            </p>
          </div>

          {/* Right: Withdraw */}
          <button
            type="button"
            onClick={doWithdraw}
            aria-busy={isWithdrawing}
            className="shrink-0 rounded-lg bg-white text-black px-3 py-1.5 text-[12px] font-semibold hover:bg-gray-100 active:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            disabled={isWithdrawing}
          >
            {isWithdrawing && <Spinner className="w-3.5 h-3.5" />}
            {isWithdrawing ? "Processing…" : "Withdraw"}
          </button>
        </div>
      </section>
    </>
  );
}
