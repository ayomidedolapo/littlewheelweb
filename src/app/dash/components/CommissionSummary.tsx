"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { Info, X, Plus } from "lucide-react";

const NGN = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
});

export default function CommissionSummary({
  total = 60000,
  withdrawablePct = 0.7,
  onWithdraw,
  onOnboard,
}: {
  total?: number;
  withdrawablePct?: number; // e.g. 0.7 for 70%
  onWithdraw?: () => void;
  onOnboard?: () => void; // handler for the floating CTA
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const router = useRouter();

  const pctLabel = `${Math.round(withdrawablePct * 100)}% withdrawable`;

  return (
    <>
      {/* Floating CTA — right side, brought down below the Withdraw button level */}
      <div
        className="fixed right-4 z-50 pointer-events-none"
        style={{ top: `calc(env(safe-area-inset-top) + 500px)` }}
      >
        <button
          type="button"
          onClick={() => router.push("./onboard")}
          aria-label="Onboard new user"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-sm bg-black px-5 py-3
               text-white text-[12px] font-semibold shadow-xl shadow-black/40 active:scale-[0.98] transition"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Onboard new user
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
            onClick={onWithdraw}
            className="shrink-0 rounded-lg bg-white text-black px-3 py-1.5 text-[12px] font-semibold hover:bg-gray-100 active:bg-gray-200"
          >
            Withdraw
          </button>
        </div>
      </section>
    </>
  );
}
