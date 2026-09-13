"use client";

import { CheckCircle2, Clock, ExternalLink, MoreHorizontal } from "lucide-react";
import type { Casino } from "@/lib/store";
import { openInExternalBrowser } from "@/lib/openExternalLink";

export type StatusState = "ready" | "pending" | "claimed";

export type CasinoStatus = {
  ready: boolean;
  state: StatusState;
  label: string;
  shortLabel: string;
  remainingMs: number;
};

const STATUS_STYLES: Record<
  StatusState,
  { card: string; dot: string; label: string }
> = {
  ready: {
    card: "border-emerald-700/60 bg-[#122319] hover:border-emerald-500",
    dot: "bg-[#39ff6a] shadow-[0_0_8px_rgba(57,255,106,0.8)]",
    label: "text-[#9bcf9c]",
  },
  pending: {
    card: "border-amber-900/40 bg-[#171c14] hover:border-amber-700/60",
    dot: "bg-amber-400",
    label: "text-amber-300",
  },
  claimed: {
    card: "border-[#203126] bg-[#0d1712] opacity-85 hover:border-[#35523f] hover:opacity-100",
    dot: "bg-gray-600",
    label: "text-gray-400",
  },
};

function formatRemainingTimer(remainingMs: number): string {
  if (remainingMs <= 0) return "Ready";
  const hours = Math.floor(remainingMs / 3600000);
  const minutes = Math.floor((remainingMs % 3600000) / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function RollcallCard({
  casino,
  status,
  rating,
  siteUrl,
  isActionMenuOpen,
  onToggleActionMenu,
  onClaim,
  onOpenCasino,
  onOpenBonus,
  renderLogo,
  renderTrustpilot,
}: {
  casino: Casino;
  status: CasinoStatus;
  rating?: number;
  siteUrl?: string;
  isActionMenuOpen: boolean;
  onToggleActionMenu: () => void;
  onClaim: (casino: Casino) => void;
  onOpenCasino: (casino: Casino) => void;
  onOpenBonus?: (casino: Casino) => void;
  renderLogo?: () => React.ReactNode;
  renderTrustpilot?: () => React.ReactNode;
}) {
  const styles = STATUS_STYLES[status.state];
  const formattedCountdown = formatRemainingTimer(status.remainingMs);

  const handleClaim = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onClaim(casino);
    const target = casino.claimUrl ?? siteUrl;
    if (target) {
      openInExternalBrowser(target);
    }
  };

  return (
    <article
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a, input, select, textarea, [role='button']")) return;
        onOpenCasino(casino);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenCasino(casino);
        }
      }}
      role="link"
      tabIndex={0}
      className={`group flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border py-2.5 px-3.5 sm:py-3 sm:px-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[#79b77f]/60 ${styles.card} ${
        casino.hidden ? "border-dashed opacity-60 grayscale hover:opacity-90" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#294631] text-sm font-bold text-[#9bcf9c]">
          {renderLogo ? renderLogo() : casino.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-semibold text-[#e5eee3]">{casino.name}</h2>
            {casino.hidden && (
              <span className="rounded-full border border-[#4a5d51] bg-[#1f2218] px-2 py-0.5 text-xs text-[#a3b1a5]">
                Hidden
              </span>
            )}
            {renderTrustpilot && renderTrustpilot()}
          </div>
          <p className="mt-1 flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`}
            />
            <span className={`font-semibold ${styles.label}`}>
              {status.ready ? "Ready to claim" : `Available in ${status.shortLabel}`}
            </span>
          </p>
        </div>
      </div>

      {/* Claim Button (when ready) OR Dynamic Countdown Timer (when claimed) */}
      {status.ready ? (
        <button
          type="button"
          onClick={handleClaim}
          aria-label={`Claim ${casino.dailyBonus} for ${casino.name}`}
          className="ml-auto flex min-w-28 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#79b77f] px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#122519] shadow-[0_6px_16px_rgba(121,183,127,0.2)] transition hover:-translate-y-0.5 hover:bg-[#91c991] hover:shadow-[0_10px_22px_rgba(145,201,145,0.32)] ring-2 ring-[#39ff6a] ring-offset-2 ring-offset-[#0f1a14]"
        >
          <CheckCircle2 size={15} strokeWidth={2.5} />
          <span>Claim {casino.dailyBonus}!</span>
        </button>
      ) : (
        <div
          aria-label={`Resets in ${formattedCountdown}`}
          className="ml-auto flex min-w-32 items-center justify-center gap-1.5 rounded-lg border border-[#3a4c40] bg-[#111c16] px-3 py-1.5 sm:py-2 font-mono text-xs font-semibold text-[#f0a03c] shadow-inner"
        >
          <Clock size={14} className="text-[#f0a03c]" />
          <span>Resets in {formattedCountdown}</span>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="relative flex w-full items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggleActionMenu}
          aria-label={`More actions for ${casino.name}`}
          aria-expanded={isActionMenuOpen}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#4c6d50] text-[#b7d5b5] hover:bg-[#2a4230]"
        >
          <MoreHorizontal size={18} />
        </button>
        {casino.bonusUrl && onOpenBonus && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenBonus(casino);
            }}
            aria-label={`Open ${casino.bonusTitle || "Bonus"} for ${casino.name}`}
            className="flex min-w-28 items-center justify-center gap-2 rounded-lg border border-[#4c6d50] bg-transparent px-3.5 py-2 text-sm font-bold text-[#b7d5b5] transition hover:-translate-y-0.5 hover:border-[#6f9d73] hover:bg-[#2a4230]"
          >
            <ExternalLink size={16} strokeWidth={2.5} />
            <span>{casino.bonusTitle || "Bonus"}</span>
          </button>
        )}
      </div>
    </article>
  );
}

export const CasinoCard = RollcallCard;
export default RollcallCard;
