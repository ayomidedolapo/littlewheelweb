/* Lightweight vector frame to avoid moiré/grids when exported */
import React from "react";

type Props = {
  radius?: number;
  stroke?: string;
  stroke2?: string;
  scallopRadius?: number;
  showScallops?: boolean;
  className?: string;
};

export default function ReceiptFrame({
  radius = 28,
  stroke = "#E5E7EB", // gray-200
  stroke2 = "#F3F4F6", // gray-100
  scallopRadius = 10,
  showScallops = true,
  className = "",
}: Props) {
  // Viewbox chosen to be generous; scales to container size with preserveAspectRatio="none"
  const w = 600;
  const h = 900;
  const scallopGap = scallopRadius * 2;
  const scallopCount = Math.ceil(w / scallopGap) + 1;

  const scallops: JSX.Element[] = [];
  if (showScallops && scallopRadius > 0) {
    for (let i = 0; i < scallopCount; i++) {
      const cx = i * scallopGap;
      scallops.push(
        <circle key={i} cx={cx} cy={h - 1} r={scallopRadius} fill="#ffffff" />
      );
    }
  }

  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {/* Outer card */}
      <rect x={1} y={1} width={w - 2} height={h - 2} rx={radius} ry={radius} fill="#ffffff" stroke={stroke} strokeWidth={2} />
      {/* Inner hairline for subtle depth */}
      <rect x={6} y={6} width={w - 12} height={h - 12} rx={radius - 6} ry={radius - 6} fill="none" stroke={stroke2} strokeWidth={1} />
      {/* Bottom scallops (punch-outs) */}
      <g clipPath="url(#clip)">{scallops}</g>
      <defs>
        {/* Clip to rounded rect area so scallops only affect bottom edge */}
        <clipPath id="clip">
          <rect x={1} y={1} width={w - 2} height={h - 2} rx={radius} ry={radius} />
        </clipPath>
      </defs>
    </svg>
  );
}
