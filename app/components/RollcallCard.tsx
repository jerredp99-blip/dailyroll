"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, ExternalLink, MoreHorizontal, X, RotateCcw } from "lucide-react";
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

export type { CasinoStatus, StatusState };

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
  onResetToReady?: (casino: Casino) => void;
  onCancelSnooze?: (casino: Casino) => void;
  onSnoozeDuration?: (casino: Casino, durationMs: number) => void;
  onSetCustomTimer?: (casino: Casino, targetResetTimestamp: number) => void;
  onOpenCasino: (casino: Casino) => void;
  onOpenBonus?: (casino: Casino) => void;
  renderLogo?: () => React.ReactNode;
  renderTrustpilot?: () => React.ReactNode;
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
  onResetToReady,
  onCancelSnooze,
  onSnoozeDuration,
  onSetCustomTimer,
  onOpenCasino,
  onOpenBonus,
  renderLogo,
  renderTrustpilot,
}: RollcallCardProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [showCustomTimer, setShowCustomTimer] = useState(false);
  const [customHours, setCustomHours] = useState("");
  const [customMinutes, setCustomMinutes] = useState("");
  const [snoozeSelection, setSnoozeSelection] = useState("");
  const [isTimerMenuOpen, setIsTimerMenuOpen] = useState(false);
  const [showInlineAdjustTimer, setShowInlineAdjustTimer] = useState(false);
  const timerMenuRef = useRef<HTMLDivElement>(null);

  const contextNow = useCurrentTimeContext();
  const currentNow = now ?? contextNow;
  const currentStatus = status ?? calculateCasinoStatus(casino, currentNow);

  const styles = STATUS_STYLES[currentStatus.state];
  const formattedCountdown = formatRemainingTimer(currentStatus.remainingMs);

  // Close quick action menu on outside click
  useEffect(() => {
    if (!isTimerMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (timerMenuRef.current && !timerMenuRef.current.contains(e.target as Node)) {
        setIsTimerMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTimerMenuOpen]);

  // Triggered when user clicks "Claim [Reward]!"
  const handleClaimClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // 1. Launch external casino link
    const target = casino.claimUrl ?? siteUrl;
    if (target) {
      openInExternalBrowser(target);
    }
    // 2. Open inline verification overlay without modifying database yet
    setIsVerifying(true);
  };

  const handleDismissVerification = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setIsVerifying(false);
    setShowCustomTimer(false);
    setSnoozeSelection("");
    onResetToReady?.(casino);
  };

  const handleConfirmClaimed = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsVerifying(false);
    setShowCustomTimer(false);
    setSnoozeSelection("");
    if (onConfirmClaim) {
      onConfirmClaim(casino);
    } else {
      onClaim(casino);
    }
  };

  const handleNotClaimed = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsVerifying(false);
    setShowCustomTimer(false);
    setSnoozeSelection("");
    onResetToReady?.(casino);
  };

  const handleSnoozeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    event.stopPropagation();
    const durationMs = Number(event.target.value);
    if (!durationMs) return;
    setIsVerifying(false);
    setShowCustomTimer(false);
    setSnoozeSelection("");
    if (onSnoozeDuration) {
      onSnoozeDuration(casino, durationMs);
    }
  };

  const handleApplyCustomTimer = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const h = parseInt(customHours || "0", 10);
    const m = parseInt(customMinutes || "0", 10);
    if (isNaN(h) && isNaN(m)) return;
    const targetReset = calculateCustomResetTimestamp(Math.max(0, h || 0), Math.max(0, m || 0));
    setIsVerifying(false);
    setShowCustomTimer(false);
    setCustomHours("");
    setCustomMinutes("");
    setSnoozeSelection("");
    if (onSetCustomTimer) {
      onSetCustomTimer(casino, targetReset);
    }
  };

  const handleOpenAdjustTimer = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsTimerMenuOpen(false);
    if (currentStatus.remainingMs > 0) {
      const totalMinutes = Math.ceil(currentStatus.remainingMs / 60000);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      setCustomHours(h > 0 ? String(h) : "");
      setCustomMinutes(m > 0 ? String(m) : "");
    } else {
      setCustomHours("");
      setCustomMinutes("");
    }
    setShowInlineAdjustTimer(true);
  };

  const handleApplyInlineAdjustTimer = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const h = parseInt(customHours || "0", 10);
    const m = parseInt(customMinutes || "0", 10);
    if (isNaN(h) && isNaN(m)) return;
    if (h === 0 && m === 0) {
      setShowInlineAdjustTimer(false);
      setCustomHours("");
      setCustomMinutes("");
      onResetToReady?.(casino);
      return;
    }
    const targetReset = calculateCustomResetTimestamp(Math.max(0, h || 0), Math.max(0, m || 0));
    setShowInlineAdjustTimer(false);
    setCustomHours("");
    setCustomMinutes("");
    if (onSetCustomTimer) {
      onSetCustomTimer(casino, targetReset);
    }
  };

  const handleCancelInlineAdjustTimer = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setShowInlineAdjustTimer(false);
    setCustomHours("");
    setCustomMinutes("");
  };

  // -------------------------------------------------------------
  // Verification Mode Card View
  // -------------------------------------------------------------
  if (isVerifying) {
    return (
      <article
        onClick={(e) => e.stopPropagation()}
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 72px" }}
        className="relative overflow-hidden rounded-xl border border-emerald-500/80 bg-gradient-to-br from-[#12281c] via-[#0f2117] to-[#12281c] p-3 sm:p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 ring-1 ring-emerald-500/50"
      >
        {/* Top Header Row: Casino Name + Question + Close (X) */}
        <div className="flex items-center justify-between gap-2 border-b border-emerald-900/60 pb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#294631] text-xs font-bold text-[#9bcf9c]">
              {renderLogo ? renderLogo() : <CasinoLogo name={casino.name} siteUrl={siteUrl} width={28} height={28} />}
            </div>
            <div className="truncate flex items-center gap-2">
              <span className="text-xs font-bold text-gray-300 truncate">{casino.name}:</span>
              <span className="text-xs font-extrabold text-emerald-300">Did you claim it?</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissVerification}
            aria-label="Cancel verification"
            title="Cancel verification"
            className="rounded-md p-1 text-gray-400 hover:bg-emerald-950/60 hover:text-white transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Controls Row */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Primary: Yes, Claimed */}
            <button
              type="button"
              onClick={handleConfirmClaimed}
              className="flex items-center gap-1.5 rounded-lg bg-[#39ff6a] px-3 py-1.5 text-xs font-extrabold text-[#0d1712] shadow-[0_4px_12px_rgba(57,255,106,0.3)] transition hover:bg-[#5aff84] hover:shadow-[0_6px_16px_rgba(57,255,106,0.4)] active:scale-95 cursor-pointer"
            >
              <CheckCircle2 size={14} strokeWidth={2.5} />
              <span>Yes, Claimed</span>
            </button>

            {/* Secondary: Not Claimed */}
            <button
              type="button"
              onClick={handleNotClaimed}
              className="rounded-lg border border-[#395040] bg-[#14221a] px-2.5 py-1.5 text-xs font-semibold text-gray-300 transition hover:bg-[#1c3024] hover:text-white active:scale-95 cursor-pointer"
            >
              Not Claimed
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Tertiary 1: Snooze Dropdown */}
            <select
              value={snoozeSelection}
              onChange={handleSnoozeChange}
              aria-label="Snooze casino"
              className="h-7 rounded-lg border border-amber-600/50 bg-[#1e1b13] px-2 text-[11px] font-semibold text-amber-300 outline-none hover:border-amber-500 focus:border-amber-400 cursor-pointer"
            >
              <option value="">⏱ Snooze...</option>
              {SNOOZE_PRESETS.map((preset) => (
                <option key={preset.ms} value={preset.ms}>
                  {preset.label}
                </option>
              ))}
            </select>

            {/* Tertiary 2: Set Custom Timer Toggle */}
            <button
              type="button"
              onClick={() => setShowCustomTimer((prev) => !prev)}
              title="Set exact cooldown time left"
              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition cursor-pointer ${
                showCustomTimer
                  ? "border-emerald-500 bg-emerald-950/70 text-emerald-300"
                  : "border-[#395040] bg-[#14221a] text-[#8ea794] hover:border-[#4c6d50] hover:text-white"
              }`}
            >
              <Clock size={12} />
              <span>Set Timer</span>
            </button>
          </div>
        </div>

        {/* Expandable Exact Time Left Row */}
        {showCustomTimer && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-900/60 bg-[#0a1610] p-2 text-xs">
            <span className="text-[11px] font-semibold text-[#8ea794]">Exact time left:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="72"
                placeholder="0"
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                className="w-12 rounded border border-[#395040] bg-[#101e16] px-1.5 py-0.5 text-center text-xs text-white outline-none focus:border-emerald-400"
              />
              <span className="text-[11px] text-gray-400">h</span>
              <input
                type="number"
                min="0"
                max="59"
                placeholder="0"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="w-12 rounded border border-[#395040] bg-[#101e16] px-1.5 py-0.5 text-center text-xs text-white outline-none focus:border-emerald-400"
              />
              <span className="text-[11px] text-gray-400">m</span>
            </div>
            <button
              type="button"
              onClick={handleApplyCustomTimer}
              className="ml-auto rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-500 cursor-pointer"
            >
              Apply Timer
            </button>
          </div>
        )}
      </article>
    );
  }

  // -------------------------------------------------------------
  // Default Card View
  // -------------------------------------------------------------
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
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 72px" }}
      className={`group flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border py-2.5 px-3.5 sm:py-3 sm:px-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[#79b77f]/60 ${styles.card} ${
        casino.hidden ? "border-dashed opacity-60 grayscale hover:opacity-90" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <Link
          href={`/casinos/${encodeURIComponent(casino.id)}`}
          onClick={(e) => e.stopPropagation()}
          className="group/link flex items-center gap-2.5 sm:gap-3 hover:opacity-85 transition cursor-pointer"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#294631] text-sm font-bold text-[#9bcf9c] transition group-hover/link:ring-1 group-hover/link:ring-emerald-400">
            {renderLogo ? renderLogo() : <CasinoLogo name={casino.name} siteUrl={siteUrl} />}
          </div>
          <h2 className="font-semibold text-[#e5eee3] text-sm sm:text-base leading-tight truncate group-hover/link:text-emerald-300 transition">
            {casino.name}
          </h2>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {casino.hasStreak && (
            <span className="rounded-full border border-orange-500/40 bg-orange-950/40 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-orange-400">
              🔥 Streak
            </span>
          )}
          {casino.minRedemption && (
            <span className="rounded-full border border-[#38503f] bg-[#122218] px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-[#86a88d]">
              {casino.minRedemption}
            </span>
          )}
          {casino.provider && (
            <span className="rounded-full border border-[#38503f] bg-[#122218] px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-[#86a88d]">
              {casino.provider}
            </span>
          )}
          {casino.hidden && (
            <span className="rounded-full border border-[#4a5d51] bg-[#1f2218] px-2 py-0.5 text-[10px] text-[#a3b1a5]">
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
              className="text-xs text-[#91bf9b] hover:text-[#c2e4bd]"
            >
              <TrustpilotStars rating={rating ?? casino.trustpilotRating} />
            </a>
          )}
        </div>
      </div>

      {/* Claim Button (when ready) OR Dynamic Countdown Timer (when claimed/snoozed) */}
      {currentStatus.ready ? (
        <button
          type="button"
          onClick={handleClaimClick}
          aria-label={`Claim ${casino.dailyBonus} for ${casino.name}`}
          className="ml-auto flex min-w-28 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#79b77f] px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#122519] shadow-[0_6px_16px_rgba(121,183,127,0.2)] transition hover:-translate-y-0.5 hover:bg-[#91c991] hover:shadow-[0_10px_22px_rgba(145,201,145,0.32)] ring-2 ring-[#39ff6a] ring-offset-2 ring-offset-[#0f1a14]"
        >
          <CheckCircle2 size={15} strokeWidth={2.5} />
          <span>Claim {casino.dailyBonus}!</span>
        </button>
      ) : (
        <div className="ml-auto relative flex items-center gap-1.5 shrink-0">
          <div
            aria-label={
              currentStatus.isSnoozed
                ? `Snoozed · ${formattedCountdown}`
                : `Resets in ${formattedCountdown}`
            }
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 sm:px-3 py-1.5 sm:py-2 font-mono text-xs font-semibold shadow-inner ${
              currentStatus.isSnoozed
                ? "border-amber-700/60 bg-[#1c1810] text-amber-300"
                : "border-[#3a4c40] bg-[#111c16] text-[#edf5ec]"
            }`}
          >
            <span className="relative flex h-2 w-2 mr-1 sm:mr-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>
              {currentStatus.isSnoozed
                ? `Snoozed · ${formattedCountdown}`
                : `Resets in ${formattedCountdown}`}
            </span>
          </div>

          {/* Quick-action trigger (kebab ⋯) */}
          <div className="relative" ref={timerMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsTimerMenuOpen((prev) => !prev);
              }}
              aria-label="Manage active timer"
              title="Reset, edit, or adjust timer"
              className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-lg border border-[#395040] bg-[#14221a] text-gray-300 hover:text-white hover:border-[#4c6d50] hover:bg-[#1f3326] transition cursor-pointer"
            >
              <MoreHorizontal size={15} />
            </button>

            {isTimerMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1.5 z-30 w-52 rounded-xl border border-emerald-900/80 bg-[#0d1a13] p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-md"
              >
                {/* 1. Mark as Ready to Claim */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsTimerMenuOpen(false);
                    setShowInlineAdjustTimer(false);
                    onResetToReady?.(casino);
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-950/70 hover:text-emerald-300 transition text-left cursor-pointer"
                >
                  <RotateCcw size={14} className="shrink-0" />
                  <span>Mark as Ready to Claim</span>
                </button>

                {/* 2. Adjust Timer */}
                <button
                  type="button"
                  onClick={handleOpenAdjustTimer}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-200 hover:bg-[#1a2d21] hover:text-white transition text-left cursor-pointer"
                >
                  <Clock size={14} className="shrink-0 text-[#f0a03c]" />
                  <span>Adjust Timer</span>
                </button>

                {/* 3. Cancel Snooze (if snoozed) */}
                {currentStatus.isSnoozed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsTimerMenuOpen(false);
                      setShowInlineAdjustTimer(false);
                      if (onCancelSnooze) {
                        onCancelSnooze(casino);
                      } else {
                        onResetToReady?.(casino);
                      }
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-950/50 hover:text-amber-200 transition text-left cursor-pointer border-t border-emerald-900/40 mt-1"
                  >
                    <X size={14} className="shrink-0" />
                    <span>Cancel Snooze</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline Adjust Timer Row */}
      {showInlineAdjustTimer && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-900/60 bg-[#0a1610] p-2.5 text-xs animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#8ea794]">Time remaining:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="72"
                placeholder="0"
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                className="w-12 rounded border border-[#395040] bg-[#101e16] px-1.5 py-1 text-center text-xs text-white outline-none focus:border-emerald-400"
              />
              <span className="text-[11px] text-gray-400">h</span>
              <input
                type="number"
                min="0"
                max="59"
                placeholder="0"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="w-12 rounded border border-[#395040] bg-[#101e16] px-1.5 py-1 text-center text-xs text-white outline-none focus:border-emerald-400"
              />
              <span className="text-[11px] text-gray-400">m</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={handleCancelInlineAdjustTimer}
              className="rounded-md border border-[#395040] bg-[#14221a] px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyInlineAdjustTimer}
              className="rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-500 cursor-pointer shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
            >
              Save Timer
            </button>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="relative flex w-full items-center justify-between gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleActionMenu?.(casino.id);
          }}
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
  if (prev.onResetToReady !== next.onResetToReady) return false;
  if (prev.onCancelSnooze !== next.onCancelSnooze) return false;
  if (prev.onSnoozeDuration !== next.onSnoozeDuration) return false;
  if (prev.onSetCustomTimer !== next.onSetCustomTimer) return false;
  if (prev.onOpenCasino !== next.onOpenCasino) return false;
  if (prev.onOpenBonus !== next.onOpenBonus) return false;
  if (prev.onToggleActionMenu !== next.onToggleActionMenu) return false;
  if (prev.renderLogo !== next.renderLogo) return false;
  if (prev.renderTrustpilot !== next.renderTrustpilot) return false;

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
