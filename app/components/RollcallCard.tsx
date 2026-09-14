"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, ExternalLink, MoreHorizontal, X, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { Casino } from "@/types/casino";
import { openInExternalBrowser } from "@/lib/openExternalLink";
import {
  type CasinoStatus,
  type StatusState,
  formatRemainingTimer,
  formatSnoozeRemaining,
  SNOOZE_PRESETS,
  calculateCustomResetTimestamp,
  calculateCasinoStatus,
  useCurrentTimeContext,
} from "@/lib/timerUtils";
import { CasinoLogo } from "@/components/CasinoLogo";
import { TrustpilotStars } from "@/components/TrustpilotStars";
import { CustomTimerModal } from "@/components/CustomTimerModal";

export type { CasinoStatus, StatusState };

const STATUS_STYLES: Record<
  StatusState,
  { card: string; dot: string; label: string }
> = {
  ready: {
    card: "border-l-2 border-l-emerald-500 bg-zinc-900/70 border border-zinc-800/70 hover:border-zinc-700/80 shadow-sm",
    dot: "bg-emerald-400",
    label: "text-emerald-400",
  },
  pending: {
    card: "border-l-2 border-l-amber-500 bg-zinc-900/70 border border-zinc-800/70 hover:border-zinc-700/80 shadow-sm",
    dot: "bg-amber-400",
    label: "text-amber-300",
  },
  claimed: {
    card: "bg-zinc-900/70 border border-zinc-800/70 opacity-85 hover:opacity-100 hover:border-zinc-700/80 shadow-sm",
    dot: "bg-zinc-600",
    label: "text-zinc-400",
  },
};

export interface RollcallCardProps {
  casino: Casino;
  status?: CasinoStatus;
  now?: number;
  rating?: number;
  siteUrl?: string;
  isActionMenuOpen?: boolean;
  onToggleActionMenu?: (id: string) => void;
  onClaim: (casino: Casino) => void;
  onConfirmClaim?: (casino: Casino) => void;
  onUndoClaim?: (casino: Casino) => void;
  onResetToReady?: (casino: Casino) => void;
  onCancelSnooze?: (casino: Casino) => void;
  onSnoozeDuration?: (casino: Casino, durationMs: number) => void;
  onSetCustomTimer?: (casino: Casino, targetResetTimestamp: number) => void;
  onOpenCasino: (casino: Casino) => void;
  onOpenBonus?: (casino: Casino) => void;
  renderLogo?: () => React.ReactNode;
  renderTrustpilot?: () => React.ReactNode;
  pendingInfo?: { expiresAt: number; isDefocused: boolean };
}

