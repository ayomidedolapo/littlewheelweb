// src/components/loaders/LogoSpinner.tsx
"use client";

import Image from "next/image";
import React, { useEffect, useRef } from "react";

/* Normalize local paths like "./uploads/foo.png" -> "/uploads/foo.png" */
function normalizeSrc(src: string): string {
  if (src.startsWith("./")) return "/" + src.slice(2);
  if (src.startsWith("/") || /^https?:\/\//i.test(src)) return src;
  return "/" + src.replace(/^\.?\/*/, "");
}

type Props = {
  show: boolean;
  /** Put the image in /public; default is your logo */
  src?: string; // default: "./uploads/Layer_x0020_1.png"
  /** Base diameter in px */
  size?: number; // default: 96
  /** Spin period (seconds per full turn) */
  spinPeriodSec?: number; // default: 0.9
  /** Backdrop color; set "" to disable */
  backdrop?: string; // default: "rgba(0,0,0,0.24)"
  /** Blur intensity for the backdrop */
  blurPx?: number; // default: 2  (lighter blur)
  /** Invert the image (turn black logo to white) */
  invert?: boolean; // default: true
  className?: string;
};

export default function LogoSpinner({
  show,
  src = "./uploads/Layer_x0020_1.png",
  size = 90,
  spinPeriodSec = 0.9,
  backdrop = "rgba(0,0,0,0.24)",
  blurPx = 2,
  invert = true,
  className = "",
}: Props) {
  if (!show) return null;

  const safeSrc = normalizeSrc(src);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);

  useEffect(() => {
    const spinDegPerSec = 360 / Math.max(0.1, spinPeriodSec);

    const step = (ts: number) => {
      const el = imgRef.current;
      if (!el) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      const last = lastTsRef.current ?? ts;
      const dt = Math.min(0.032, (ts - last) / 1000);
      lastTsRef.current = ts;

      angleRef.current = (angleRef.current + spinDegPerSec * dt) % 360;
      el.style.transform = `rotate(${angleRef.current}deg)`;

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [spinPeriodSec]);

  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className={`fixed inset-0 z-[70] ${className}`}
      style={{
        pointerEvents: "none",
        background: backdrop,
        backdropFilter: `blur(${blurPx}px)`,
        WebkitBackdropFilter: `blur(${blurPx}px)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Centered spinner */}
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.22))",
        }}
      >
        <Image
          ref={imgRef as any}
          src={safeSrc}
          alt="Loading"
          width={size}
          height={size}
          priority
          unoptimized
          style={{
            willChange: "transform, filter",
            transformOrigin: "50% 50%",
            display: "block",
            // invert the dark logo to white, and lift mid-tones so it's crisp
            filter: invert
              ? "invert(1) brightness(1.2) contrast(1.05)"
              : undefined,
          }}
        />
      </div>
    </div>
  );
}
