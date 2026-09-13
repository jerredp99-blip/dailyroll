"use client";

import { useState, useRef } from "react";
import {
  X,
  ExternalLink,
  ChevronRight,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  Play,
  RotateCcw,
} from "lucide-react";
import type { Casino } from "@/lib/store";
import { getCasinoDeepLink } from "@/lib/casinoLinks";
import { openInExternalBrowser } from "@/lib/openExternalLink";

export function SpeedRunModal({
  isOpen,
  onClose,
  readyCasinos,
  onClaim,
  renderLogo,
}: {
  isOpen: boolean;
  onClose: () => void;
  readyCasinos: Casino[];
  onClaim: (casino: Casino) => void;
  renderLogo?: (casino: Casino) => React.ReactNode;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [isStaggering, setIsStaggering] = useState(false);
  const [staggerStatus, setStaggerStatus] = useState<string | null>(null);
  const abortStaggerRef = useRef(false);

  if (!isOpen) return null;

  // Filter out any casinos that were already claimed during this session
  const remainingCasinos = readyCasinos.filter((c) => !claimedIds.includes(c.id));
  const totalOriginal = readyCasinos.length;
  const currentCasino = remainingCasinos[currentIndex] || remainingCasinos[0];
  const isFinished = remainingCasinos.length === 0;

  function handleLaunchAndNext() {
    if (!currentCasino) return;

    // 1. Mark claimed immediately before navigation (starts countdown timers)
    onClaim(currentCasino);
    setClaimedIds((prev) => [...prev, currentCasino.id]);

    // 2. Keep index in bounds for next item
    if (currentIndex >= remainingCasinos.length - 1) {
      setCurrentIndex(0);
    }

    // 3. Resolve deep link & open in external browser
    const deepLink = getCasinoDeepLink(currentCasino);
    if (deepLink) {
      openInExternalBrowser(deepLink);
    }
  }

  function handleSkip() {
    if (currentIndex < remainingCasinos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  }

  async function handleLaunchAllStaggered() {
    if (remainingCasinos.length === 0 || isStaggering) return;

    setIsStaggering(true);
    abortStaggerRef.current = false;

    for (let i = 0; i < remainingCasinos.length; i++) {
      if (abortStaggerRef.current) break;

      const casino = remainingCasinos[i];
      setStaggerStatus(`Launching ${i + 1} of ${remainingCasinos.length}: ${casino.name}...`);

      // 1. Mark claimed immediately before navigation (starts countdown timers)
      onClaim(casino);
      setClaimedIds((prev) => [...prev, casino.id]);

      // 2. Resolve deep link & open in external browser
      const deepLink = getCasinoDeepLink(casino);
      if (deepLink) {
        openInExternalBrowser(deepLink);
      }

      // Wait 1.5s interval before next launch to avoid browser pop-up suppression
      if (i < remainingCasinos.length - 1 && !abortStaggerRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setIsStaggering(false);
    setStaggerStatus(null);
  }

  function handleCancelStagger() {
    abortStaggerRef.current = true;
    setIsStaggering(false);
    setStaggerStatus(null);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="speed-run-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-5"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={isStaggering ? undefined : onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-3xl border border-[#2d4e38] bg-[#0e1813] p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-[#e6eee5] overflow-hidden">
        {/* Glow backdrop effects */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#39ff6a]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-56 w-56 rounded-full bg-emerald-700/10 blur-3xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-[#213a29] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-[#39ff6a] shadow-[0_0_12px_rgba(57,255,106,0.3)]">
              <Zap size={20} fill="#39ff6a" />
            </span>
            <div>
              <h2 id="speed-run-title" className="text-base sm:text-lg font-bold text-white">
                Speed-Run Claim Mode
              </h2>
              <p className="text-xs text-[#8ca892]">
                Fast deep-link claiming with zero friction
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close speed-run modal"
            disabled={isStaggering}
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#294231] text-[#8ea894] transition hover:border-[#4b7759] hover:bg-[#192b20] hover:text-white disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Finished / All Caught Up State */}
        {isFinished ? (
          <div className="py-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-600/40 bg-[#162a1e] text-[#39ff6a] shadow-[0_0_24px_rgba(57,255,106,0.3)] mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-bold text-white">All Rolls Claimed! 🎉</h3>
            <p className="mt-1 text-xs text-[#8da593] max-w-sm mx-auto">
              You claimed {claimedIds.length} ready roll{claimedIds.length === 1 ? "" : "s"} in this speed-run.
              Timers are reset for 24 hours.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#79b77f] px-6 py-2.5 text-sm font-bold text-[#101815] shadow-lg transition hover:bg-[#91c991] hover:-translate-y-0.5"
              >
                Back to Tracker
              </button>
            </div>
          </div>
        ) : (
          /* Active Step-By-Step Runner */
          <div className="mt-5 space-y-5">
            {/* Progress Bar & Counter */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-[#8ca892] mb-1.5">
                <span className="font-semibold text-emerald-300">
                  Casino {totalOriginal - remainingCasinos.length + 1} of {totalOriginal}
                </span>
                <span>{remainingCasinos.length} remaining</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#18291f]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#39ff6a] transition-all duration-300 shadow-[0_0_8px_rgba(57,255,106,0.5)]"
                  style={{
                    width: `${Math.round(((totalOriginal - remainingCasinos.length) / totalOriginal) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Current Casino Card */}
            <div className="relative rounded-2xl border border-emerald-700/60 bg-gradient-to-b from-[#15271d] to-[#101e16] p-5 sm:p-6 shadow-inner text-center">
              {/* Logo / Monogram */}
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-500/30 bg-[#1d3527] text-xl font-bold text-[#9bcf9c] shadow-lg mb-3.5">
                {renderLogo ? renderLogo(currentCasino) : currentCasino.name.slice(0, 2).toUpperCase()}
              </div>

              {/* Casino Title & Bonus */}
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {currentCasino.name}
              </h3>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-[#1e3928] px-3.5 py-1 text-xs font-bold text-[#39ff6a] shadow-[0_0_12px_rgba(57,255,106,0.2)]">
                <Sparkles size={13} />
                <span>Daily: {currentCasino.dailyBonus}</span>
              </div>

              <p className="mt-3 text-[11px] text-[#7d9984] font-mono truncate max-w-xs mx-auto">
                Target: {getCasinoDeepLink(currentCasino)}
              </p>
            </div>

            {/* Staggered progress banner if active */}
            {isStaggering && (
              <div className="flex items-center justify-between rounded-xl border border-teal-800/60 bg-[#122b22] px-4 py-2.5 text-xs text-teal-300 shadow-sm animate-pulse">
                <span>{staggerStatus}</span>
                <button
                  type="button"
                  onClick={handleCancelStagger}
                  className="rounded px-2 py-0.5 text-xs font-bold text-red-400 hover:bg-red-950/50"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                {/* Skip */}
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isStaggering || remainingCasinos.length <= 1}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#314f3c] bg-[#142219] px-4 text-xs sm:text-sm font-semibold text-[#a3bfa8] transition hover:border-[#528263] hover:bg-[#1a2e22] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Skip</span>
                  <ChevronRight size={15} />
                </button>

                {/* Launch & Next */}
                <button
                  type="button"
                  onClick={handleLaunchAndNext}
                  disabled={isStaggering}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#79b77f] to-[#39ff6a] px-4 text-xs sm:text-sm font-bold text-[#0d1712] shadow-[0_4px_18px_rgba(57,255,106,0.35)] transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <ExternalLink size={16} strokeWidth={2.5} />
                  <span>Launch & Next</span>
                </button>
              </div>

              {/* Launch All Staggered Option */}
              <button
                type="button"
                onClick={handleLaunchAllStaggered}
                disabled={isStaggering || remainingCasinos.length <= 1}
                className="flex w-full h-10 items-center justify-center gap-2 rounded-xl border border-[#2b4434] bg-[#0d1611] px-4 text-xs font-semibold text-[#8ca892] transition hover:border-emerald-600/50 hover:bg-[#14231b] hover:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play size={13} fill="#8ca892" />
                <span>Launch All Staggered (1.5s delay)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