function RollcallCardComponent({
  casino,
  status,
  now,
  rating,
  siteUrl,
  isActionMenuOpen = false,
  onToggleActionMenu,
  onClaim,
  onConfirmClaim,
  onUndoClaim,
  onResetToReady,
  onCancelSnooze,
  onSnoozeDuration,
  onSetCustomTimer,
  onOpenCasino,
  onOpenBonus,
  renderLogo,
  renderTrustpilot,
  pendingInfo,
}: RollcallCardProps) {
  const [isCardMenuOpen, setIsCardMenuOpen] = useState(false);
  const [isCustomTimerOpen, setIsCustomTimerOpen] = useState(false);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  const contextNow = useCurrentTimeContext();
  const currentNow = now ?? contextNow;
  const currentStatus = status ?? calculateCasinoStatus(casino, currentNow);

  const styles = STATUS_STYLES[currentStatus.state];
  const formattedCountdown = formatRemainingTimer(currentStatus.remainingMs);

  const isPending = Boolean(pendingInfo);
  const isDefocused = Boolean(pendingInfo?.isDefocused);

  // Close kebab menu on outside click or ESC key
  useEffect(() => {
    if (!isCardMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
        setIsCardMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCardMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCardMenuOpen]);

  // Triggered when user clicks "Claim [Reward]!"
  const handleClaimClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const target = casino.claimUrl ?? siteUrl;
    if (target) {
      openInExternalBrowser(target);
    }
    onClaim(casino);
  };

  // -------------------------------------------------------------
  // Card View (Normal & Pending Modes)
  // -------------------------------------------------------------
  return (
    <article
      data-pending-card={isPending ? "true" : undefined}
      data-pending-id={isPending ? casino.id : undefined}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a, input, select, textarea, [role='button']")) return;
        if (isPending) return;
        onOpenCasino(casino);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!isPending) onOpenCasino(casino);
        }
      }}
      role="article"
      tabIndex={0}
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 72px" }}
      className={`group flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
        isPending
          ? isDefocused
            ? "border-emerald-700/50 bg-[#101e16] shadow-sm"
            : "border-emerald-500/80 bg-gradient-to-r from-[#14281e] via-[#102219] to-[#14281e] shadow-[0_4px_20px_rgba(16,185,129,0.18)] ring-1 ring-emerald-500/60"
          : styles.card
      } ${casino.hidden ? "border-dashed opacity-60 grayscale hover:opacity-90" : ""}`}
    >
      <div className="flex items-center gap-3">
        <Link
          href={`/casinos/${encodeURIComponent(casino.id)}`}
          onClick={(e) => e.stopPropagation()}
          className="group/link flex items-center gap-2.5 sm:gap-3 hover:opacity-85 transition cursor-pointer"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-zinc-800 bg-zinc-950 text-sm font-bold text-emerald-400 transition group-hover/link:border-zinc-700 group-hover/link:ring-1 group-hover/link:ring-emerald-500/40 overflow-hidden">
            {renderLogo ? renderLogo() : <CasinoLogo name={casino.name} siteUrl={siteUrl} />}
          </div>
          <h2 className="font-semibold text-sm text-zinc-100 leading-tight truncate group-hover/link:text-emerald-300 transition">
            {casino.name}
          </h2>
        </Link>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {casino.hasStreak && (
            <span className="rounded-md border border-orange-500/30 bg-orange-950/30 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
              🔥 Streak
            </span>
          )}
          {casino.minRedemption && (
            <span className="rounded-md border border-zinc-800 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
              {casino.minRedemption}
            </span>
          )}
          {casino.provider && (
            <span className="rounded-md border border-zinc-800 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
              {casino.provider}
            </span>
          )}
          {casino.hidden && (
            <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[10px] text-zinc-500">
              Hidden
            </span>
          )}
          {renderTrustpilot ? (
            renderTrustpilot()
          ) : (
            <a
              href={`https://www.trustpilot.com/search?query=${encodeURIComponent(casino.name)}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                openInExternalBrowser(`https://www.trustpilot.com/search?query=${encodeURIComponent(casino.name)}`);
              }}
              className="text-xs text-amber-400/90 hover:text-amber-300 tracking-tighter"
            >
              <TrustpilotStars rating={rating ?? casino.trustpilotRating} />
            </a>
          )}
        </div>
      </div>

      {/* Action / Countdown / Pending Controls */}
      {isPending ? (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Pulsing Dot + Live 90s Countdown */}
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-[#0c1a13] px-2.5 py-1.5 font-mono text-xs font-semibold text-emerald-300 shadow-inner shrink-0">
            <span className="relative flex h-2 w-2 mr-0.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>
              Confirming in {Math.max(0, Math.ceil((pendingInfo!.expiresAt - currentNow) / 1000))}s...
            </span>
          </div>

          {/* [Claimed ✓] Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onConfirmClaim) onConfirmClaim(casino);
              else onClaim(casino);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-zinc-950 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <CheckCircle2 size={14} strokeWidth={2.5} />
            <span>Claimed ✓</span>
          </button>

          {/* [Didn't Claim / Undo] Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onUndoClaim?.(casino);
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer shrink-0"
          >
            Didn't Claim / Undo
          </button>

          {/* [Snooze ⌵] Select */}
          <select
            value=""
            onChange={(e) => {
              e.stopPropagation();
              const durationMs = Number(e.target.value);
              if (durationMs && onSnoozeDuration) {
                onSnoozeDuration(casino, durationMs);
              }
            }}
            aria-label="Snooze casino"
            className="h-8 rounded-lg border border-amber-600/50 bg-[#1e1b13] px-2 text-xs font-semibold text-amber-300 outline-none hover:border-amber-500 focus:border-amber-400 cursor-pointer shrink-0"
          >
            <option value="">Snooze ⌵</option>
            {SNOOZE_PRESETS.map((preset) => (
              <option key={preset.ms} value={preset.ms} className="bg-[#101b15] text-white">
                {preset.label}
              </option>
            ))}
          </select>

          {/* [Custom Timer] Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsCustomTimerOpen(true);
            }}
            title="Set custom cooldown timer"
            className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-300 hover:text-white px-2.5 py-1.5 text-xs font-medium transition cursor-pointer shrink-0"
          >
            <Clock size={13} />
            <span>Custom Timer</span>
          </button>
        </div>
      ) : currentStatus.ready ? (
        <button
          type="button"
          onClick={handleClaimClick}
          aria-label={`Claim ${casino.dailyBonus} for ${casino.name}`}
          className="ml-auto flex min-w-28 h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs px-4 shadow-sm active:scale-[0.97] transition-all"
        >
          <CheckCircle2 size={14} strokeWidth={2.5} />
          <span>Claim {casino.dailyBonus}!</span>
        </button>
      ) : (
        <div
          aria-label={
            currentStatus.isSnoozed
              ? `Snoozed · ${formattedCountdown}`
              : `Resets in ${formattedCountdown}`
          }
          className={`ml-auto flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold shadow-inner shrink-0 ${
            currentStatus.isSnoozed
              ? "border-amber-700/60 bg-amber-950/30 text-amber-300"
              : "border-zinc-700/50 bg-zinc-800/50 text-zinc-300"
          }`}
        >
          <span className="relative flex h-2 w-2 mr-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>
            {currentStatus.isSnoozed
              ? `Snoozed · ${formattedCountdown}`
              : `Resets in ${formattedCountdown}`}
          </span>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="relative flex w-full items-center justify-between gap-2">
        {/* Card Kebab Menu */}
        <div className="relative" ref={cardMenuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsCardMenuOpen((prev) => !prev);
            }}
            aria-label={`More actions for ${casino.name}`}
            aria-expanded={isCardMenuOpen}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-200 transition cursor-pointer"
          >
            <MoreHorizontal size={16} />
          </button>

          {isCardMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 bottom-full mb-2 z-40 w-52 rounded-xl border border-zinc-800 bg-zinc-900/95 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
            >
              {/* 1. Mark Ready to Claim */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCardMenuOpen(false);
                  onResetToReady?.(casino);
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-950/60 hover:text-emerald-300 transition text-left cursor-pointer"
              >
                <RotateCcw size={14} className="shrink-0" />
                <span>Mark Ready to Claim</span>
              </button>

              {/* 2. Set Custom Timer */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCardMenuOpen(false);
                  setIsCustomTimerOpen(true);
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800/70 hover:text-white transition text-left cursor-pointer"
              >
                <Clock size={14} className="shrink-0 text-[#f0a03c]" />
                <span>Set Custom Timer</span>
              </button>

              {/* 3. Cancel Snooze (if snoozed) */}
              {currentStatus.isSnoozed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsCardMenuOpen(false);
                    if (onCancelSnooze) {
                      onCancelSnooze(casino);
                    } else {
                      onResetToReady?.(casino);
                    }
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-950/50 hover:text-amber-200 transition text-left cursor-pointer border-t border-zinc-800/80 mt-1"
                >
                  <X size={14} className="shrink-0" />
                  <span>Cancel Snooze</span>
                </button>
              )}

              {/* 4. Casino Settings / Details */}
              {onToggleActionMenu && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsCardMenuOpen(false);
                    onToggleActionMenu(casino.id);
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200 transition text-left cursor-pointer border-t border-zinc-800/80 mt-1"
                >
                  <SlidersHorizontal size={14} className="shrink-0 text-zinc-400" />
                  <span>Casino Settings...</span>
                </button>
              )}
            </div>
          )}
        </div>

        {casino.bonusUrl && onOpenBonus && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenBonus(casino);
            }}
            aria-label={`Open ${casino.bonusTitle || "Bonus"} for ${casino.name}`}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition"
          >
            <ExternalLink size={14} strokeWidth={2.5} />
            <span>{casino.bonusTitle || "Bonus"}</span>
          </button>
        )}
      </div>

      {/* Custom Timer Modal */}
      <CustomTimerModal
        isOpen={isCustomTimerOpen}
        casino={casino}
        currentRemainingMs={currentStatus.remainingMs}
        onClose={() => setIsCustomTimerOpen(false)}
        onSave={(target, targetResetTimestamp) => {
          const casinoObj = typeof target === "string" ? casino : target;
          onSetCustomTimer?.(casinoObj, targetResetTimestamp);
        }}
      />
    </article>
  );
}

