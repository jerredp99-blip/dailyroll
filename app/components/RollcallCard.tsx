"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Check,
  X,
  Wallet,
  Bell,
  BellOff,
} from "lucide-react";
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
  getCasinoTargetResetTimestamp,
  useCurrentTimeContext,
} from "@/lib/timerUtils";
import { CasinoLogo } from "@/components/CasinoLogo";
import { TrustpilotStars } from "@/components/TrustpilotStars";
import { CustomTimerModal } from "@/components/CustomTimerModal";
import { renderBonusLabel, renderClaimBadge } from "@/components/BonusLabelBadge";

export type { CasinoStatus, StatusState };

const STATUS_STYLES: Record<
  StatusState,
  { card: string; dot: string; label: string }
> = {
  ready: {
    card: "border-l-4 border-l-emerald-400 bg-gradient-to-r from-emerald-950/60 to-[#0d231a] border border-emerald-900/60 hover:border-emerald-500/50 shadow-lg shadow-black/40",
    dot: "bg-emerald-400",
    label: "text-emerald-400",
  },
  pending: {
    card: "border-l-4 border-l-amber-400 bg-[#0c1f17] border border-[#1b3d2f] hover:border-amber-500/50 shadow-md shadow-emerald-950/20",
    dot: "bg-amber-400",
    label: "text-amber-300",
  },
  claimed: {
    card: "bg-[#0a1712]/90 border border-emerald-950/80 text-zinc-400 opacity-90 hover:opacity-100 hover:border-[#1b3d2f] shadow-md shadow-black/30",
    dot: "bg-zinc-600",
    label: "text-zinc-400",
  },
};

export interface RollcallCardProps {
  casino: Casino;
  balance?: number | null;
  userBalance?: number | null;
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
  onSetCustomTimer?: (casino: Casino, targetResetTimestamp: number | null, customSc?: number) => void;
  onUpdateCasino?: (casino: Casino, updates: Partial<Casino>) => void;
  onOpenCasino: (casino: Casino) => void;
  onOpenBonus?: (casino: Casino) => void;
  onOpenDetails?: (casinoId: string) => void;
  onResolveInitial?: (casino: Casino, claimedToday: boolean) => void;
  onInitialSnooze?: (casino: Casino, value: string) => void;
  renderLogo?: () => React.ReactNode;
  renderTrustpilot?: () => React.ReactNode;
  pendingInfo?: { expiresAt: number; isDefocused?: boolean };
  isNotificationEnabled?: boolean;
  isNotificationBlocked?: boolean;
  onToggleNotification?: (casino: Casino) => void;
}

