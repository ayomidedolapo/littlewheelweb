"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
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
  onOnboard,
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

  const showOverlay = navOverlay || forceOverlay;

  // draggable state
  const [floatPos, setFloatPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const floatRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef({
    isDown: false,
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const ignoreClickRef = useRef(false);

  // Initial bottom-right position
  useEffect(() => {
    if (typeof window === "undefined") return;

    setTimeout(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const rect = floatRef.current?.getBoundingClientRect();
      const width = rect?.width ?? 200;
      const height = rect?.height ?? 60;

      const padding = 16;

      setFloatPos({
        x: vw - width - padding,
        y: vh - height - 90,
      });
    }, 50);
  }, []);

  // keep overlay visible briefly
  useEffect(() => {
    if (!navOverlay) return;
    setForceOverlay(true);
    const t = setTimeout(() => setForceOverlay(false), 500);
    return () => clearTimeout(t);
  }, [navOverlay]);

  const goOnboard = async () => {
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false;
      return;
    }

    if (onOnboard) {
      setForceOverlay(true);
      try {
        await Promise.resolve(onOnboard());
      } finally {
        setTimeout(() => setForceOverlay(false), 400);
      }
      return;
    }

    startTransition(() => router.push("./onboard"));
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

  /* ===================== DRAG LOGIC ===================== */

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();

    dragRef.current = {
      isDown: true,
      dragging: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
    };

    setIsDragging(false);
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragRef.current.isDown) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      const threshold = 4;
      if (!dragRef.current.dragging) {
        if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
        dragRef.current.dragging = true;
        setIsDragging(true);
      }

      if (typeof window === "undefined") return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const rect = floatRef.current?.getBoundingClientRect();
      const width = rect?.width ?? 0;
      const height = rect?.height ?? 0;

      const padding = 0; // edge-to-edge

      const rawX = dragRef.current.originX + dx;
      const rawY = dragRef.current.originY + dy;

      const minX = padding;
      const minY = padding;
      const maxX = vw - width - padding;
const bottomPadding = 70; // adjust here
const maxY = vh - height - bottomPadding;


      setFloatPos({
        x: Math.min(Math.max(rawX, minX), maxX),
        y: Math.min(Math.max(rawY, minY), maxY),
      });
    };

    const up = () => {
      if (!dragRef.current.isDown) return;

      if (dragRef.current.dragging) ignoreClickRef.current = true;

      dragRef.current.isDown = false;
      dragRef.current.dragging = false;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  /* ===================== RENDER ===================== */

  return (
    <>
      <LogoSpinner show={showOverlay} />

      {/* Floating draggable CTA */}
      <div
        ref={floatRef}
        className="fixed z-50"
        style={{
          left: floatPos.x,
          top: floatPos.y,
          touchAction: "none",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onPointerDown={handlePointerDown}
      >
        <button
          type="button"
          onClick={goOnboard}
          aria-label="Onboard new user"
          aria-busy={showOverlay}
          className="inline-flex items-center gap-2 rounded-sm bg-black px-5 py-3
            text-white text-[12px] font-semibold shadow-xl shadow-black/40
            active:scale-[0.98] transition disabled:opacity-70 disabled:cursor-not-allowed"
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
          {/* Left: label + amount */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-300">Total Commission</span>

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

                    <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-900 rotate-45" />
                  </div>
                )}
              </div>
            </div>

            <p className="mt-1 text-[22px] font-semibold text-white">
              {NGN.format(total)}
            </p>
          </div>

          {/* Withdraw */}
          <button
            type="button"
            onClick={doWithdraw}
            aria-busy={isWithdrawing}
            className="shrink-0 rounded-lg bg-white text-black px-3 py-1.5 text-[12px] font-semibold
              hover:bg-gray-100 active:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
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
