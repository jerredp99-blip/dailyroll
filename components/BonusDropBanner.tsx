"use client";

import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, Lock, Plus } from "lucide-react";
import { openInExternalBrowser } from "@/lib/openExternalLink";
import { notifyDropClaimed, getClaimedDropIds } from "@/lib/dropsStore";
import { getCasinoDeepLink } from "@/lib/casinoLinks";

interface BonusDropBannerProps {
  postId?: string;
  dropCode?: string | null;
  targetUrl?: string | null;
  offerTitle?: string | null;
  casinoTag?: string | null;
  casinoName?: string | null;
  isRollcallAdded?: boolean;
  className?: string;
  onClaimed?: () => void;
}

export function BonusDropBanner({
  postId,
  dropCode,
  targetUrl,
  offerTitle,
  casinoTag,
  casinoName,
  isRollcallAdded = true,
  className = "",
  onClaimed,
}: BonusDropBannerProps) {
  const [copied, setCopied] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [unlocked, setUnlocked] = useState(isRollcallAdded);

  useEffect(() => {
    setUnlocked(isRollcallAdded);
  }, [isRollcallAdded]);

  // Sync claimed state from localStorage for persistence across reloads & cross-tab
  useEffect(() => {
    if (!postId) return;
    const checkClaimed = () => {
      const stored = getClaimedDropIds();
      setIsClaimed(stored.includes(postId));
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
      notifyDropClaimed(postId);
    }
    onClaimed?.();
  };

  if (!dropCode && !targetUrl) {
    return null;
  }

  const effectiveCasinoName =
    casinoName ||
    (casinoTag ? casinoTag.replace(/^[$#]+/, "") : "") ||
    "Casino";

  const affiliateUrl =
    targetUrl || getCasinoDeepLink({ name: effectiveCasinoName });

  const handleAddCasinoAndUnlock = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openInExternalBrowser(affiliateUrl);
    window.dispatchEvent(
      new CustomEvent("dailyroll_add_casino", {
        detail: { casinoName: effectiveCasinoName, affiliateUrl },
      })
    );
    setUnlocked(true);
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!unlocked) {
      handleAddCasinoAndUnlock(e);
      return;
    }
    if (!dropCode) return;
    navigator.clipboard.writeText(dropCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!unlocked) {
      handleAddCasinoAndUnlock(e);
      return;
    }
    if (targetUrl) {
      openInExternalBrowser(targetUrl);
      markAsClaimed();
    }
  };

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      {/* Optional Offer Title */}
      {offerTitle && (
        <h4 className="w-full text-xs sm:text-sm font-black text-white tracking-wide truncate whitespace-nowrap my-0.5">
          {offerTitle}
        </h4>
      )}

      {/* Promo Code Row */}
      {dropCode && (
        <div className="bg-zinc-950/80 border border-dashed border-zinc-700/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0 flex items-center gap-1">
              {!unlocked && <Lock size={10} className="text-amber-400" />}
              CODE:
            </span>
            {unlocked ? (
              <code className="font-mono text-xs sm:text-sm font-bold tracking-wider text-emerald-400 select-all truncate">
                {dropCode}
              </code>
            ) : (
              <span className="font-mono text-xs text-zinc-500 italic select-none">
                •••••••• (Add to Rollcall to unlock)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={unlocked ? handleCopyCode : handleAddCasinoAndUnlock}
            className={`border border-zinc-700/80 hover:border-zinc-600 bg-zinc-900 text-zinc-300 hover:text-white px-2 py-0.5 text-[11px] font-semibold rounded-md transition active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer ${
              copied ? "border-emerald-500 text-emerald-400" : ""
            }`}
          >
            {copied ? (
              <>
                <Check size={11} className="text-emerald-400" strokeWidth={2.5} />
                <span>Copied</span>
              </>
            ) : unlocked ? (
              <>
                <Copy size={11} />
                <span>Copy</span>
              </>
            ) : (
              <>
                <Plus size={11} className="text-amber-400" />
                <span>Unlock</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Action Row */}
      <div className="w-full flex justify-end pt-0.5" data-stop-propagation="true" onClick={(e) => e.stopPropagation()}>
        {isClaimed ? (
          <a
            href={affiliateUrl || targetUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            title="Revisit bonus drop link"
            className="h-8 px-3 rounded-lg text-xs font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer select-none"
          >
            <span>Claimed</span>
            <Check className="w-3.5 h-3.5 text-zinc-500" />
          </a>
        ) : !unlocked ? (
          <button
            type="button"
            onClick={handleAddCasinoAndUnlock}
            className="h-8 px-3 rounded-lg text-xs font-black text-zinc-950 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 hover:brightness-110 active:translate-y-0.5 border border-emerald-300/50 shadow-[0_2px_10px_rgba(16,185,129,0.4)] whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all select-none cursor-pointer"
          >
            <Plus size={13} strokeWidth={3} className="text-zinc-950" />
            <span>+ Add {effectiveCasinoName} to Claim</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-950 stroke-[2.5]" />
          </button>
        ) : (
          <a
            href={affiliateUrl || targetUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markAsClaimed}
            className="h-8 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 hover:brightness-110 active:translate-y-0.5 border-t border-emerald-300/40 shadow-[0_2px_8px_rgba(16,185,129,0.35)] whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all select-none"
          >
            <span>Claim Bonus</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-200 stroke-[2.5]" />
          </a>
        )}
      </div>
    </div>
  );
}

export default BonusDropBanner;
