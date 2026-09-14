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
        <div className="bg-zinc-950/60 border border-dashed border-zinc-700 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">
              CODE:
            </span>
            <code className="font-mono text-xs sm:text-sm font-bold tracking-wider text-emerald-400 select-all truncate">
              {dropCode}
            </code>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className={`border border-zinc-700 hover:border-zinc-600 bg-zinc-900 text-zinc-300 hover:text-white px-2.5 py-1 text-[11px] font-semibold rounded-md transition active:scale-95 flex items-center gap-1 shrink-0 ${
              copied ? "border-emerald-500 text-emerald-400" : ""
            }`}
          >
            {copied ? (
              <>
                <Check size={11} className="text-emerald-400" strokeWidth={2.5} />
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

      {/* Action Row: Defined High-Contrast Claim Bonus Action Button */}
      {targetUrl && (
        <div className="w-full flex justify-center pt-0.5">
          <button
            type="button"
            onClick={handleClaim}
            className={`w-full max-w-xs mx-auto h-10 px-4 rounded-lg flex items-center justify-center text-sm font-bold tracking-wide cursor-pointer select-none transition-all active:scale-[0.98] ${
              isClaimed
                ? "bg-zinc-800/80 text-zinc-400 border border-zinc-700 font-medium"
                : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-md shadow-emerald-500/20"
            }`}
          >
            {isClaimed ? "Claimed ✓" : "Claim Bonus ↗"}
          </button>
        </div>
      )}
    </div>
  );
}

export default BonusDropBanner;
