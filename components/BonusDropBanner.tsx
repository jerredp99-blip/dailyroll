"use client";

import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { openInExternalBrowser } from "@/lib/openExternalLink";

interface BonusDropBannerProps {
  postId?: string;
  dropCode?: string | null;
  targetUrl?: string | null;
  offerTitle?: string | null;
  casinoTag?: string | null;
  className?: string;
  onClaimed?: () => void;
}

export function BonusDropBanner({
  postId,
  dropCode,
  targetUrl,
  offerTitle,
  casinoTag,
  className = "",
  onClaimed,
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
    if (postId) {
      try {
        const stored = JSON.parse(localStorage.getItem("dailyroll_claimed_drops") || "[]");
        const list = Array.isArray(stored) ? stored : [];
        if (!list.includes(postId)) {
          localStorage.setItem("dailyroll_claimed_drops", JSON.stringify([...list, postId]));
        }
      } catch {
        // Ignore localStorage write errors
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dailyroll_drop_claimed", { detail: { postId } }));
      }
    }
    onClaimed?.();
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

  return (
    <div
      onClick={handleContainerClick}
      className={`relative overflow-hidden rounded-xl border border-emerald-500/40 border-l-4 border-l-emerald-400 bg-gradient-to-r from-emerald-950/70 via-[#0e2118]/85 to-zinc-900/90 py-2 px-2.5 sm:px-3 shadow-[0_2px_14px_rgba(16,185,129,0.1)] backdrop-blur transition-all duration-200 ${
        targetUrl ? "cursor-pointer hover:border-emerald-400/60" : ""
      } ${className}`}
    >
      {/* Ambient decorative glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-500/10 blur-xl" />

      {/* Optional Offer Title */}
      {offerTitle && (
        <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug mb-1.5">
          {offerTitle}
        </h4>
      )}

      {/* Promo Code Row (Compact) */}
      {dropCode && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-black/40 px-2.5 py-1 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400/80 shrink-0">
              CODE:
            </span>
            <code className="font-mono text-xs sm:text-sm font-black tracking-wider text-[#39ff6a] select-all truncate">
              {dropCode}
            </code>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold transition-all active:scale-95 shrink-0 ${
              copied
                ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                : "border-emerald-600/50 bg-[#14281e] text-emerald-200 hover:border-emerald-400 hover:bg-[#1a3327] hover:text-white"
            }`}
          >
            {copied ? (
              <>
                <Check size={11} className="text-[#39ff6a]" strokeWidth={2.5} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Action Row: Compact Claim Bonus Button */}
      {targetUrl && (
        <div>
          <button
            type="button"
            onClick={handleClaim}
            className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs sm:text-sm font-bold transition-all active:scale-[0.98] ${
              isClaimed
                ? "bg-emerald-950/40 text-emerald-300/80 border border-emerald-500/30 hover:bg-emerald-900/50 shadow-none"
                : "bg-gradient-to-r from-[#79b77f] to-[#39ff6a] text-[#09150e] shadow-[0_2px_10px_rgba(57,255,106,0.3)] hover:brightness-110"
            }`}
          >
            {isClaimed ? (
              <span>Claimed ✓</span>
            ) : (
              <span>Claim Bonus ↗</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default BonusDropBanner;
