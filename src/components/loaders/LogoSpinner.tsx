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
  /** Base diameter in px (before scale) */
  size?: number; // default: 64
  /** Horizontal travel span as fraction of viewport width (0..1) */
  travelFrac?: number; // default: 0.6  (±30vw)
  /** Travel speed in px/sec */
  speed?: number; // default: 240
  /** Minimum and maximum scale across the span */
  minScale?: number; // default: 0.85
  maxScale?: number; // default: 1.25
  /** Spin period (seconds per full turn) */
  spinPeriodSec?: number; // default: 0.9
  className?: string;
};

export default function LogoSpinner({
  show,
  src = "./uploads/Layer_x0020_1.png",
  size = 64,
  travelFrac = 0.6,
  speed = 240,
  minScale = 0.85,
  maxScale = 1.25,
  spinPeriodSec = 0.9,
  className = "",
}: Props) {
  if (!show) return null;

  const safeSrc = normalizeSrc(src);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // animation state
  const xRef = useRef(0); // px (centered origin)
  const dirRef = useRef(1); // +1 right, -1 left
  const angleRef = useRef(0); // degrees
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    const travelHalf = Math.max(40, (window.innerWidth * travelFrac) / 2);
    const spinDegPerSec = 360 / Math.max(0.1, spinPeriodSec);

    const step = (ts: number) => {
      const el = imgRef.current;
      if (!el) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      const last = lastTsRef.current ?? ts;
      const dt = Math.min(0.032, (ts - last) / 1000); // clamp for stability
      lastTsRef.current = ts;

      // move
      xRef.current += dirRef.current * speed * dt;

      // bounce at edges so it stays on-screen
      if (xRef.current > travelHalf) {
        xRef.current = travelHalf;
        dirRef.current = -1;
      } else if (xRef.current < -travelHalf) {
        xRef.current = -travelHalf;
        dirRef.current = 1;
      }

      // progressive scale across span (no reset)
      const tNorm = (xRef.current + travelHalf) / (2 * travelHalf); // 0..1
      const scale = minScale + (maxScale - minScale) * tNorm;

      // continuous spin
      angleRef.current = (angleRef.current + spinDegPerSec * dt) % 360;

      // apply ONE combined transform → no circular orbit bug
      el.style.transform = `translate3d(${xRef.current}px, 0, 0) scale(${scale}) rotate(${angleRef.current}deg)`;

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [travelFrac, speed, minScale, maxScale, spinPeriodSec]);

  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className={`fixed inset-0 z-[70] pointer-events-none flex items-center justify-center ${className}`}
    >
      <div className="relative">
        <Image
          ref={imgRef as any}
          src={safeSrc}
          alt="Loading"
          width={size}
          height={size}
          priority
          unoptimized
          style={{
            willChange: "transform",
            transformOrigin: "50% 50%",
          }}
        />
      </div>
    </div>
  );
}
