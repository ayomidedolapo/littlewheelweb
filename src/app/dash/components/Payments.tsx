"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Image from "next/image";

/* ✅ Logo spinner overlay */
import LogoSpinner from "../../../components/loaders/LogoSpinner";

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
  // kept for compatibility but no longer used in the UI
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
  const router = useRouter();

  // navigation/loading states (for onboard CTA)
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

  // keep overlay visible briefly after nav
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

  /* ===================== PAYMENT SHORTCUTS ===================== */

  const payments = [
     {
      key: "data",
      label: "DATA",
      route: "/dash/data",
    },
    {
      key: "airtime",
      label: "AIRTIME",
      route: "/dash/airtime",
    },
    {
      key: "electricity",
      label: "ELECTRICITY",
      route: "/dash/electricity",
    },
    {
      key: "cable",
      label: "CABLE TV",
      route: "/dash/cable-tv",
    },
    {
      key: "education",
      label: "EDUCATION",
      route: "/dash/payments/education",
    },
  ];

  const handlePaymentClick = (route: string) => {
    startTransition(() => router.push(route));
  };

  /* ===================== RENDER ===================== */

  return (
    <>
      <LogoSpinner show={showOverlay} />

      {/* Floating draggable CTA (unchanged) */}
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

      {/* Payments section (new UI) */}
      <section className=" w-full bg-[#F9FAFB] px-6 py-4">
        <h2 className="text-md font-semibold text-[#000000] mb-3">
          Payments
        </h2>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {payments.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handlePaymentClick(item.route)}
              className="min-w-[96px] max-w-[104px] h-[96px] rounded-2xl bg-white flex flex-col items-center justify-center gap-3 active:scale-[0.97] transition-transform"
            >
              {/* Icon box */}
              <div className="h-7 w-7 flex items-center justify-center">
                <Image
                  src="/uploads/Group.png"
                  alt={item.label}
                  className="text-black"
                  width={16}
                  height={16}
                />
              </div>

              {/* Label */}
              <span className="text-[11px] font-semibold tracking-[0.12em] text-[#101828]">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
