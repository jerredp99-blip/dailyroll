"use client";

import { X } from "lucide-react";

interface BalancesIntroTooltipProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export function BalancesIntroTooltip({ isOpen, onDismiss }: BalancesIntroTooltipProps) {
  if (!isOpen) return null;

  return (
    <div
      role="tooltip"
      aria-live="polite"
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 z-40 w-60 sm:w-64 rounded-xl border border-emerald-500/30 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 text-left select-none"
    >
      {/* Top indicator arrow pip */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-l border-t border-emerald-500/30 bg-zinc-900/95" />

      {/* Header with Headline & Close Trigger */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-semibold text-emerald-400">
          💳 Casino Balances
        </span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close tooltip"
          className="text-zinc-500 hover:text-zinc-300 transition text-xs p-0.5"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body Copy */}
      <p className="text-[11px] text-zinc-300 mb-2 leading-relaxed">
        Your balance tracker can be viewed from here.
      </p>

      {/* Action Row */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/20 active:scale-95 transition cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