function areRollcallCardPropsEqual(prev: RollcallCardProps, next: RollcallCardProps): boolean {
  if (prev.casino !== next.casino) return false;
  if (prev.casino.hasStreak !== next.casino.hasStreak) return false;
  if (prev.casino.minRedemption !== next.casino.minRedemption) return false;
  if (prev.casino.dailyBonus !== next.casino.dailyBonus) return false;
  if (prev.isActionMenuOpen !== next.isActionMenuOpen) return false;
  if (prev.siteUrl !== next.siteUrl) return false;
  if (prev.rating !== next.rating) return false;
  if (prev.onClaim !== next.onClaim) return false;
  if (prev.onConfirmClaim !== next.onConfirmClaim) return false;
  if (prev.onUndoClaim !== next.onUndoClaim) return false;
  if (prev.onResetToReady !== next.onResetToReady) return false;
  if (prev.onCancelSnooze !== next.onCancelSnooze) return false;
  if (prev.onSnoozeDuration !== next.onSnoozeDuration) return false;
  if (prev.onSetCustomTimer !== next.onSetCustomTimer) return false;
  if (prev.onOpenCasino !== next.onOpenCasino) return false;
  if (prev.onOpenBonus !== next.onOpenBonus) return false;
  if (prev.onToggleActionMenu !== next.onToggleActionMenu) return false;
  if (prev.renderLogo !== next.renderLogo) return false;
  if (prev.renderTrustpilot !== next.renderTrustpilot) return false;

  const prevPending = prev.pendingInfo;
  const nextPending = next.pendingInfo;
  if (Boolean(prevPending) !== Boolean(nextPending)) return false;
  if (prevPending && nextPending) {
    if (prevPending.isDefocused !== nextPending.isDefocused) return false;
    if (prevPending.expiresAt !== nextPending.expiresAt) return false;
    const prevSec = Math.max(0, Math.ceil((prevPending.expiresAt - (prev.now ?? 0)) / 1000));
    const nextSec = Math.max(0, Math.ceil((nextPending.expiresAt - (next.now ?? 0)) / 1000));
    if (prevSec !== nextSec) return false;
  }

  if (prev.status && next.status) {
    if (prev.status.ready !== next.status.ready) return false;
    if (prev.status.state !== next.status.state) return false;
    if (prev.status.isSnoozed !== next.status.isSnoozed) return false;
    if (prev.status.ready && next.status.ready) return true;
    const prevSec = Math.floor(prev.status.remainingMs / 1000);
    const nextSec = Math.floor(next.status.remainingMs / 1000);
    if (prevSec !== nextSec) return false;
    return true;
  }
  if (prev.now !== next.now) {
    if (prev.now !== undefined && next.now !== undefined) {
      const prevSec = Math.floor(prev.now / 1000);
      const nextSec = Math.floor(next.now / 1000);
      return prevSec === nextSec;
    }
    return false;
  }
  return true;
}

export const RollcallCard = React.memo(RollcallCardComponent, areRollcallCardPropsEqual);
export const CasinoCard = RollcallCard;
export default RollcallCard;
