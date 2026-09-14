"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Clock,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { Casino } from "@/types/casino";
import { CasinoLogo } from "@/components/CasinoLogo";
import { TrustpilotStars } from "@/components/TrustpilotStars";
import { openInExternalBrowser } from "@/lib/openExternalLink";
import {
  formatRemainingTimer,
  type CasinoStatus,
  calculateCustomResetTimestamp,
} from "@/lib/timerUtils";

export function CasinoDetailHeader({
  casino,
  isTracked,
  status,
  onClaim,
  onResetToReady,
  onCancelSnooze,
  onSetCustomTimer,
  onAddToRollcall,
}: {
  casino: Casino;
  isTracked: boolean;
  status: CasinoStatus;
  onClaim?: () => void;
  onResetToReady?: () => void;
  onCancelSnooze?: () => void;
  onSetCustomTimer?: (targetResetTimestamp: number) => void;
  onAddToRollcall?: () => void;
}) {
  const [isTimerMenuOpen, setIsTimerMenuOpen] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [customHours, setCustomHours] = useState("");
  const [customMinutes, setCustomMinutes] = useState("");
  const timerMenuRef = useRef<HTMLDivElement>(null);

  const formattedCountdown = formatRemainingTimer(status.remainingMs);
  const externalUrl = casino.siteUrl || casino.claimUrl || casino.url;

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

  const handleClaimClick = () => {
    if (externalUrl) {
      openInExternalBrowser(externalUrl);
    }
    onClaim?.();
  };

  const handleApplyAdjustTimer = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(customHours || "0", 10);
    const m = parseInt(customMinutes || "0", 10);
    if (isNaN(h) && isNaN(m)) return;
    if (h === 0 && m === 0) {
      setShowAdjustModal(false);
      onResetToReady?.();
      return;
    }
    const targetReset = calculateCustomResetTimestamp(Math.max(0, h || 0), Math.max(0, m || 0));
    setShowAdjustModal(false);
    setCustomHours("");
    setCustomMinutes("");
    onSetCustomTimer?.(targetReset);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-[#14231b] via-[#0f1914] to-[#0c1410] p-4 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
      {/* Top row: Back link + External site link */}
      <div className="flex items-center justify-between gap-3 border-b border-emerald-950 pb-3 sm:pb-4">
        <Link
          href="/tracker"
          className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition"
        >
          <ArrowLeft size={16} className="transition group-hover:-translate-x-1" />
          <span>Back to Rollcall</span>
        </Link>

        {externalUrl && (
          <button
            type="button"
            onClick={() => openInExternalBrowser(externalUrl)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-[#16271e] px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-[#1d3327] hover:text-white transition cursor-pointer"
          >
            <span>Visit Casino</span>
            <ExternalLink size={13} />
          </button>
        )}
      </div>

      {/* Main identity & Live tracking section */}
      <div className="mt-4 sm:mt-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left: Casino Logo + Title + Provider + Rating */}
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
          <div className="grid h-14 w-14 sm:h-16 sm:w-16 shrink-0 place-items-center rounded-2xl border border-emerald-800/60 bg-[#1a2f23] p-2 shadow-inner">
            <CasinoLogo
              name={casino.name}
              siteUrl={casino.siteUrl}
              className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
              fallbackClassName="text-lg sm:text-xl font-black text-emerald-400"
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                {casino.name}
              </h1>
              {casino.provider && (
                <span className="rounded-full border border-emerald-700/50 bg-[#13261b] px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                  {casino.provider}
                </span>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <TrustpilotStars rating={casino.trustpilotRating} className="text-sm" />
                {casino.trustpilotRating && (
                  <span className="font-semibold text-gray-300">
                    {Number(casino.trustpilotRating).toFixed(1)}
                  </span>
                )}
              </div>

              {casino.dailyBonus && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-400 border border-emerald-800/40">
                  <Sparkles size={11} />
                  {casino.dailyBonus}
                </span>
              )}

              {typeof casino.currentBalance === "number" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                  <Wallet size={12} />
                  {casino.currentBalance.toFixed(2)} SC
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Tracking Controls */}
        <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
          {isTracked ? (
            status.ready ? (
              <button
                type="button"
                onClick={handleClaimClick}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#39ff6a] to-[#25db54] px-5 py-2.5 text-sm font-extrabold text-[#0d1712] shadow-[0_6px_20px_rgba(57,255,106,0.35)] transition hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(57,255,106,0.5)] active:scale-95 cursor-pointer ring-2 ring-[#39ff6a]/60"
              >
                <CheckCircle2 size={18} strokeWidth={2.5} />
                <span>Claim {casino.dailyBonus}!</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {/* Cooldown pill with pulsing green dot */}
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono text-xs sm:text-sm font-bold shadow-inner ${
                    status.isSnoozed
                      ? "border-amber-700/60 bg-[#1c1810] text-amber-300"
                      : "border-emerald-800/60 bg-[#0e1b14] text-[#edf5ec]"
                  }`}
                >
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span>
                    {status.isSnoozed
                      ? `Snoozed · ${formattedCountdown}`
                      : `Resets in ${formattedCountdown}`}
                  </span>
                </div>

                {/* Quick actions popup trigger */}
                <div className="relative" ref={timerMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsTimerMenuOpen(!isTimerMenuOpen)}
                    aria-label="Timer options"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-800/60 bg-[#132219] text-gray-300 hover:border-emerald-500 hover:text-white transition cursor-pointer"
                  >
                    <MoreHorizontal size={17} />
                  </button>

                  {isTimerMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-emerald-700/60 bg-[#101e16] p-1 shadow-2xl backdrop-blur-md">
                      <button
                        type="button"
                        onClick={() => {
                          setIsTimerMenuOpen(false);
                          onResetToReady?.();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-emerald-300 hover:bg-emerald-950 transition cursor-pointer"
                      >
                        <RotateCcw size={14} />
                        <span>Mark Ready to Claim</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsTimerMenuOpen(false);
                          setShowAdjustModal(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-gray-200 hover:bg-emerald-950 transition cursor-pointer"
                      >
                        <Clock size={14} />
                        <span>Adjust Timer</span>
                      </button>

                      {status.isSnoozed && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsTimerMenuOpen(false);
                            onCancelSnooze?.();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-amber-400 hover:bg-emerald-950 transition cursor-pointer"
                        >
                          <span>Cancel Snooze</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            onAddToRollcall && (
              <button
                type="button"
                onClick={onAddToRollcall}
                className="flex items-center gap-2 rounded-xl border border-emerald-600/70 bg-[#193323] px-4 py-2 text-xs sm:text-sm font-bold text-emerald-200 hover:bg-[#22442f] hover:text-white transition shadow-[0_4px_16px_rgba(0,0,0,0.3)] cursor-pointer"
              >
                <Plus size={16} />
                <span>Add to My Rollcall</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Adjust Timer Inline Modal */}
      {showAdjustModal && (
        <div className="mt-4 rounded-xl border border-emerald-700/60 bg-[#0e1b14] p-3.5">
          <form onSubmit={handleApplyAdjustTimer} className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-emerald-300">Set Timer:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="72"
                placeholder="0"
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                className="h-8 w-14 rounded-lg border border-emerald-700/60 bg-[#16271e] text-center text-xs font-bold text-white focus:outline-none focus:border-emerald-400"
              />
              <span className="text-xs text-gray-400">h</span>
              <input
                type="number"
                min="0"
                max="59"
                placeholder="0"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="h-8 w-14 rounded-lg border border-emerald-700/60 bg-[#16271e] text-center text-xs font-bold text-white focus:outline-none focus:border-emerald-400"
              />
              <span className="text-xs text-gray-400">m</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-extrabold text-black hover:bg-emerald-400"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default CasinoDetailHeader;
