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

  // Sync claimed state from localStorage for persistence across reloads & cross-tab
  useEffect(() => {
    if (!postId) return;
    const checkClaimed = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("dailyroll_claimed_drops") || "[]");
        if (Array.isArray(stored) && stored.includes(postId)) {
          setIsClaimed(true);
        } else {
          setIsClaimed(false);
        }
      } catch {
        // Ignore localStorage read errors
      }
    };

    checkClaimed();

    const handleCustomClaim = (e: Event) => {
      const customEvent = e as CustomEvent<{ postId: string }>;
      if (customEvent.detail?.postId === postId) {
        setIsClaimed(true);
      }
    };

    window.addEventListener("storage", checkClaimed);
    window.addEventListener("dailyroll_drop_claimed", handleCustomClaim);
    return () => {
      window.removeEventListener("storage", checkClaimed);
      window.removeEventListener("dailyroll_drop_claimed", handleCustomClaim);
    };
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

  return (
    <div className={`w-full space-y-2 ${className}`}>
      {/* Optional Offer Title */}
      {offerTitle && (
        <h4 className="w-full text-center uppercase tracking-wider font-extrabold text-base sm:text-lg text-white my-1.5 leading-snug">
          {offerTitle}
        </h4>
      )}

      {/* Promo Code Row (Compact) */}
      {dropCode && (
        <div className="flex h-9 items-center justify-between gap-2 rounded-lg border border-emerald-500/25 bg-black/40 px-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80 shrink-0">
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
            className={`w-full h-9 sm:h-10 flex items-center justify-center gap-1.5 rounded-lg transition-all active:scale-[0.98] ${
              isClaimed
                ? "bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium text-sm shadow-none"
                : "bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-sm"
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
