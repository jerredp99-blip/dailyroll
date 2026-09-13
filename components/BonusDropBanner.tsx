"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Sparkles, Zap, Gift } from "lucide-react";
import { openInExternalBrowser } from "@/lib/openExternalLink";

interface BonusDropBannerProps {
  dropCode?: string | null;
  targetUrl?: string | null;
  offerTitle?: string | null;
  casinoTag?: string | null;
  className?: string;
}

export function BonusDropBanner({
  dropCode,
  targetUrl,
  offerTitle,
  casinoTag,
  className = "",
}: BonusDropBannerProps) {
  const [copied, setCopied] = useState(false);

  // If there is neither a drop code nor a target URL, don't render an empty banner
  if (!dropCode && !targetUrl) {
    return null;
  }

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dropCode) return;
    navigator.clipboard.writeText(dropCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetUrl) {
      openInExternalBrowser(targetUrl);
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!targetUrl) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, [data-stop-propagation]")) {
      return;
    }
    openInExternalBrowser(targetUrl);
  };

  return (
    <div
      onClick={handleContainerClick}
      className={`relative overflow-hidden rounded-2xl border border-emerald-500/40 border-l-4 border-l-emerald-400 bg-gradient-to-r from-emerald-950/70 via-[#0e2118]/85 to-zinc-900/90 p-4 sm:p-4.5 shadow-[0_4px_25px_rgba(16,185,129,0.14)] backdrop-blur transition-all duration-200 ${
        targetUrl ? "cursor-pointer hover:border-emerald-400/60 hover:shadow-[0_6px_30px_rgba(16,185,129,0.22)]" : ""
      } ${className}`}
    >
      {/* Ambient decorative glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-teal-500/10 blur-2xl" />

      {/* 1. Top Row: ACTIVE DROP Micro-badge + Pulsing Dot + Expiration Tag */}
      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Pulsing indicator micro-badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#39ff6a] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#39ff6a]" />
            </span>
            <span>ACTIVE DROP</span>
          </span>

          {casinoTag && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#13271d] border border-emerald-600/30 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
              {casinoTag}
            </span>
          )}
        </div>

        {/* Expiration Tag */}
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300/95 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-md">
          <Zap size={12} className="text-amber-400 fill-amber-400" />
          <span>Limited Time</span>
        </span>
      </div>

      {/* 2. Middle Row: Bold Promo Code / Reward Title */}
      <div className="relative mt-3 flex flex-col gap-1.5">
        {offerTitle && (
          <h4 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
            {offerTitle}
          </h4>
        )}

        {dropCode && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300/80">
              PROMO CODE:
            </span>
            <code className="inline-block rounded-lg border border-emerald-500/40 bg-black/50 px-2.5 py-1 font-mono text-xs sm:text-sm font-black tracking-widest text-[#39ff6a] select-all shadow-inner">
              {dropCode}
            </code>
          </div>
        )}
      </div>

      {/* 3. Action Row: Compact Copy Code & Prominent Claim Bonus Buttons */}
      <div className="relative mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-900/40">
        {dropCode && (
          <button
            type="button"
            onClick={handleCopyCode}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all active:scale-95 shrink-0 ${
              copied
                ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(57,255,106,0.3)]"
                : "border-emerald-600/50 bg-[#14281e] text-emerald-200 hover:border-emerald-400 hover:bg-[#1a3327] hover:text-white"
            }`}
          >
            {copied ? (
              <>
                <Check size={14} className="text-[#39ff6a]" strokeWidth={2.5} />
                <span>Copied! ✓</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Code</span>
              </>
            )}
          </button>
        )}

        {targetUrl && (
          <button
            type="button"
            onClick={handleClaim}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#79b77f] to-[#39ff6a] px-4 py-2 text-xs sm:text-sm font-black text-[#09150e] shadow-[0_3px_15px_rgba(57,255,106,0.35)] transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.98]"
          >
            <span>Claim Bonus</span>
            <ExternalLink size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}

export default BonusDropBanner;

