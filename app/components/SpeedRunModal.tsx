"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  ExternalLink,
  ChevronRight,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  RotateCcw,
  Coins,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Wallet,
} from "lucide-react";
import type { Casino, SpeedRunSessionState, SpeedRunStep } from "@/types/casino";
import { getCasinoDeepLink } from "@/lib/casinoLinks";
import { openInExternalBrowser } from "@/lib/openExternalLink";
import {
  loadSpeedRunSession,
  saveSpeedRunSession,
  clearSpeedRunSession,
  createSpeedRunSession,
  fetchSpeedRunSessionFromServer,
  getCasinoProvider,
  getCasinoMicroInstruction,
  parseScReward,
  parseGcReward,
  sortSpeedRunQueue,
} from "@/lib/speedRunStorage";

interface SpeedRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  readyCasinos: Casino[];
  allCasinos?: Casino[];
  onClaim: (casino: Casino) => void;
  onUpdateCasino?: (casino: Casino, updates: Partial<Casino>) => void;
  onSnooze?: (casino: Casino, snoozedUntil: string) => void;
  renderLogo?: (casino: Casino) => React.ReactNode;
}

export function SpeedRunModal({
  isOpen,
  onClose,
  readyCasinos,
  allCasinos = [],
  onClaim,
  onUpdateCasino,
  onSnooze,
  renderLogo,
}: SpeedRunModalProps) {
  // Session state from storage or fresh queue
  const [session, setSession] = useState<SpeedRunSessionState | null>(null);

  // Form inputs for State 3 (Log Balance)
  const [balanceInput, setBalanceInput] = useState<string>("");
  const [noteInput, setNoteInput] = useState<string>("");

  // Animation state for gamified Session Loot counter
  const [animatingLoot, setAnimatingLoot] = useState(false);
  const [lastLootIncrement, setLastLootIncrement] = useState<number | null>(null);

  // Fast map lookup of casinos by ID
  const casinoMap = useMemo(() => {
    const map = new Map<string, Casino>();
    allCasinos.forEach((c) => map.set(c.id, c));
    readyCasinos.forEach((c) => map.set(c.id, c));
    return map;
  }, [allCasinos, readyCasinos]);

  // Synchronize / initialize session whenever modal opens or mounts
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const existing = loadSpeedRunSession();
    if (existing && existing.queueIds.length > 0 && !existing.completed) {
      const hasValidItems = existing.queueIds.some((id) => casinoMap.has(id));
      if (hasValidItems) {
        setSession(existing);
      }
    } else if (readyCasinos.length > 0) {
      const newSession = createSpeedRunSession(readyCasinos);
      setSession(newSession);
    } else {
      setSession(null);
    }

    // Cross-browser persistence: sync latest session from server
    fetchSpeedRunSessionFromServer().then((serverSession) => {
      if (cancelled || !serverSession || serverSession.completed || serverSession.queueIds.length === 0) return;
      setSession((prev) => {
        if (!prev) return serverSession;
        // If server session is further along or has higher loot/index, prefer server
        if (
          serverSession.currentIndex > prev.currentIndex ||
          (serverSession.currentIndex === prev.currentIndex && serverSession.currentStep >= prev.currentStep)
        ) {
          return serverSession;
        }
        return prev;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, readyCasinos, casinoMap]);

  // Resume persistence: Listen to visibilitychange and focus to guarantee seamless resume when returning from Chrome
  useEffect(() => {
    if (!isOpen) return;

    function handleResume() {
      const stored = loadSpeedRunSession();
      if (stored) {
        setSession((prev) => {
          if (!prev) return stored;
          if (
            stored.currentIndex !== prev.currentIndex ||
            stored.currentStep !== prev.currentStep ||
            stored.sessionLootSc !== prev.sessionLootSc
          ) {
            return stored;
          }
          return prev;
        });
      }

      // Background server sync on resume
      fetchSpeedRunSessionFromServer().then((serverSession) => {
        if (!serverSession || serverSession.completed) return;
        setSession((prev) => {
          if (!prev) return serverSession;
          if (
            serverSession.currentIndex > prev.currentIndex ||
            (serverSession.currentIndex === prev.currentIndex && serverSession.currentStep > prev.currentStep)
          ) {
            return serverSession;
          }
          return prev;
        });
      });
    }

    window.addEventListener("focus", handleResume);
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      window.removeEventListener("focus", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [isOpen]);

  // Sync inputs when current casino changes
  const activeQueueIds = session?.queueIds ?? [];
  const currentIndex = session?.currentIndex ?? 0;
  const currentCasinoId = activeQueueIds[currentIndex];
  const currentCasino = currentCasinoId ? casinoMap.get(currentCasinoId) : undefined;

  useEffect(() => {
    if (currentCasino) {
      setBalanceInput(
        typeof currentCasino.currentBalance === "number"
          ? String(currentCasino.currentBalance)
          : ""
      );
      setNoteInput(currentCasino.notes || "");
    }
  }, [currentCasinoId, currentCasino]);

  if (!isOpen) return null;

  // Session metrics
  const totalInQueue = activeQueueIds.length;
  const currentStep = session?.currentStep ?? 1;
  const sessionLootSc = session?.sessionLootSc ?? 0;
  const sessionLootGc = session?.sessionLootGc ?? 0;
  const claimedCount = session?.claimedIds.length ?? 0;
  const isCompleted = Boolean(session?.completed) || totalInQueue === 0 || currentIndex >= totalInQueue;

  // Trigger loot counter animation
  function triggerLootAnimation(addedSc: number) {
    if (addedSc > 0) {
      setLastLootIncrement(addedSc);
      setAnimatingLoot(true);
      setTimeout(() => {
        setAnimatingLoot(false);
        setLastLootIncrement(null);
      }, 1200);
    }
  }

  // -------------------------------------------------------------
  // STATE 1: "Launch" View
  // -------------------------------------------------------------
  function handleLaunch() {
    if (!currentCasino || !session) return;

    // 1. Resolve deep link & open in external browser / Chrome
    const deepLink = getCasinoDeepLink(currentCasino);
    if (deepLink) {
      openInExternalBrowser(deepLink);
    }

    // 2. Advance to State 2 ("Verification" View) and persist immediately
    const nextSession: SpeedRunSessionState = {
      ...session,
      currentStep: 2,
    };
    setSession(nextSession);
    saveSpeedRunSession(nextSession);
  }

  // Skip from State 1 directly to next casino in queue
  function handleSkipFromState1() {
    if (!session || !currentCasino) return;

    const nextIndex = currentIndex + 1;
    const completed = nextIndex >= totalInQueue;
    const nextSession: SpeedRunSessionState = {
      ...session,
      currentIndex: nextIndex,
      currentStep: 1,
      skippedIds: [...session.skippedIds, currentCasino.id],
      completed,
    };
    setSession(nextSession);
    saveSpeedRunSession(nextSession);
  }

  // -------------------------------------------------------------
  // STATE 2: "Verification" View ("Did you claim it?")
  // -------------------------------------------------------------
  // User answered [Yes]
  function handleConfirmClaimed() {
    if (!session) return;
    const nextSession: SpeedRunSessionState = {
      ...session,
      currentStep: 3, // Move to State 3 (Log Balance)
    };
    setSession(nextSession);
    saveSpeedRunSession(nextSession);
  }

  // User answered [Snooze 1h] -> Sets 1h hold, advances queue
  function handleSnooze() {
    if (!session || !currentCasino) return;

    const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Call onSnooze or onUpdateCasino
    if (onSnooze) {
      onSnooze(currentCasino, snoozedUntil);
    } else if (onUpdateCasino) {
      onUpdateCasino(currentCasino, { snoozedUntil });
    }

    const nextIndex = currentIndex + 1;
    const completed = nextIndex >= totalInQueue;
    const nextSession: SpeedRunSessionState = {
      ...session,
      currentIndex: nextIndex,
      currentStep: 1,
      snoozedIds: {
        ...session.snoozedIds,
        [currentCasino.id]: snoozedUntil,
      },
      completed,
    };
    setSession(nextSession);
    saveSpeedRunSession(nextSession);
  }

  // User answered [Failed / Skip] -> Leaves as 'ready', advances queue
  function handleFailedSkip() {
    if (!session || !currentCasino) return;

    const nextIndex = currentIndex + 1;
    const completed = nextIndex >= totalInQueue;
    const nextSession: SpeedRunSessionState = {
      ...session,
      currentIndex: nextIndex,
      currentStep: 1,
      skippedIds: [...session.skippedIds, currentCasino.id],
      completed,
    };
    setSession(nextSession);
    saveSpeedRunSession(nextSession);
  }

  // -------------------------------------------------------------
  // STATE 3: "Log Balance (Optional)"
  // -------------------------------------------------------------
  // Primary: "Save & Next" -> Updates user-casino DB record, adds claim value to session tally, advances queue
  function handleSaveBalanceAndNext() {
    if (!session || !currentCasino) return;

    const parsedBalance = balanceInput.trim() !== "" ? parseFloat(balanceInput) : undefined;
    const cleanNote = noteInput.trim() || undefined;

    // 1. Mark claimed
    onClaim(currentCasino);

    // 2. Update DB record with balance and note
    if (onUpdateCasino) {
      onUpdateCasino(currentCasino, {
        currentBalance: typeof parsedBalance === "number" && !isNaN(parsedBalance) ? parsedBalance : currentCasino.currentBalance,
        notes: cleanNote ?? currentCasino.notes,
        snoozedUntil: null,
      });
    }

    // 3. Add daily bonus reward to session tally
    const rewardSc = parseScReward(currentCasino.dailyBonus);
    const rewardGc = parseGcReward(currentCasino.dailyBonus);
    triggerLootAnimation(rewardSc);

    // 4. Advance queue
    const nextIndex = currentIndex + 1;
    const completed = nextIndex >= totalInQueue;
    const nextSession: SpeedRunSessionState = {
      ...session,
      currentIndex: nextIndex,
      currentStep: 1,
      sessionLootSc: session.sessionLootSc + rewardSc,
      sessionLootGc: session.sessionLootGc + rewardGc,
      claimedIds: [...session.claimedIds, currentCasino.id],
      completed,
    };

    setSession(nextSession);
    saveSpeedRunSession(nextSession);
  }

  // Secondary: "Skip & Next" -> Marks claimed, adds loot value, advances queue without saving balance/note
  function handleSkipBalanceAndNext() {
    if (!session || !currentCasino) return;

    // 1. Mark claimed
    onClaim(currentCasino);

    // 2. Add daily bonus reward to session tally
    const rewardSc = parseScReward(currentCasino.dailyBonus);
    const rewardGc = parseGcReward(currentCasino.dailyBonus);
    triggerLootAnimation(rewardSc);

    // 3. Advance queue
    const nextIndex = currentIndex + 1;
    const completed = nextIndex >= totalInQueue;
    const nextSession: SpeedRunSessionState = {
      ...session,
      currentIndex: nextIndex,
      currentStep: 1,
      sessionLootSc: session.sessionLootSc + rewardSc,
      sessionLootGc: session.sessionLootGc + rewardGc,
      claimedIds: [...session.claimedIds, currentCasino.id],
      completed,
    };

    setSession(nextSession);
    saveSpeedRunSession(nextSession);
  }

  // Finish Run & Reset Session
  function handleFinishAndClose() {
    clearSpeedRunSession();
    setSession(null);
    onClose();
  }

  // Restart Run (e.g. for any remaining or skipped)
  function handleRestart() {
    if (readyCasinos.length > 0) {
      const newSession = createSpeedRunSession(readyCasinos);
      setSession(newSession);
    }
  }

  // Calculate updated total bankroll sum across all casinos
  const totalTrackedBankroll = useMemo(() => {
    return allCasinos.reduce((sum, c) => {
      const bal = typeof c.currentBalance === "number" ? c.currentBalance : 0;
      return sum + bal;
    }, 0);
  }, [allCasinos]);

  // Provider and micro-instructions for current casino
  const currentProvider = currentCasino ? getCasinoProvider(currentCasino) : "Independent";
  const microInstruction = currentCasino ? getCasinoMicroInstruction(currentCasino) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="speed-run-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-5"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-3xl border border-[#2d4e38] bg-[#0c1611] p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.7)] text-[#e6eee5] overflow-hidden">
        {/* Glow backdrop ambient effects */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#39ff6a]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl" />

        {/* Header with Gamified Live Loot Counter */}
        <div className="relative flex items-center justify-between border-b border-[#1f3727] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-[#39ff6a] shadow-[0_0_15px_rgba(57,255,106,0.35)]">
              <Zap size={20} fill="#39ff6a" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="speed-run-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Speed Run V2
                </h2>
                <span className="rounded-full bg-emerald-950/80 border border-emerald-600/40 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wide">
                  Step {currentStep} of 3
                </span>
              </div>
              <p className="text-[11px] text-[#8ca892]">
                State-aware session runner & bankroll tracker
              </p>
            </div>
          </div>

          {/* Gamified Live Loot Counter */}
          <div className="flex items-center gap-2">
            <div
              className={`relative flex items-center gap-1.5 rounded-xl border px-3 py-1.5 transition-all duration-300 ${
                animatingLoot
                  ? "border-amber-400/80 bg-amber-500/20 text-amber-200 scale-105 shadow-[0_0_16px_rgba(245,158,11,0.5)]"
                  : "border-[#2d4936] bg-[#122218] text-[#39ff6a] shadow-inner"
              }`}
            >
              <Coins size={14} className={animatingLoot ? "text-amber-300 animate-spin" : "text-[#39ff6a]"} />
              <div className="text-right font-mono">
                <span className="text-[10px] block leading-none text-[#8ca892]">Session Loot</span>
                <span className="text-xs sm:text-sm font-black">
                  +{sessionLootSc.toFixed(2)} <span className="text-[10px]">SC</span>
                </span>
              </div>

              {/* Floating animated increment popup */}
              {animatingLoot && lastLootIncrement !== null && (
                <span className="absolute -top-3 -right-2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-black shadow-md animate-bounce">
                  +{lastLootIncrement.toFixed(2)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close speed-run modal"
              className="grid h-8 w-8 place-items-center rounded-lg border border-[#273d2f] text-[#8ea894] transition hover:border-[#4b7759] hover:bg-[#192b20] hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* RUN COMPLETE RECEIPT VIEW */}
        {/* ------------------------------------------------------------- */}
        {isCompleted ? (
          <div className="py-6 text-center animate-fadeIn">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-500/50 bg-[#162d20] text-[#39ff6a] shadow-[0_0_28px_rgba(57,255,106,0.35)] mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Speed Run Complete! 🎉
            </h3>
            <p className="mt-1 text-xs text-[#8da593] max-w-sm mx-auto">
              Session completed. All verified rolls have timers reset and balance tallies updated.
            </p>

            {/* Receipt Summary Grid */}
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              {/* Total SC Loot */}
              <div className="rounded-2xl border border-emerald-800/40 bg-gradient-to-b from-[#14261d] to-[#0f1c15] p-3.5 shadow-inner">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#8ea394]">
                  <Sparkles size={13} className="text-[#39ff6a]" />
                  Total Loot Collected
                </span>
                <p className="mt-1 text-lg sm:text-xl font-extrabold text-[#39ff6a] font-mono">
                  +{sessionLootSc.toFixed(2)} SC
                </p>
                {sessionLootGc > 0 && (
                  <p className="text-[10px] text-[#7d9b84] font-mono">
                    +{sessionLootGc.toLocaleString()} GC
                  </p>
                )}
              </div>

              {/* Casinos Claimed */}
              <div className="rounded-2xl border border-emerald-800/40 bg-gradient-to-b from-[#14261d] to-[#0f1c15] p-3.5 shadow-inner">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#8ea394]">
                  <ShieldCheck size={13} className="text-teal-400" />
                  Casinos Claimed
                </span>
                <p className="mt-1 text-lg sm:text-xl font-extrabold text-white font-mono">
                  {claimedCount} of {totalInQueue}
                </p>
                <p className="text-[10px] text-[#7d9b84]">
                  {session?.snoozedIds && Object.keys(session.snoozedIds).length > 0
                    ? `${Object.keys(session.snoozedIds).length} snoozed 1h`
                    : "No snoozed rolls"}
                </p>
              </div>

              {/* Total Updated Bankroll Across All Casinos */}
              <div className="col-span-2 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-[#1b2b20] to-[#16251b] p-3.5 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <Wallet size={14} className="text-amber-400" />
                    Total Tracked Bankroll
                  </span>
                  <span className="text-[10px] font-mono text-[#8ca592]">
                    across all active casinos
                  </span>
                </div>
                <p className="mt-1 text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                  ${totalTrackedBankroll.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-amber-200">SC</span>
                </p>
              </div>
            </div>

            {/* Receipt Actions */}
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={handleRestart}
                className="flex items-center gap-1.5 rounded-xl border border-[#2e4c39] bg-[#122218] px-4 py-2.5 text-xs font-bold text-[#a6c4ad] transition hover:bg-[#1a3123] hover:text-white"
              >
                <RotateCcw size={14} />
                <span>Run Again</span>
              </button>

              <button
                type="button"
                onClick={handleFinishAndClose}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#79b77f] to-[#39ff6a] px-6 py-2.5 text-xs sm:text-sm font-bold text-[#0d1712] shadow-[0_4px_18px_rgba(57,255,106,0.35)] transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Done & Return to Tracker</span>
              </button>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* ACTIVE 3-STEP STATE RUNNER */
          /* ------------------------------------------------------------- */
          <div className="mt-5 space-y-4">
            {/* Progress Bar & Counter */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-[#8ca892] mb-1.5">
                <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <span>Queue {currentIndex + 1} of {totalInQueue}</span>
                  {currentCasino?.resetAtTime && (
                    <span className="rounded bg-teal-950/80 border border-teal-600/40 px-1.5 py-0.2 text-[9px] font-bold text-teal-300">
                      Fixed Reset
                    </span>
                  )}
                </span>
                <span>{totalInQueue - currentIndex} remaining</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#18291f]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#39ff6a] transition-all duration-300 shadow-[0_0_8px_rgba(57,255,106,0.5)]"
                  style={{
                    width: `${Math.round(((currentIndex) / Math.max(1, totalInQueue)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Current Casino Header Card */}
            {currentCasino && (
              <div className="relative rounded-2xl border border-emerald-700/50 bg-gradient-to-b from-[#15271d] to-[#0f1c15] p-4 sm:p-5 shadow-inner text-center">
                {/* Provider Pill Badge */}
                <div className="mb-3 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-600/40 bg-[#12281e] px-3 py-0.5 text-[11px] font-bold text-teal-300 shadow-sm">
                    <span>Provider Group:</span>
                    <strong className="text-white">{currentProvider}</strong>
                  </span>
                </div>

                {/* Logo / Monogram */}
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-500/30 bg-[#1d3527] text-xl font-bold text-[#9bcf9c] shadow-lg mb-2.5">
                  {renderLogo ? renderLogo(currentCasino) : currentCasino.name.slice(0, 2).toUpperCase()}
                </div>

                {/* Casino Title & Daily Bonus */}
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {currentCasino.name}
                </h3>
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-[#1e3928] px-3.5 py-1 text-xs font-bold text-[#39ff6a] shadow-[0_0_12px_rgba(57,255,106,0.2)]">
                  <Sparkles size={13} />
                  <span>Daily Reward: {currentCasino.dailyBonus}</span>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* STATE 1: "Launch" View */}
                {/* ------------------------------------------------------------- */}
                {currentStep === 1 && (
                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      onClick={handleLaunch}
                      className="flex h-13 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#79b77f] to-[#39ff6a] px-4 text-sm sm:text-base font-bold text-[#0d1712] shadow-[0_4px_20px_rgba(57,255,106,0.4)] transition hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <ExternalLink size={18} strokeWidth={2.5} />
                      <span>Launch {currentCasino.name}</span>
                    </button>

                    {/* Micro-Instructions (Cheat Codes) Tip Callout */}
                    {microInstruction && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-left text-xs text-amber-200 animate-fadeIn">
                        <span className="shrink-0 text-base leading-none">💡</span>
                        <div>
                          <span className="font-semibold text-amber-300">Tip: </span>
                          <span>{microInstruction}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-1 flex justify-center">
                      <button
                        type="button"
                        onClick={handleSkipFromState1}
                        className="text-xs text-[#8ca892] hover:text-white transition flex items-center gap-1 cursor-pointer py-1"
                      >
                        <span>Skip this casino</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* STATE 2: "Verification" View ("Did you claim it?") */}
                {/* ------------------------------------------------------------- */}
                {currentStep === 2 && (
                  <div className="mt-5 space-y-4 animate-fadeIn">
                    <div className="rounded-xl border border-teal-700/50 bg-[#12281e] p-3 text-center">
                      <p className="text-sm sm:text-base font-bold text-white">
                        Did you claim it?
                      </p>
                      <p className="text-xs text-[#8ca892] mt-0.5">
                        Confirm claim status before updating timers and balance.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                      {/* Snooze 1h */}
                      <button
                        type="button"
                        onClick={handleSnooze}
                        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-amber-600/40 bg-[#1a281e] py-2.5 px-2 text-xs font-semibold text-amber-300 transition hover:bg-[#25392a] hover:border-amber-500 active:scale-95"
                      >
                        <Clock size={16} />
                        <span>Snooze 1h</span>
                      </button>

                      {/* Failed / Skip */}
                      <button
                        type="button"
                        onClick={handleFailedSkip}
                        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[#314f3c] bg-[#142219] py-2.5 px-2 text-xs font-semibold text-[#a3bfa8] transition hover:border-[#528263] hover:bg-[#1a2e22] hover:text-white active:scale-95"
                      >
                        <X size={16} />
                        <span>Failed / Skip</span>
                      </button>

                      {/* Yes, Claimed */}
                      <button
                        type="button"
                        onClick={handleConfirmClaimed}
                        className="flex flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-emerald-500 to-[#39ff6a] py-2.5 px-2 text-xs font-bold text-[#0d1712] shadow-[0_4px_14px_rgba(57,255,106,0.35)] transition hover:scale-102 active:scale-95"
                      >
                        <CheckCircle2 size={16} />
                        <span>Yes, Claimed</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* STATE 3: "Log Balance (Optional)" */}
                {/* ------------------------------------------------------------- */}
                {currentStep === 3 && (
                  <div className="mt-5 space-y-3.5 text-left animate-fadeIn">
                    <div className="rounded-xl border border-emerald-600/40 bg-[#14281d] p-3">
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <Wallet size={14} />
                        <span>Log Balance (Optional)</span>
                      </span>
                      <p className="text-[11px] text-[#8ca892] mt-0.5">
                        Update your active SC balance and memo for this casino.
                      </p>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-[#8ea394] mb-1">
                          Current SC Balance
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#718f77] font-mono">
                            SC
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g. 25.50"
                            value={balanceInput}
                            onChange={(e) => setBalanceInput(e.target.value)}
                            className="w-full rounded-xl border border-[#2b4635] bg-[#0c1611] py-2 pl-9 pr-3 text-xs sm:text-sm text-white placeholder:text-[#5e7865] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#8ea394] mb-1">
                          Quick Note (e.g. hit a bonus)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. hit free spins bonus round!"
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          maxLength={120}
                          className="w-full rounded-xl border border-[#2b4635] bg-[#0c1611] px-3 py-2 text-xs sm:text-sm text-white placeholder:text-[#5e7865] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Buttons: Primary "Save & Next" + Secondary "Skip & Next" */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={handleSkipBalanceAndNext}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#314f3c] bg-[#142219] px-3 text-xs font-semibold text-[#a3bfa8] transition hover:border-[#528263] hover:bg-[#1a2e22] hover:text-white active:scale-98"
                      >
                        <span>Skip & Next</span>
                        <ChevronRight size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveBalanceAndNext}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#79b77f] to-[#39ff6a] px-3 text-xs font-bold text-[#0d1712] shadow-[0_4px_14px_rgba(57,255,106,0.35)] transition hover:scale-102 active:scale-98"
                      >
                        <CheckCircle2 size={15} />
                        <span>Save & Next</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