function RollcallCardComponent({
  casino,
  balance,
  userBalance,
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
  onUpdateCasino,
  onOpenCasino,
  onOpenBonus,
  onOpenDetails,
  onResolveInitial,
  onInitialSnooze,
  renderLogo,
  renderTrustpilot,
  pendingInfo,
  isNotificationEnabled = false,
  isNotificationBlocked = false,
  onToggleNotification,
}: RollcallCardProps) {
  const [isCustomTimerOpen, setIsCustomTimerOpen] = useState(false);

  const contextNow = useCurrentTimeContext();
  const currentNow = now ?? contextNow;
  const currentStatus = status ?? calculateCasinoStatus(casino, currentNow);

  const targetTimestamp = React.useMemo(
    () => getCasinoTargetResetTimestamp(casino, currentNow),
    [casino, currentNow]
  );

  const styles = STATUS_STYLES[currentStatus.state];
  const formattedCountdown = formatRemainingTimer(currentStatus.remainingMs);

  const isPending = Boolean(pendingInfo);
  const isDefocused = Boolean(pendingInfo?.isDefocused);

  const renderNotificationBell = () => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleNotification?.(casino);
      }}
      aria-label={
        isNotificationBlocked
          ? `Notifications blocked in browser settings for ${casino.name}. Click to view fix instructions.`
          : isNotificationEnabled
          ? `Disable timer alert for ${casino.name}`
          : `Notify me when ${casino.name} resets`
      }
      title={
        isNotificationBlocked
          ? `Notifications blocked in browser settings. Click for instructions to enable.`
          : isNotificationEnabled
          ? `Alerts ON for ${casino.name} (click to disable)`
          : `Notify me when ${casino.name} resets`
      }
      className={`h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 select-none ${
        isNotificationBlocked
          ? "bg-rose-950/40 border-rose-900/60 hover:border-rose-700 text-rose-400 hover:text-rose-300"
          : isNotificationEnabled
          ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
          : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {isNotificationBlocked ? (
        <BellOff size={16} className="text-rose-400" />
      ) : isNotificationEnabled ? (
        <Bell size={16} className="text-emerald-400 fill-emerald-400/40" />
      ) : (
        <Bell size={16} />
      )}
    </button>
  );

  const lastClaimClickRef = useRef(0);

  // Triggered when user clicks "Claim [Reward]!"
  const handleClaimClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const nowClick = Date.now();
    if (nowClick - lastClaimClickRef.current < 2000) return;
    lastClaimClickRef.current = nowClick;
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
        if (onOpenDetails) {
          onOpenDetails(casino.id);
        } else {
          onOpenCasino(casino);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!isPending) {
            if (onOpenDetails) onOpenDetails(casino.id);
            else onOpenCasino(casino);
          }
        }
      }}
      role="article"
      tabIndex={0}
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 64px" }}
      className={`group flex cursor-pointer ${
        isPending
          ? "flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-3.5 border-l-4 border-l-emerald-400 border-emerald-500/80 bg-gradient-to-r from-[#14281e] via-[#102219] to-[#14281e] shadow-[0_4px_20px_rgba(16,185,129,0.18)] ring-1 ring-emerald-500/60"
          : `items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3.5 ${styles.card}`
      } rounded-2xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
        casino.hidden ? "border-dashed opacity-60 grayscale hover:opacity-90" : ""
      }`}
    >
      {/* Left Column (Identity): Logo + Name & Stars */}
      <div className={`flex items-center gap-2 sm:gap-2.5 min-w-0 ${isPending ? "justify-between w-full sm:w-auto flex-1" : "shrink"}`}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onOpenDetails) {
              onOpenDetails(casino.id);
            } else {
              onOpenCasino(casino);
            }
          }}
          className="group/link flex items-center gap-2 sm:gap-2.5 min-w-0 hover:opacity-85 transition cursor-pointer text-left"
        >
          <div className="grid h-8 w-8 sm:h-[38px] sm:w-[38px] shrink-0 place-items-center rounded-lg border border-[#1b3d2f] bg-[#07130e] text-sm font-bold text-emerald-400 transition group-hover/link:border-emerald-500/50 overflow-hidden">
            {renderLogo ? renderLogo() : <CasinoLogo name={casino.name} siteUrl={siteUrl} />}
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <h2 className="font-bold text-xs sm:text-sm text-zinc-100 leading-tight truncate group-hover/link:text-emerald-300 transition">
              {casino.name}
            </h2>
            <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
              {casino.hidden && (
                <span className="rounded border border-zinc-800 bg-zinc-900/60 px-1.5 py-0.5 text-[10px] text-zinc-500">
                  Hidden
                </span>
              )}
              {renderTrustpilot ? (
                renderTrustpilot()
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (onOpenDetails) {
                      onOpenDetails(casino.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onOpenDetails) {
                        onOpenDetails(casino.id);
                      }
                    }
                  }}
                  title="View Casino Cheat Sheet"
                  aria-label={`View details for ${casino.name}`}
                  className="inline-flex items-center flex-nowrap whitespace-nowrap gap-0.5 text-amber-400 text-xs tracking-tight min-h-[24px] py-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <TrustpilotStars rating={rating ?? casino.trustpilotRating} />
                </div>
              )}
            </div>
          </div>
        </button>

        {/* Live Countdown Status Chip on Mobile (Pinned to top-right of identity row) */}
        {isPending && (
          <div className="flex sm:hidden items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-[#0c1a13] px-2 py-1 font-mono text-[11px] font-semibold text-emerald-300 shadow-inner shrink-0 whitespace-nowrap">
            <span className="relative flex h-2 w-2 mr-0.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>
              {Math.max(0, Math.ceil((pendingInfo!.expiresAt - currentNow) / 1000))}s
            </span>
          </div>
        )}
      </div>



      {/* Action / Countdown / Pending / Initial Setup Controls */}
      {casino.isInitialSetup ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:ml-auto shrink-0 pt-1 sm:pt-0">
          <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-300 sm:hidden">
            <span className="font-semibold text-emerald-400">Newly Added:</span>
            <span>Did you claim today?</span>
          </div>

          <div className="hidden sm:flex flex-col items-end leading-tight mr-1 text-right">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Newly Added</span>
            <span className="text-[11px] text-zinc-300 font-medium">Did you claim today?</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 justify-end">
            {/* Snooze selector */}
            <select
              defaultValue=""
              onChange={(e) => {
                e.stopPropagation();
                const val = e.target.value;
                if (val && onInitialSnooze) {
                  onInitialSnooze(casino, val);
                }
              }}
              aria-label="Snooze newly added casino"
              className="h-8 px-2.5 bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs font-medium text-zinc-300 outline-none cursor-pointer shrink-0"
            >
              <option value="" disabled hidden>Snooze ⌵</option>
              <option value="15m" className="bg-[#101b15] text-white">15m</option>
              <option value="30m" className="bg-[#101b15] text-white">30m</option>
              <option value="1h" className="bg-[#101b15] text-white">1h</option>
              <option value="2h" className="bg-[#101b15] text-white">2h</option>
              <option value="4h" className="bg-[#101b15] text-white">4h</option>
              <option value="custom" className="bg-[#101b15] text-amber-400 font-semibold">Custom...</option>
            </select>

            {/* Decision Buttons */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResolveInitial) onResolveInitial(casino, false);
              }}
              className="h-8 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors cursor-pointer"
            >
              Did Not Claim
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResolveInitial) onResolveInitial(casino, true);
              }}
              className="h-8 px-2.5 rounded-lg bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 hover:brightness-110 text-white text-xs font-bold shadow-[0_2px_8px_rgba(16,185,129,0.3)] border-t border-emerald-300/40 transition-all cursor-pointer whitespace-nowrap"
            >
              Claimed Today
            </button>
          </div>
        </div>
      ) : isPending ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:ml-auto shrink-0">
          {/* Live Countdown Status Chip on Desktop */}
          <div className="hidden sm:flex items-center gap-1.5 h-8 rounded-lg border border-emerald-500/40 bg-[#0c1a13] px-2.5 font-mono text-xs font-semibold text-emerald-300 shadow-inner shrink-0 whitespace-nowrap">
            <span className="relative flex h-2 w-2 mr-0.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>
              Confirming in {Math.max(0, Math.ceil((pendingInfo!.expiresAt - currentNow) / 1000))}s...
            </span>
          </div>

          {/* Secondary Action Group: Snooze (with Custom Timer), and Kebab */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">

            {/* [Snooze ⌵] Select (Includes Custom Timer as top option) */}
            <select
              value=""
              onChange={(e) => {
                e.stopPropagation();
                const val = e.target.value;
                if (val === "custom") {
                  setIsCustomTimerOpen(true);
                } else if (val) {
                  const durationMs = Number(val);
                  if (durationMs && onSnoozeDuration) {
                    onSnoozeDuration(casino, durationMs);
                  }
                }
              }}
              aria-label="Snooze casino"
              className="h-8 flex-1 sm:flex-initial rounded-lg border border-amber-600/50 bg-[#1e1b13] px-2 text-xs font-semibold text-amber-300 outline-none hover:border-amber-500 focus:border-amber-400 cursor-pointer shrink-0"
            >
              <option value="" disabled hidden>
                Snooze ⌵
              </option>
              <option value="custom" className="bg-[#101b15] text-amber-400 font-semibold">
                Custom Timer...
              </option>
              <option disabled className="bg-[#0b140f] text-zinc-600">
                ──────────
              </option>
              {SNOOZE_PRESETS.map((preset) => (
                <option key={preset.ms} value={preset.ms} className="bg-[#101b15] text-white">
                  {preset.label}
                </option>
              ))}
            </select>

            {renderNotificationBell()}

            {/* Inline Kebab Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleActionMenu?.(casino.id);
              }}
              aria-label={`Settings for ${casino.name}`}
              title={`Settings for ${casino.name}`}
              className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-b from-zinc-950 to-[#07140e] hover:from-emerald-950/80 hover:to-[#071811] border border-emerald-900/60 hover:border-emerald-500/60 text-emerald-400 hover:text-emerald-300 shadow-[inset_0_1px_0_rgba(52,211,153,0.15),0_2px_0_#064e3b,0_4px_8px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_0_rgba(52,211,153,0.25),0_2px_0_#065f46,0_0_8px_rgba(16,185,129,0.15)] active:translate-y-[2px] active:shadow-[inset_0_1px_0_rgba(52,211,153,0.1),0_0_0_#064e3b,0_1px_2px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-100 cursor-pointer shrink-0 select-none"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          {/* Primary [Claimed ✓] Button (Anchored far-right) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onConfirmClaim) onConfirmClaim(casino);
              else onClaim(casino);
            }}
            className="h-8 w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-zinc-950 px-3.5 text-xs font-extrabold shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_0_#047857,0_3px_6px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_0_#059669,0_0_10px_rgba(52,211,153,0.3)] active:translate-y-[2px] active:shadow-none transition-all duration-100 cursor-pointer whitespace-nowrap select-none"
          >
            <CheckCircle2 size={14} strokeWidth={2.5} />
            <span>Claimed ✓</span>
          </button>
        </div>
      ) : (
        <div className="shrink-0 flex items-center gap-2 justify-end">
          {casino.bonusUrl && onOpenBonus && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenBonus(casino);
              }}
              aria-label={`Open ${casino.bonusTitle || "Bonus"} for ${casino.name}`}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#1b3d2f] hover:border-emerald-500/50 bg-[#07130e] hover:bg-[#0c1f17] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white shadow-[inset_0_1px_0_rgba(52,211,153,0.1),0_2px_0_#063826] active:translate-y-[1.5px] active:shadow-none transition-all duration-100"
            >
              <ExternalLink size={13} strokeWidth={2.5} />
              <span className="inline-flex items-center gap-1">{renderBonusLabel(casino.bonusTitle || "Bonus")}</span>
            </button>
          )}

          {currentStatus.ready ? (
            <>
              {renderNotificationBell()}

              {/* Inline Kebab Button (placed to the LEFT of the Claim button when ready) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleActionMenu?.(casino.id);
                }}
                aria-label={`Settings for ${casino.name}`}
                title={`Settings for ${casino.name}`}
                className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-b from-zinc-950 to-[#07140e] hover:from-emerald-950/80 hover:to-[#071811] border border-emerald-900/60 hover:border-emerald-500/60 text-emerald-400 hover:text-emerald-300 shadow-[inset_0_1px_0_rgba(52,211,153,0.15),0_2px_0_#064e3b,0_4px_8px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_0_rgba(52,211,153,0.25),0_2px_0_#065f46,0_0_8px_rgba(16,185,129,0.15)] active:translate-y-[2px] active:shadow-[inset_0_1px_0_rgba(52,211,153,0.1),0_0_0_#064e3b,0_1px_2px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-100 cursor-pointer shrink-0 select-none"
              >
                <MoreHorizontal size={16} />
              </button>

              {/* Ready Claim Button with vivid green indicator dot, clicky physical depth & bonus animations */}
              <button
                type="button"
                onClick={handleClaimClick}
                aria-label={`Claim ${casino.dailyBonus || "bonus"} for ${casino.name}`}
                className="h-8.5 sm:h-9 px-3.5 sm:px-4 rounded-xl bg-gradient-to-b from-[#082218] to-[#04140e] hover:from-[#0b2e21] hover:to-[#061a12] border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-emerald-200 font-bold text-xs sm:text-sm tracking-tight shadow-[inset_0_1px_0_rgba(52,211,153,0.3),0_2px_0_#064e3b,0_4px_8px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_0_rgba(52,211,153,0.4),0_2px_0_#065f46,0_0_12px_rgba(16,185,129,0.2)] active:translate-y-[2px] active:shadow-[inset_0_1px_0_rgba(52,211,153,0.2),0_0_0_#064e3b,0_1px_2px_rgba(0,0,0,0.5)] flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-100 cursor-pointer whitespace-nowrap select-none"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse shrink-0" />
                    <span className="pointer-events-none inline-flex items-center gap-1.5">
                      {casino.dailyBonus ? (
                        renderClaimBadge(casino.dailyBonus)
                      ) : (
                        <>Claim</>
                      )}
                    </span>
              </button>
            </>
          ) : (
            <>
              {/* Compact Countdown Timer Badge (click to override timer) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCustomTimerOpen(true);
                }}
                title="Click to override timer"
                aria-label={
                  currentStatus.isSnoozed
                    ? `Snoozed · ${formattedCountdown}. Click to override timer`
                    : `Resets in ${formattedCountdown}. Click to override timer`
                }
                className={`h-7 py-1 px-2 sm:px-2.5 rounded-md border flex items-center justify-center gap-1 sm:gap-1.5 font-mono text-[11px] font-medium tracking-tight shadow-inner shrink-0 cursor-pointer hover:border-emerald-500/60 transition active:scale-95 tabular-nums ${
                  currentStatus.isSnoozed
                    ? "border-amber-700/60 bg-amber-950/30 text-amber-300 hover:bg-amber-950/50"
                    : currentStatus.remainingMs < 3600000
                    ? "border-amber-700/60 bg-amber-950/60 text-amber-300 hover:bg-amber-950/80"
                    : "border-rose-800/60 bg-rose-950/60 text-rose-300 hover:bg-rose-950/80"
                }`}
              >
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  {currentStatus.isSnoozed || currentStatus.remainingMs < 3600000 ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500/80" />
                  )}
                </span>
                <span className="tabular-nums">
                  {currentStatus.isSnoozed ? (
                    <>
                      <span className="hidden sm:inline">Snoozed · </span>
                      <span>{formattedCountdown}</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Resets in </span>
                      <span>{formattedCountdown}</span>
                    </>
                  )}
                </span>
              </button>

              {renderNotificationBell()}

              {/* Inline Kebab Button (kept to the right when on cooldown/timer) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleActionMenu?.(casino.id);
                }}
                aria-label={`Settings for ${casino.name}`}
                title={`Settings for ${casino.name}`}
                className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-xl bg-zinc-950/60 border border-emerald-900/60 hover:border-emerald-500/50 flex items-center justify-center text-emerald-400 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <MoreHorizontal size={16} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Custom Timer Modal */}
      <CustomTimerModal
        isOpen={isCustomTimerOpen}
        casino={casino}
        currentRemainingMs={currentStatus.remainingMs}
        onClose={() => setIsCustomTimerOpen(false)}
        onSave={(target, targetResetTimestamp, customSc) => {
          setIsCustomTimerOpen(false);
          const casinoObj = typeof target === "string" ? casino : target;
          onSetCustomTimer?.(casinoObj, targetResetTimestamp, customSc);
        }}
      />
    </article>
  );
}

function areRollcallCardPropsEqual(prev: RollcallCardProps, next: RollcallCardProps): boolean {
  if (prev.casino !== next.casino) return false;
  if (prev.casino.targetResetTimestamp !== next.casino.targetResetTimestamp) return false;
  if (prev.casino.snoozedUntil !== next.casino.snoozedUntil) return false;
  if (prev.casino.lastClaimedAt !== next.casino.lastClaimedAt) return false;
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
  if (prev.isNotificationEnabled !== next.isNotificationEnabled) return false;
  if (prev.isNotificationBlocked !== next.isNotificationBlocked) return false;

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
