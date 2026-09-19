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
  Wallet,
  Loader2,
  MoreVertical,
  Lightbulb,
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
} from "@/lib/speedRunStorage";
import { CustomTimerModal } from "@/components/CustomTimerModal";
import { CasinoDetailsModal } from "@/components/CasinoDetailsModal";
import { calculateCasinoStatus } from "@/lib/timerUtils";

interface SpeedRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  readyCasinos: Casino[];
  allCasinos?: Casino[];
  onClaim: (casino: Casino) => void;
  onClaimSuccess?: (casinoId: string, updatedData?: Partial<Casino>) => void;
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
  onClaimSuccess,
  onUpdateCasino,
  onSnooze,
  renderLogo,
}: SpeedRunModalProps) {
  // Session state from storage or fresh queue
  const [session, setSession] = useState<SpeedRunSessionState | null>(null);

  // Form inputs for State 3 (Log Balance) and State 2 (Value tracking)
  const [balanceInput, setBalanceInput] = useState<string>("");
  const [noteInput, setNoteInput] = useState<string>("");
  const [claimScInput, setClaimScInput] = useState<string>("");
  const [isSpeedRunCustomTimerOpen, setIsSpeedRunCustomTimerOpen] = useState(false);
  const [cheatSheetCasinoId, setCheatSheetCasinoId] = useState<string | null>(null);

  // Animation state for gamified Session Loot counter
  const [animatingLoot, setAnimatingLoot] = useState(false);
  const [lastLootIncrement, setLastLootIncrement] = useState<number | null>(null);

  // Fast map lookup of casinos by ID (called unconditionally)
  const casinoMap = useMemo(() => {
    const map = new Map<string, Casino>();
    allCasinos.forEach((c) => map.set(c.id, c));
    readyCasinos.forEach((c) => map.set(c.id, c));
    return map;
  }, [allCasinos, readyCasinos]);

  // Calculate updated total bankroll sum across all casinos (called unconditionally)
  const totalTrackedBankroll = useMemo(() => {
    return allCasinos.reduce((sum, c) => {
      const bal = typeof c.currentBalance === "number" ? c.currentBalance : 0;
      return sum + bal;
    }, 0);
  }, [allCasinos]);

  // Track whether modal was open to avoid wiping active queue on parent re-renders
  const wasOpenRef = useRef(false);
  const readyCasinosRef = useRef(readyCasinos);
  readyCasinosRef.current = readyCasinos;
  const allCasinosRef = useRef(allCasinos);
  allCasinosRef.current = allCasinos;
  const casinoMapRef = useRef(casinoMap);
  casinoMapRef.current = casinoMap;

  // Transient state for dynamic queue ingestion & +1 badge callouts
  const [pendingNewlyAddedIds, setPendingNewlyAddedIds] = useState<string[]>([]);
  const [showPlusOneBadge, setShowPlusOneBadge] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const badgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Dynamic Queue Ingestion: check every 1.5s while open and session active
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const currentSession = sessionRef.current;
      if (!currentSession || currentSession.completed) return;

      const now = Date.now();
      const candidateCasinos =
        allCasinosRef.current.length > 0 ? allCasinosRef.current : readyCasinosRef.current;

      const existingQueueSet = new Set(currentSession.queueIds);
      const claimedSet = new Set(currentSession.claimedIds);
      const skippedSet = new Set(currentSession.skippedIds);
      const snoozedSet = new Set(Object.keys(currentSession.snoozedIds || {}));

      const newlyUnlockedIds: string[] = [];

      candidateCasinos.forEach((c) => {
        if (!c || c.hidden) return;
        if (
          !existingQueueSet.has(c.id) &&
          !claimedSet.has(c.id) &&
          !skippedSet.has(c.id) &&
          !snoozedSet.has(c.id)
        ) {
          const status = calculateCasinoStatus(c, now);
          if (status.ready) {
            newlyUnlockedIds.push(c.id);
          }
        }
      });

      if (newlyUnlockedIds.length > 0) {
        setSession((prev) => {
          if (!prev) return null;
          const updatedQueueIds = [...prev.queueIds, ...newlyUnlockedIds];
          const updatedSession: SpeedRunSessionState = {
            ...prev,
            queueIds: updatedQueueIds,
            completed: false,
          };
          saveSpeedRunSession(updatedSession);
          return updatedSession;
        });

        setPendingNewlyAddedIds((prev) => Array.from(new Set([...prev, ...newlyUnlockedIds])));
        setAddedCount(newlyUnlockedIds.length);
        setShowPlusOneBadge(true);

        if (badgeTimeoutRef.current) clearTimeout(badgeTimeoutRef.current);
        badgeTimeoutRef.current = setTimeout(() => {
          setShowPlusOneBadge(false);
        }, 2500);
      }
    }, 1500);

    return () => {
      clearInterval(interval);
    };
  }, [isOpen]);

  function handleCloseModal() {
    wasOpenRef.current = false;
    onClose();
  }

  // Synchronize / initialize session whenever modal opens or mounts
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    if (wasOpenRef.current) return;
    wasOpenRef.current = true;

    let cancelled = false;
    const currentReady = readyCasinosRef.current.filter((c) => !c.hidden);
    const readyIds = new Set(currentReady.map((c) => c.id));

    if (currentReady.length === 0) {
      clearSpeedRunSession();
      setSession(null);
      return;
    }

    try {
      const existing = loadSpeedRunSession();
      if (
        existing &&
        Array.isArray(existing.queueIds) &&
        existing.queueIds.length > 0 &&
        !existing.completed
      ) {
        // Filter existing queue strictly by currently ready casino IDs
        const validQueueIds = existing.queueIds.filter((id) => readyIds.has(id));
        if (validQueueIds.length > 0) {
          const safeIndex =
            typeof existing.currentIndex === "number" &&
            existing.currentIndex >= 0 &&
            existing.currentIndex < validQueueIds.length
              ? existing.currentIndex
              : 0;
          const safeStep: SpeedRunStep =
            existing.currentStep === 1 || existing.currentStep === 2 || existing.currentStep === 3
              ? existing.currentStep
              : 1;

          setSession({
            ...existing,
            queueIds: validQueueIds,
            currentIndex: safeIndex,
            currentStep: safeStep,
          });
        } else {
          clearSpeedRunSession();
          setSession(createSpeedRunSession(currentReady));
        }
      } else {
        const newSession = createSpeedRunSession(currentReady);
        setSession(newSession);
      }
    } catch (err) {
      console.error("Failed to load Speed Run session:", err);
      clearSpeedRunSession();
      setSession(createSpeedRunSession(currentReady));
    }

    // Cross-browser persistence: sync latest session from server once on open
    fetchSpeedRunSessionFromServer().then((serverSession) => {
      if (
        cancelled ||
        !serverSession ||
        serverSession.completed ||
        !Array.isArray(serverSession.queueIds) ||
        serverSession.queueIds.length === 0
      ) {
        return;
      }
      const filteredQueueIds = serverSession.queueIds.filter((id) => readyIds.has(id));
      if (filteredQueueIds.length === 0) return;

      const safeIndex =
        typeof serverSession.currentIndex === "number" &&
        serverSession.currentIndex >= 0 &&
        serverSession.currentIndex < filteredQueueIds.length
          ? serverSession.currentIndex
          : 0;

      const normalizedServerSession = {
        ...serverSession,
        queueIds: filteredQueueIds,
        currentIndex: safeIndex,
      };

      setSession((prev) => {
        if (!prev) return normalizedServerSession;
        if (
          normalizedServerSession.currentIndex > prev.currentIndex ||
          (normalizedServerSession.currentIndex === prev.currentIndex &&
            normalizedServerSession.currentStep >= prev.currentStep)
        ) {
          return normalizedServerSession;
        }
        return prev;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Resume persistence: Listen to visibilitychange and focus to guarantee seamless resume when returning from browser
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
            (serverSession.currentIndex === prev.currentIndex &&
              serverSession.currentStep > prev.currentStep)
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

  // Safe URL validator
  function isValidHttpUrl(stringUrl?: string | null): boolean {
    if (!stringUrl) return false;
    try {
      const trimmed = stringUrl.trim();
      if (!trimmed) return false;
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  // Keyboard navigation listener with clean unmount cleanup
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === "Escape") {
        handleCloseModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Current session navigation state
  const activeQueueIds = session?.queueIds ?? [];
  const currentIndex = session?.currentIndex ?? 0;
  const currentCasinoId = activeQueueIds[currentIndex];
  const currentCasino = currentCasinoId
    ? casinoMap.get(currentCasinoId) ??
      readyCasinos.find((c) => c?.id === currentCasinoId) ??
      allCasinos.find((c) => c?.id === currentCasinoId)
    : undefined;

  const isNewlyAdded = Boolean(
    currentCasinoId && pendingNewlyAddedIds.includes(currentCasinoId)
  );

  // Clear viewed card from pending newly added set
  useEffect(() => {
    if (currentCasinoId && pendingNewlyAddedIds.includes(currentCasinoId)) {
      setPendingNewlyAddedIds((prev) => prev.filter((id) => id !== currentCasinoId));
    }
  }, [currentCasinoId, pendingNewlyAddedIds]);

  // Sync inputs when current casino changes
  useEffect(() => {
    if (currentCasino) {
      setBalanceInput(
        typeof currentCasino.currentBalance === "number"
          ? String(currentCasino.currentBalance)
          : ""
      );
      setNoteInput(currentCasino.notes || "");
      // Balance input starts empty as it is purely optional
      setClaimScInput("");
    }
  }, [currentCasinoId, currentCasino]);

  // Session metrics
  const totalInQueue = activeQueueIds.length;
  const currentStep = session?.currentStep ?? 1;
  const sessionLootSc = session?.sessionLootSc ?? 0;
  const sessionLootGc = session?.sessionLootGc ?? 0;
  const claimedCount = session?.claimedIds.length ?? 0;
  const isCompleted =
    Boolean(session?.completed) ||
    (session !== null && (totalInQueue === 0 || currentIndex >= totalInQueue));

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

  // Unified robust Queue Progression handler
  interface AdvanceQueueOptions {
    claimId?: string;
    skipId?: string;
    snooze?: { id: string; until: string };
    addedSc?: number;
    addedGc?: number;
  }

  function advanceQueue(options: AdvanceQueueOptions = {}) {
    if (badgeTimeoutRef.current) clearTimeout(badgeTimeoutRef.current);
    setShowPlusOneBadge(false);

    setSession((prev) => {
      if (!prev) return null;

      const nextIndex = prev.currentIndex + 1;
      const isFinished = nextIndex >= prev.queueIds.length;

      const nextClaimed = options.claimId
        ? Array.from(new Set([...prev.claimedIds, options.claimId]))
        : prev.claimedIds;

      const nextSkipped = options.skipId
        ? Array.from(new Set([...prev.skippedIds, options.skipId]))
        : prev.skippedIds;

      const nextSnoozed = options.snooze
        ? { ...prev.snoozedIds, [options.snooze.id]: options.snooze.until }
        : prev.snoozedIds;

      const nextLootSc = prev.sessionLootSc + (options.addedSc ?? 0);
      const nextLootGc = prev.sessionLootGc + (options.addedGc ?? 0);

      if (isFinished) {
        clearSpeedRunSession();
        return {
          ...prev,
          currentIndex: prev.currentIndex,
          currentStep: 1, // Strictly reset step back to 1
          completed: true,
          claimedIds: nextClaimed,
          skippedIds: nextSkipped,
          snoozedIds: nextSnoozed,
          sessionLootSc: nextLootSc,
          sessionLootGc: nextLootGc,
        };
      }

      const updated: SpeedRunSessionState = {
        ...prev,
        currentIndex: nextIndex,
        currentStep: 1, // Strictly reset step back to 1 for the new casino
        completed: false,
        claimedIds: nextClaimed,
        skippedIds: nextSkipped,
        snoozedIds: nextSnoozed,
        sessionLootSc: nextLootSc,
        sessionLootGc: nextLootGc,
      };

      saveSpeedRunSession(updated);
      return updated;
    });
  }

  // -------------------------------------------------------------
  // STATE 1: "Launch" View
  // -------------------------------------------------------------
  function handleLaunch() {
    if (!currentCasino || !session) return;

    // 1. Resolve deep link & validate URL before opening
    const deepLink =
      getCasinoDeepLink(currentCasino) || currentCasino.bonusUrl || currentCasino.url || "";
    if (deepLink && isValidHttpUrl(deepLink)) {
      try {
        openInExternalBrowser(deepLink);
      } catch (err) {
        console.error("Failed to open external link:", err);
      }
    }

    // 2. Advance to State 2 ("Verification" View) immediately AFTER user clicks Launch
    setSession((prev) => {
      if (!prev) return null;
      const nextSession: SpeedRunSessionState = {
        ...prev,
        currentStep: 2,
      };
      saveSpeedRunSession(nextSession);
      return nextSession;
    });
  }

  // Skip from State 1 directly to next casino in queue
  function handleSkipFromState1() {
    if (!currentCasino || !session) return;
    advanceQueue({ skipId: currentCasino.id });
  }

  // -------------------------------------------------------------
  // STATE 2: "Verification" View ("Did you claim it?")
  // -------------------------------------------------------------
  // User answered [Yes, Claimed] -> Only advance to Step 3 if confirmed
  // User answered [Yes, Claimed] -> Submits claim and advances queue; applies balance update only if explicitly entered
  function handleConfirmClaimed() {
    if (!session || !currentCasino) return;

    // Check if user explicitly typed an SC balance into the optional input
    const parsedBalance = claimScInput.trim() !== "" ? parseFloat(claimScInput) : undefined;
    const hasExplicitBalance = typeof parsedBalance === "number" && !isNaN(parsedBalance);

    const rewardSc = parseScReward(currentCasino?.dailyBonus ?? "") || 1.0;
    const rewardGc = parseGcReward(currentCasino?.dailyBonus ?? "");

    const updates: Partial<Casino> = {
      snoozedUntil: null,
      targetResetTimestamp: null,
    };

    if (hasExplicitBalance) {
      updates.currentBalance = parsedBalance;
    }

    // Persist claim and optional balance updates
    if (onClaimSuccess) {
      try {
        onClaimSuccess(currentCasino.id, updates);
      } catch (err) {
        console.error("Failed to mark casino claimed in onClaimSuccess:", err);
      }
    } else {
      try {
        onClaim(currentCasino);
      } catch (err) {
        console.error("Failed to mark casino claimed in onClaim:", err);
      }

      if (hasExplicitBalance && onUpdateCasino) {
        try {
          onUpdateCasino(currentCasino, updates);
        } catch (err) {
          console.error("Failed to update casino balance in onUpdateCasino:", err);
        }
      }
    }

    // Add daily bonus reward to session tally
    triggerLootAnimation(rewardSc);

    // Advance queue immediately to next casino
    advanceQueue({
      claimId: currentCasino.id,
      addedSc: rewardSc,
      addedGc: rewardGc,
    });
  }

  // User answered [Snooze] with standard duration
  function handleSnoozeDuration(durationMs: number) {
    if (!currentCasino || !session) return;

    const newResetTimestamp = Date.now() + durationMs;
    const snoozedUntil = new Date(newResetTimestamp).toISOString();
    const nowIso = new Date().toISOString();
    const parsedSc = claimScInput.trim() !== "" ? parseFloat(claimScInput) : undefined;
    const updates: Partial<Casino> = {
      snoozedUntil,
      targetResetTimestamp: newResetTimestamp,
      lastClaimedAt: nowIso,
      ...(typeof parsedSc === "number" && !isNaN(parsedSc)
        ? { dailyBonusSc: String(parsedSc), dailyBonus: `${parsedSc} SC` }
        : {}),
    };

    try {
      if (onUpdateCasino) {
        onUpdateCasino(currentCasino, updates);
      } else if (onSnooze) {
        onSnooze(currentCasino, snoozedUntil);
      }
    } catch (err) {
      console.error("Failed to snooze casino in onSnooze:", err);
    }

    advanceQueue({
      snooze: { id: currentCasino.id, until: snoozedUntil },
    });
  }

  // User set Custom Timer
  function handleCustomTimerSave(targetResetTimestamp: number | null, customSc?: number) {
    if (!currentCasino || !session) return;

    const isReady = !targetResetTimestamp || targetResetTimestamp <= Date.now();
    const nowIso = new Date().toISOString();
    const updates: Partial<Casino> = {
      targetResetTimestamp: isReady ? null : targetResetTimestamp,
      snoozedUntil: null,
      lastClaimedAt: isReady ? null : nowIso,
      ...(customSc !== undefined
        ? { dailyBonusSc: String(customSc), dailyBonus: `${customSc} SC` }
        : {}),
    };

    try {
      if (onUpdateCasino) {
        onUpdateCasino(currentCasino, updates);
      }
    } catch (err) {
      console.error("Failed to set custom timer in SpeedRun:", err);
    }

    if (isReady) {
      advanceQueue({ skipId: currentCasino.id });
    } else {
      advanceQueue({
        snooze: { id: currentCasino.id, until: new Date(targetResetTimestamp).toISOString() },
      });
    }
  }

  // Fallback 1h snooze
  function handleSnooze() {
    handleSnoozeDuration(60 * 60 * 1000);
  }

  // User answered [Failed / Skip] -> Leaves as 'ready', advances queue
  function handleFailedSkip() {
    if (!currentCasino || !session) return;
    advanceQueue({
      skipId: currentCasino.id,
    });
  }

  // -------------------------------------------------------------
  // STATE 3: "Log Balance (Optional)"
  // -------------------------------------------------------------
  // Primary: "Save & Next" -> Updates DB record, adds claim value, advances queue
  function handleSaveBalanceAndNext() {
    if (!currentCasino || !session) return;

    const parsedBalance = balanceInput.trim() !== "" ? parseFloat(balanceInput) : undefined;
    const cleanNote = noteInput.trim() || undefined;
    const parsedSc = claimScInput.trim() !== "" ? parseFloat(claimScInput) : undefined;
    const fallbackSc = parseScReward(currentCasino?.dailyBonus ?? "");
    const rewardSc = typeof parsedSc === "number" && !isNaN(parsedSc) ? parsedSc : fallbackSc;

    const updates: Partial<Casino> = {
      currentBalance:
        typeof parsedBalance === "number" && !isNaN(parsedBalance)
          ? parsedBalance
          : currentCasino.currentBalance,
      notes: cleanNote ?? currentCasino.notes,
      snoozedUntil: null,
      targetResetTimestamp: null,
      dailyBonusSc: String(rewardSc),
      dailyBonus: `${rewardSc} SC`,
    };

    // 1. Mark claimed & persist balance/notes atomically
    if (onClaimSuccess) {
      try {
        onClaimSuccess(currentCasino.id, updates);
      } catch (err) {
        console.error("Failed to update casino in onClaimSuccess:", err);
      }
    } else {
      try {
        onClaim(currentCasino);
      } catch (err) {
        console.error("Failed to mark casino claimed in onClaim:", err);
      }

      if (onUpdateCasino) {
        try {
          onUpdateCasino(currentCasino, updates);
        } catch (err) {
          console.error("Failed to update casino balance/notes in onUpdateCasino:", err);
        }
      }
    }

    // 2. Add daily bonus reward to session tally
    const rewardGc = parseGcReward(currentCasino?.dailyBonus ?? "");
    triggerLootAnimation(rewardSc);

    // 3. Advance queue
    advanceQueue({
      claimId: currentCasino.id,
      addedSc: rewardSc,
      addedGc: rewardGc,
    });
  }

  // Secondary: "Skip & Next" -> Marks claimed, adds loot value, advances queue without saving balance/note
  function handleSkipBalanceAndNext() {
    if (!currentCasino || !session) return;

    const parsedSc = claimScInput.trim() !== "" ? parseFloat(claimScInput) : undefined;
    const fallbackSc = parseScReward(currentCasino?.dailyBonus ?? "");
    const rewardSc = typeof parsedSc === "number" && !isNaN(parsedSc) ? parsedSc : fallbackSc;

    // 1. Mark claimed with try/catch
    if (onClaimSuccess) {
      try {
        onClaimSuccess(currentCasino.id, {
          dailyBonusSc: String(rewardSc),
          dailyBonus: `${rewardSc} SC`,
        });
      } catch (err) {
        console.error("Failed to mark casino claimed in onClaimSuccess:", err);
      }
    } else {
      try {
        onClaim(currentCasino);
      } catch (err) {
        console.error("Failed to mark casino claimed in onClaim:", err);
      }
    }

    // 2. Add daily bonus reward to session tally
    const rewardGc = parseGcReward(currentCasino?.dailyBonus ?? "");
    triggerLootAnimation(rewardSc);

    // 3. Advance queue
    advanceQueue({
      claimId: currentCasino.id,
      addedSc: rewardSc,
      addedGc: rewardGc,
    });
  }

  // Finish Run & Reset Session
  function handleFinishAndClose() {
    clearSpeedRunSession();
    setSession(null);
    handleCloseModal();
  }

  // Restart Run (strictly ready casinos only)
  function handleRestart() {
    clearSpeedRunSession();
    const ready = readyCasinosRef.current.filter((c) => !c.hidden);
    if (ready.length > 0) {
      const newSession = createSpeedRunSession(ready);
      setSession(newSession);
    } else {
      setSession(null);
    }
  }

  // Provider and micro-instructions for current casino
  const currentProvider = currentCasino ? getCasinoProvider(currentCasino) : "";
  const microInstruction = currentCasino ? getCasinoMicroInstruction(currentCasino) : null;
  const showProviderBadge = Boolean(
    currentCasino &&
    currentProvider &&
    currentProvider.trim().toLowerCase() !== currentCasino.name.trim().toLowerCase() &&
    !currentProvider.trim().toLowerCase().includes("independent") &&
    !currentProvider.trim().toLowerCase().includes("other")
  );

  if (!isOpen) return null;

  // Sleek loading state while session initializes on mount
  if (!session && readyCasinos.length > 0) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="speed-run-loading"
        className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-5"
      >
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={handleCloseModal} />
        <div className="relative w-full max-w-sm rounded-3xl border border-[#2d4e38] bg-[#0c1611] p-6 text-center text-[#e6eee5] shadow-2xl">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#39ff6a] border-t-transparent mb-3" />
          <h3 id="speed-run-loading" className="text-sm font-bold text-white">Starting Speed Run...</h3>
          <p className="mt-1 text-xs text-[#8ca892]">Preparing ready casinos queue</p>
        </div>
      </div>
    );
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
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={handleCloseModal}
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
            <h2 id="speed-run-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
              Speed Run V2
            </h2>
          </div>

          {/* Gamified Live Claim Counter */}
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
                <span className="text-[10px] block leading-none text-[#8ca892]">Claimed This Session</span>
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
              onClick={handleCloseModal}
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
              {totalInQueue === 0 && claimedCount === 0
                ? "All Caught Up! 🎯"
                : "Speed Run Complete! 🎉"}
            </h3>
            <p className="mt-1 text-xs text-[#8da593] max-w-sm mx-auto">
              {totalInQueue === 0 && claimedCount === 0
                ? "No casinos are currently ready to claim. All daily rolls are on cooldown or completed."
                : "Session completed. All verified rolls have timers reset and balance tallies updated."}
            </p>

            {/* Receipt Summary Grid */}
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              {/* Total SC Claimed */}
              <div className="rounded-2xl border border-emerald-800/40 bg-gradient-to-b from-[#14261d] to-[#0f1c15] p-3.5 shadow-inner">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#8ea394]">
                  <Sparkles size={13} className="text-[#39ff6a]" />
                  Total SC Claimed
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

              {/* Total Updated Balance Across All Casinos */}
              <div className="col-span-2 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-[#1b2b20] to-[#16251b] p-3.5 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <Wallet size={14} className="text-amber-400" />
                    Total Tracked Casino Balance
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
                  <span>Queue {currentIndex + 1} of</span>
                  <span className="relative inline-flex items-center ml-1">
                    <span>{totalInQueue}</span>
                    {showPlusOneBadge && (
                      <span className="absolute -top-3 -right-6 text-[10px] font-black text-emerald-400 bg-emerald-950/90 border border-emerald-500/40 px-1.5 py-0.5 rounded-full animate-bounce">
                        +{addedCount}
                      </span>
                    )}
                  </span>
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
            {currentCasino ? (
              <div className="relative rounded-2xl border border-emerald-700/50 bg-gradient-to-b from-[#15271d] to-[#0f1c15] p-4 sm:p-5 shadow-inner text-center">
                {/* Top-Right Kebab Trigger for Cheat Sheet */}
                <button
                  type="button"
                  onClick={() => setCheatSheetCasinoId(currentCasino.id)}
                  className="absolute top-3.5 right-3.5 p-2 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                  title="View Casino Cheat Sheet"
                  aria-label="Open cheat sheet"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Provider Pill Badge / Just Unlocked Callout */}
                {(showProviderBadge || isNewlyAdded) && (
                  <div className="mb-3 flex justify-center gap-2 items-center flex-wrap">
                    {isNewlyAdded && (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full animate-fadeIn">
                        ✨ Just Unlocked
                      </span>
                    )}
                    {showProviderBadge && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-600/40 bg-[#12281e] px-3 py-0.5 text-[11px] font-bold text-teal-300 shadow-sm">
                        <span>Provider Group:</span>
                        <strong className="text-white">{currentProvider}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* Logo / Monogram */}
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-500/30 bg-[#1d3527] text-xl font-bold text-[#9bcf9c] shadow-lg mb-2.5">
                  {renderLogo && currentCasino
                    ? renderLogo(currentCasino)
                    : (currentCasino?.name?.slice(0, 2) || "CR").toUpperCase()}
                </div>

                {/* Casino Title & Daily Bonus */}
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {currentCasino?.name ?? "Casino Bonus"}
                </h3>
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-[#1e3928] px-3.5 py-1 text-xs font-bold text-[#39ff6a] shadow-[0_0_12px_rgba(57,255,106,0.2)]">
                  <Sparkles size={13} />
                  <span>Daily Reward: {currentCasino?.dailyBonus ?? "Free Claim"}</span>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* STATE 1: "Launch" View */}
                {/* ------------------------------------------------------------- */}
                {currentStep === 1 && (
                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      onClick={handleLaunch}
                      className="w-full h-14 rounded-2xl inline-flex items-center justify-center gap-2.5 text-base font-black text-white bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 border-t border-emerald-300/60 border-x border-b border-emerald-900 shadow-[0_6px_20px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(255,255,255,0.4),0_3px_0_rgba(6,78,59,1)] hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_8px_rgba(16,185,129,0.3)] transition-all cursor-pointer select-none"
                    >
                      <ExternalLink className="w-5 h-5 text-white stroke-[2.5]" />
                      <span>Launch {currentCasino?.name ?? "Casino"}</span>
                    </button>

                    {/* Unified Claim Tip Callout */}
                    {(currentCasino?.claimTip || microInstruction) && (
                      <div className="w-full p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-left">
                        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                        <p className="text-[11px] text-amber-200/90 leading-tight">
                          <strong className="text-amber-300">Tip:</strong> {currentCasino?.claimTip || microInstruction}
                        </p>
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
                {/* STATE 2: "Verification" View ("Claimed?") */}
                {/* ------------------------------------------------------------- */}
                {currentStep === 2 && (
                  <div className="mt-4 animate-fadeIn">
                    {/* Centered Section Label */}
                    <div className="w-full flex items-center justify-center my-3">
                      <span className="text-xs font-bold tracking-wider uppercase text-zinc-400">
                        Claimed?
                      </span>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                      {/* Left: Failed / Skip */}
                      <button
                        type="button"
                        onClick={handleFailedSkip}
                        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[#314f3c] bg-[#142219] py-2.5 px-2 text-xs font-semibold text-[#a3bfa8] transition hover:border-[#528263] hover:bg-[#1a2e22] hover:text-white active:scale-95 cursor-pointer h-full"
                      >
                        <X size={16} />
                        <span>Failed / Skip</span>
                      </button>

                      {/* Center: Snooze ⌵ Dropdown */}
                      <div className="relative flex flex-col items-center justify-center rounded-xl border border-amber-600/40 bg-[#1a281e] p-2 hover:bg-[#25392a] hover:border-amber-500 transition h-full">
                        <Clock size={16} className="text-amber-300 mb-0.5" />
                        <span className="text-[10px] font-semibold text-amber-300 mb-1">Snooze ⌵</span>
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "custom") {
                              setIsSpeedRunCustomTimerOpen(true);
                            } else if (val) {
                              handleSnoozeDuration(Number(val));
                            }
                          }}
                          aria-label="Snooze duration"
                          className="w-full text-center text-xs font-bold bg-[#0f1d15] border border-amber-700/60 rounded-lg py-1 px-1 text-amber-300 outline-none cursor-pointer"
                        >
                          <option value="">Choose ⌵</option>
                          <option value={15 * 60 * 1000}>15m</option>
                          <option value={30 * 60 * 1000}>30m</option>
                          <option value={60 * 60 * 1000}>1h</option>
                          <option value={2 * 60 * 60 * 1000}>2h</option>
                          <option value={4 * 60 * 60 * 1000}>4h</option>
                          <option value={8 * 60 * 60 * 1000}>8h</option>
                          <option value="custom">Custom...</option>
                        </select>
                      </div>

                      {/* Right: Yes, Claimed */}
                      <button
                        type="button"
                        onClick={handleConfirmClaimed}
                        className="flex flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-emerald-500 to-[#39ff6a] py-2.5 px-2 text-xs font-bold text-[#0d1712] shadow-[0_4px_14px_rgba(57,255,106,0.35)] transition hover:scale-102 active:scale-95 cursor-pointer h-full"
                      >
                        <CheckCircle2 size={16} />
                        <span>Yes, Claimed</span>
                      </button>
                    </div>

                    {/* Simplified Balance Input Row underneath buttons */}
                    <div className="w-full mt-4 pt-3 border-t border-emerald-500/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-zinc-300">Track balance:</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                          optional
                        </span>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={claimScInput}
                          onChange={(e) => setClaimScInput(e.target.value)}
                          placeholder="0.00"
                          className="w-24 h-8 px-2 text-right bg-zinc-950/80 border border-emerald-500/25 rounded-lg text-xs font-bold text-emerald-400 placeholder-zinc-600 focus:outline-none focus:border-emerald-400"
                        />
                        <span className="text-[10px] font-semibold text-zinc-500 ml-1.5">SC</span>
                      </div>
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
            ) : (
              <div className="rounded-2xl border border-amber-600/40 bg-[#16251b] p-6 text-center">
                <AlertCircle className="mx-auto text-amber-400 mb-2" size={28} />
                <h4 className="text-sm font-bold text-white">Casino Not Found in Database</h4>
                <p className="text-xs text-[#8ca892] mt-1">This casino roll could not be resolved from local data.</p>
                <button
                  type="button"
                  onClick={() => advanceQueue({ skipId: currentCasinoId })}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-[#39ff6a] px-4 py-2 text-xs font-bold text-[#0d1712] shadow-sm hover:scale-102 transition cursor-pointer"
                >
                  <span>Skip to Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isSpeedRunCustomTimerOpen && currentCasino && (
        <CustomTimerModal
          isOpen={isSpeedRunCustomTimerOpen}
          casino={currentCasino}
          initialSc={claimScInput}
          onClose={() => setIsSpeedRunCustomTimerOpen(false)}
          onSave={(target, targetResetTimestamp, customSc) => {
            setIsSpeedRunCustomTimerOpen(false);
            handleCustomTimerSave(targetResetTimestamp, customSc);
          }}
        />
      )}

      {/* Casino Details Modal (Cheat Sheet Overlay) */}
      <CasinoDetailsModal
        casinoId={cheatSheetCasinoId}
        isOpen={Boolean(cheatSheetCasinoId)}
        onClose={() => setCheatSheetCasinoId(null)}
      />
    </div>
  );
}
