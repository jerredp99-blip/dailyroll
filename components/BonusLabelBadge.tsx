"use client";

import React from "react";
import { Sparkles } from "lucide-react";

/**
 * Animated Prize Wheel SVG Badge inspired by KingPrize Lucky Wheel.
 * Circular multi-segment wheel with golden hub and top ticker peg.
 */
export function PrizeWheelIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${className} select-none`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]"
      >
        {/* Rotating Wheel Group */}
        <g className="animate-wheel-spin origin-[12px_12px]">
          {/* Slice 1 (0° to 45°) - Emerald Green */}
          <path
            d="M 12 12 L 12 2.5 A 9.5 9.5 0 0 1 18.72 5.28 Z"
            fill="#10b981"
          />
          {/* Slice 2 (45° to 90°) - Amber Gold */}
          <path
            d="M 12 12 L 18.72 5.28 A 9.5 9.5 0 0 1 21.5 12 Z"
            fill="#f59e0b"
          />
          {/* Slice 3 (90° to 135°) - Vibrant Purple */}
          <path
            d="M 12 12 L 21.5 12 A 9.5 9.5 0 0 1 18.72 18.72 Z"
            fill="#8b5cf6"
          />
          {/* Slice 4 (135° to 180°) - Electric Cyan */}
          <path
            d="M 12 12 L 18.72 18.72 A 9.5 9.5 0 0 1 12 21.5 Z"
            fill="#06b6d4"
          />
          {/* Slice 5 (180° to 225°) - Hot Pink */}
          <path
            d="M 12 12 L 12 21.5 A 9.5 9.5 0 0 1 5.28 18.72 Z"
            fill="#ec4899"
          />
          {/* Slice 6 (225° to 270°) - Golden Yellow */}
          <path
            d="M 12 12 L 5.28 18.72 A 9.5 9.5 0 0 1 2.5 12 Z"
            fill="#eab308"
          />
          {/* Slice 7 (270° to 315°) - Deep Blue */}
          <path
            d="M 12 12 L 2.5 12 A 9.5 9.5 0 0 1 5.28 5.28 Z"
            fill="#3b82f6"
          />
          {/* Slice 8 (315° to 360°) - Crimson Coral */}
          <path
            d="M 12 12 L 5.28 5.28 A 9.5 9.5 0 0 1 12 2.5 Z"
            fill="#f43f5e"
          />

          {/* Outer Rim & Rim Pegs */}
          <circle
            cx="12"
            cy="12"
            r="9.5"
            fill="none"
            stroke="#fef08a"
            strokeWidth="1.2"
          />
          <circle cx="12" cy="2.5" r="0.6" fill="#ffffff" />
          <circle cx="18.72" cy="5.28" r="0.6" fill="#ffffff" />
          <circle cx="21.5" cy="12" r="0.6" fill="#ffffff" />
          <circle cx="18.72" cy="18.72" r="0.6" fill="#ffffff" />
          <circle cx="12" cy="21.5" r="0.6" fill="#ffffff" />
          <circle cx="5.28" cy="18.72" r="0.6" fill="#ffffff" />
          <circle cx="2.5" cy="12" r="0.6" fill="#ffffff" />
          <circle cx="5.28" cy="5.28" r="0.6" fill="#ffffff" />

          {/* Center Hub */}
          <circle
            cx="12"
            cy="12"
            r="2.5"
            fill="#fbbf24"
            stroke="#78350f"
            strokeWidth="0.6"
          />
          <circle cx="11.4" cy="11.4" r="0.7" fill="#ffffff" opacity="0.8" />
        </g>

        {/* Stationary Ticker Needle pinned at top pointing down */}
        <polygon
          points="12,5.2 9.6,0.6 14.4,0.6"
          fill="#ef4444"
          stroke="#7f1d1d"
          strokeWidth="0.5"
          filter="drop-shadow(0 1px 1px rgba(0,0,0,0.5))"
        />
        <circle cx="12" cy="1.6" r="0.8" fill="#fca5a5" />
      </svg>
    </span>
  );
}

/**
 * Animated Scratchcard SVG Icon inspired by KingPrize Scratchers.
 * Mini 2x3 holographic ticket grid with foil sheen and sparkle.
 */
export function ScratchcardIcon({ className = "w-4 h-3.5" }: { className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${className} select-none`}>
      <svg
        viewBox="0 0 20 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]"
      >
        <defs>
          <linearGradient id="scCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4c1d95" />
            <stop offset="50%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#831843" />
          </linearGradient>
          <linearGradient id="scFoilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0e7ff" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>

        {/* Card Body */}
        <rect
          x="0.8"
          y="0.8"
          width="18.4"
          height="14.4"
          rx="2.5"
          fill="url(#scCardGrad)"
          stroke="#c084fc"
          strokeWidth="0.8"
        />

        {/* 2x3 Scratch Grid Cells */}
        <rect x="2.6" y="3.2" width="3.8" height="3.8" rx="0.8" fill="url(#scFoilGrad)" opacity="0.9" />
        <rect x="8.1" y="3.2" width="3.8" height="3.8" rx="0.8" fill="url(#scFoilGrad)" opacity="0.9" />
        <rect x="13.6" y="3.2" width="3.8" height="3.8" rx="0.8" fill="url(#scFoilGrad)" opacity="0.9" />
        <rect x="2.6" y="8.8" width="3.8" height="3.8" rx="0.8" fill="url(#scFoilGrad)" opacity="0.9" />
        <rect x="8.1" y="8.8" width="3.8" height="3.8" rx="0.8" fill="url(#scFoilGrad)" opacity="0.9" />
        <rect x="13.6" y="8.8" width="3.8" height="3.8" rx="0.8" fill="url(#scFoilGrad)" opacity="0.9" />

        {/* Micro Lucky Star in top corner */}
        <path
          d="M 16.5 1.5 L 17 2.8 L 18.3 3.3 L 17 3.8 L 16.5 5.1 L 16 3.8 L 14.7 3.3 L 16 2.8 Z"
          fill="#fde047"
          className="animate-pulse"
        />
      </svg>
    </span>
  );
}

