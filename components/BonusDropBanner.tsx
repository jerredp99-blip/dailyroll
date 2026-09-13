"use client";

import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, Zap } from "lucide-react";
import { openInExternalBrowser } from "@/lib/openExternalLink";

interface BonusDropBannerProps {
  postId?: string;
  dropCode?: string | null;
  targetUrl?: string | null;
  offerTitle?: string | null;
  casinoTag?: string | null;
  className?: string;
}

export function BonusDropBanner({
  postId,
  dropCode,
  targetUrl,
  offerTitle,
  casinoTag,
  className = "",
}: BonusDropBannerProps) {
  const [copied, setCopied] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);

  // Sync claimed state from localStorage for persistence across reloads
  useEffect(() => {
    if (!postId) return;
    try {
      const stored = JSON.parse(localStorage.getItem("dailyroll_claimed_drops") || "[]");
      if (Array.isArray(stored) && stored.includes(postId)) {
        setIsClaimed(true);
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, [postId]);

  const markAsClaimed = () => {
    setIsClaimed(true);
    if (!postId) return;
    try {
      const stored = JSON.parse(localStorage.getItem("dailyroll_claimed_drops") || "[]");
      const list = Array.isArray(stored) ? stored : [];
      if (!list.includes(postId)) {
        localStorage.setItem("dailyroll_claimed_drops", JSON.stringify([...list, postId]));
      }
    } catch {
      // Ignore localStorage write errors
    }
  };

  // If there is neither a drop code nor a target URL, don't render an empty banner
  if (!dropCode && !targetUrl) {
    return null;
  }

  const handleCopyCode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropCode) return;
    navigator.clipboard.writeText(dropCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (targetUrl) {
      openInExternalBrowser(targetUrl);
      markAsClaimed();
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!targetUrl) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, [data-stop-propagation]")) {
      return;
    }
    openInExternalBrowser(targetUrl);
    markAsClaimed();
  };

  const cleanCasinoTag =
    casinoTag &&
    !["BONUS_CODE", "BONUS_DROP", "DROP_CODE", "PROMO_CODE", "DISCUSSION", "BIG_WIN"].includes(
      casinoTag.toUpperCase()
    )
      ? casinoTag
      : null;

  return (
    <div
      onClick={handleContainerClick}
      className={`relative overflow-hidden rounded-2xl border border-emerald-500/40 border-l-4 border-l-emerald-400 bg-gradient-to-r from-emerald-950/70 via-[#0e2118]/85 to-zinc-900/90 p-3 sm:p-3.5 shadow-[0_4px_22px_rgba(16,185,129,0.12)] backdrop-blur transition-all duration-200 ${
        targetUrl ? "cursor-pointer hover:border-emerald-400/60 hover:shadow-[0_6px_28px_rgba(16,185,129,0.2)]" : ""
      } ${className}`}
    >
      {/* Ambient decorative glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" />

      {/* 1. Top Row: Active Drop Micro-badge + Visited tag + Expiration Tag */}
      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Pulsing indicator micro-badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#39ff6a] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#39ff6a]" />
            </span>
            <span>ACTIVE DROP</span>
          </span>

          {isClaimed && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/70 px-2 py-0.5 text-[10px] font-bold text-emerald-300/90">
              ✓ Visited
            </span>
          )}

          {cleanCasinoTag && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#13271d] border border-emerald-600/30 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
              {cleanCasinoTag}
            </span>
          )}
        </div>

        {/* Expiration Tag */}
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-amber-300/95 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-md">
          <Zap size={12} className="text-amber-400 fill-amber-400" />
          <span>Limited Time</span>
        </span>
      </div>

      {/* 2. Optional Offer Title (if provided separately from body headline) */}
      {offerTitle && (
        <div className="relative mt-2">
          <h4 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
            {offerTitle}
          </h4>
        </div>
      )}

      {/* 3. Promo Code Row (Streamlined with integrated Copy button) */}
      {dropCode && (
        <div className="relative mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-black/40 px-3 py-1.5 sm:py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300/80 shrink-0">
              CODE:
            </span>
            <code className="font-mono text-xs sm:text-sm font-black tracking-widest text-[#39ff6a] select-all truncate">
              {dropCode}
            </code>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all active:scale-95 shrink-0 ${
              copied
                ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(57,255,106,0.3)]"
                : "border-emerald-600/50 bg-[#14281e] text-emerald-200 hover:border-emerald-400 hover:bg-[#1a3327] hover:text-white"
            }`}
          >
            {copied ? (
              <>
                <Check size={13} className="text-[#39ff6a]" strokeWidth={2.5} />
                <span>Copied! ✓</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 4. Action Row: Full-width / Prominent Claim Bonus Button */}
      {targetUrl && (
        <div className="relative mt-2.5 pt-1">
          <button
            type="button"
            onClick={handleClaim}
            className={`w-full flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-black transition-all active:scale-[0.98] ${
              isClaimed
                ? "bg-emerald-950/40 text-emerald-300/90 border border-emerald-500/30 hover:bg-emerald-900/50 hover:border-emerald-400/50 shadow-sm"
                : "bg-gradient-to-r from-[#79b77f] to-[#39ff6a] text-[#09150e] shadow-[0_3px_15px_rgba(57,255,106,0.35)] hover:brightness-110 hover:scale-[1.005]"
            }`}
          >
            {isClaimed ? (
              <span className="flex items-center gap-1.5 font-bold">
                <span>Claimed ✓</span>
                <span className="text-[11px] font-normal opacity-80">(Reopen ↗)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-black">
                <span>Claim Bonus</span>
                <ExternalLink size={14} strokeWidth={2.5} />
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default BonusDropBanner;
