"use client";

import React from "react";
import { Check, ExternalLink } from "lucide-react";

export interface BonusDropItem {
  id: string;
  claimUrl?: string;
  targetUrl?: string;
  linkUrl?: string;
  dropCode?: string | null;
  content?: string;
  title?: string;
  authorName?: string;
  createdAt?: string;
  casinoName?: string;
  casinoId?: string;
}

export interface BonusDropCardProps {
  drop: BonusDropItem;
  isClaimed?: boolean;
  onClaimDrop?: (id: string) => void;
  className?: string;
}

export function BonusDropCard({
  drop,
  isClaimed = false,
  onClaimDrop,
  className = "",
}: BonusDropCardProps) {
  const claimUrl = drop.claimUrl || drop.targetUrl || drop.linkUrl || "#";

  const handleClaimDrop = (id: string) => {
    onClaimDrop?.(id);
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 ${className}`}>
      <div className="flex-1 min-w-0 pr-3">
        <h4 className="text-xs sm:text-sm font-black text-white truncate">
          {drop.content || drop.title || "Bonus Drop"}
        </h4>
        {drop.dropCode && (
          <span className="text-[11px] font-mono text-amber-300 font-bold">
            Code: {drop.dropCode}
          </span>
        )}
      </div>

      {isClaimed ? (
        <a
          href={claimUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Revisit bonus drop link"
          className="h-8 px-3 rounded-lg text-xs font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer select-none"
        >
          <span>Claimed</span>
          <Check className="w-3.5 h-3.5 text-zinc-500" />
        </a>
      ) : (
        <a
          href={claimUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleClaimDrop(drop.id)}
          className="h-8 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 hover:brightness-110 active:translate-y-0.5 border-t border-emerald-300/40 shadow-[0_2px_8px_rgba(16,185,129,0.35)] whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all select-none"
        >
          <span>Claim Bonus</span>
          <ExternalLink className="w-3.5 h-3.5 text-emerald-200 stroke-[2.5]" />
        </a>
      )}
    </div>
  );
}

export default BonusDropCard;