/**
 * Capsule badge for Lucky Wheel.
 */
export function PrizeWheelBadge({ showLabel = true }: { showLabel?: boolean }) {
  return (
    <span
      title="Lucky Wheel"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-purple-500/15 border border-amber-400/40 text-amber-300 font-extrabold text-[10px] sm:text-[11px] leading-tight align-middle shrink-0 mx-0.5 shadow-sm hover:border-amber-400/70 transition-all cursor-default select-none"
    >
      <PrizeWheelIcon className="w-4 h-4 sm:w-[17px] sm:h-[17px]" />
      {showLabel && <span className="font-extrabold uppercase tracking-tight text-amber-300">Wheel</span>}
    </span>
  );
}

/**
 * Capsule badge for Daily Scratchcard with holographic shimmer sweep.
 */
export function ScratchcardBadge({ showLabel = true }: { showLabel?: boolean }) {
  return (
    <span
      title="Daily Scratchcard"
      className="relative overflow-hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gradient-to-tr from-purple-950/60 via-indigo-900/50 to-pink-950/60 border border-purple-400/40 text-purple-300 font-extrabold text-[10px] sm:text-[11px] leading-tight align-middle shrink-0 mx-0.5 shadow-sm hover:border-purple-400/70 transition-all cursor-default select-none"
    >
      <ScratchcardIcon className="w-4 h-3.5" />
      {showLabel && <span className="font-extrabold uppercase tracking-tight text-purple-300">Scratcher</span>}
      {/* Holographic shimmer light sweep */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-scratch-shimmer pointer-events-none"
      />
    </span>
  );
}

/**
 * Tokenizes a bonus string, replacing 'Wheel' and 'Scratchcard' keywords
 * with interactive animated SVG badges while keeping other text intact.
 */
export function renderBonusLabel(label?: string | null): React.ReactNode {
  if (!label || typeof label !== "string") return null;

  // Split on "Wheel", "Scratchcard", "Scratch card", "Scratch-card" case-insensitively
  const regex = /(\bwheel\b|\bscratch-?card\b|\bscratch\s+card\b)/gi;
  const parts = label.split(regex);

  // If no match found, return the plain string
  if (parts.length === 1) {
    return label;
  }

  return parts.map((part, index) => {
    const lower = part.toLowerCase().trim();

    if (lower === "wheel") {
      return <PrizeWheelBadge key={`wheel-${index}`} />;
    }

    if (lower === "scratchcard" || lower === "scratch card" || lower === "scratch-card") {
      return <ScratchcardBadge key={`scratchcard-${index}`} />;
    }

    return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
  });
}

/**
 * Tokenizes a bonus string, replacing 'Wheel' and 'Scratchcard' keywords
 * with interactive animated SVG badges while keeping other text intact.
 */
export function renderClaimBadge(label?: string | null): React.ReactNode {
  if (!label || typeof label !== "string") return null;

  const hasWheel = /\bwheel\b/i.test(label);
  const hasScratch = /(\bscratch-?card\b|\bscratch\s+card\b)/i.test(label);

  if (!hasWheel && !hasScratch) {
    return label;
  }

  // Strip "Wheel", "Scratchcard", "Scratch card" and loose "+", ","
  const cleanText = label
    .replace(/(\bwheel\b|\bscratch-?card\b|\bscratch\s+card\b)/gi, "")
    .replace(/[+,\s]+$/g, "")
    .replace(/^[+,\s]+/g, "")
    .trim();

  const icons: React.ReactNode[] = [];
  if (hasWheel) {
    icons.push(
      <span key="wheel" title="Lucky Wheel" className="inline-flex items-center justify-center shrink-0">
        <PrizeWheelIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm" />
      </span>
    );
  }
  if (hasScratch) {
    icons.push(
      <span key="scratch" title="Daily Scratchcard" className="inline-flex items-center justify-center shrink-0">
        <ScratchcardIcon className="w-3.5 h-3 sm:w-4 sm:h-3.5 drop-shadow-sm" />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 flex-nowrap whitespace-nowrap">
      {cleanText ? (
        <span className="font-extrabold">{cleanText}</span>
      ) : (
        <span>{hasWheel && hasScratch ? "Bonus" : hasWheel ? "Wheel" : "Scratcher"}</span>
      )}
      <span className="inline-flex items-center -space-x-1 shrink-0">
        {icons}
      </span>
    </span>
  );
}

/**
 * Universal BonusLabelBadge component for easy JSX rendering.
 */
export function BonusLabelBadge({
  label,
  className = "",
}: {
  label?: string | null;
  className?: string;
}) {
  if (!label) return null;

  return (
    <span className={`inline-flex items-center flex-wrap gap-0.5 align-middle ${className}`}>
      {renderBonusLabel(label)}
    </span>
  );
}

export default BonusLabelBadge;

