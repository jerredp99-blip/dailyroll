import React, { useState, useEffect, createContext, useContext } from "react";
import type { Casino } from "@/types/casino";

export function useCurrentTime(): number {
  const [now, setNow] = useState(() => (typeof window !== "undefined" ? Date.now() : 0));
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export const TimeContext = createContext<number>(0);

export function TimeProvider({ children }: { children: React.ReactNode }) {
  const now = useCurrentTime();
  return React.createElement(TimeContext.Provider, { value: now }, children);
}

export function useCurrentTimeContext(): number {
  const ctx = useContext(TimeContext);
  return ctx || Date.now();
}

export type StatusState = "ready" | "pending" | "claimed";

export interface CasinoStatus {
  ready: boolean;
  state: StatusState;
  label: string;
  shortLabel: string;
  remainingMs: number;
  isSnoozed?: boolean;
}

export const SNOOZE_PRESETS = [
  { label: "15 minutes", ms: 15 * 60 * 1000 },
  { label: "30 minutes", ms: 30 * 60 * 1000 },
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "2 hours", ms: 2 * 60 * 60 * 1000 },
  { label: "4 hours", ms: 4 * 60 * 60 * 1000 },
  { label: "8 hours", ms: 8 * 60 * 60 * 1000 },
] as const;

export function formatRemainingTimer(remainingMs: number): string {
  if (remainingMs <= 0) return "Ready";
  const hours = Math.floor(remainingMs / 3600000);
  const minutes = Math.floor((remainingMs % 3600000) / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatSnoozeRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return "Ready";
  const hours = Math.floor(remainingMs / 3600000);
  const minutes = Math.floor((remainingMs % 3600000) / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function calculateCustomResetTimestamp(
  hours: number,
  minutes: number,
  fromTime: number = Date.now(),
): number {
  const safeHours = Math.max(0, Number(hours) || 0);
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  return fromTime + safeHours * 3600000 + safeMinutes * 60000;
}

export function calculateCasinoStatus(casino: Casino, now: number = Date.now()): CasinoStatus {
  // 1. Explicit target reset timestamp (highest priority: Custom Timer or Snooze Override)
  if (casino.targetResetTimestamp) {
    const targetReset =
      typeof casino.targetResetTimestamp === "string"
        ? new Date(casino.targetResetTimestamp).getTime()
        : Number(casino.targetResetTimestamp);

    if (targetReset && !isNaN(targetReset)) {
      const remaining = targetReset - now;
      if (remaining <= 0) {
        return {
          ready: true,
          state: "ready",
          label: "Ready to claim",
          shortLabel: "now",
          remainingMs: 0,
        };
      }

      const isSnoozed = Boolean(
        casino.snoozedUntil &&
        new Date(casino.snoozedUntil).getTime() > now
      );

      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`;

      return {
        ready: false,
        state: remaining <= 3600000 ? "pending" : "claimed",
        label: isSnoozed ? `Snoozed (${timeStr})` : `${hours}h ${minutes}m ${seconds}s`,
        shortLabel: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`,
        remainingMs: remaining,
        isSnoozed,
      };
    }
  }

  // 2. Fallback Snooze hold if targetResetTimestamp was not set
  if (casino.snoozedUntil) {
    const snoozeEnd = new Date(casino.snoozedUntil).getTime();
    if (!isNaN(snoozeEnd)) {
      const remaining = snoozeEnd - now;
      if (remaining <= 0) {
        // Snooze duration has expired; casino is ready to claim
        return {
          ready: true,
          state: "ready",
          label: "Ready to claim",
          shortLabel: "now",
          remainingMs: 0,
        };
      }
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`;
      return {
        ready: false,
        state: "pending",
        label: `Snoozed (${timeStr})`,
        shortLabel: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        remainingMs: remaining,
        isSnoozed: true,
      };
    }
  }

  // 3. If never claimed, casino is ready
  if (!casino.lastClaimedAt) {
    return {
      ready: true,
      state: "ready",
      label: "Ready to claim",
      shortLabel: "now",
      remainingMs: 0,
    };
  }

  // 4. Default interval or fixed reset time
  let nextReset =
    new Date(casino.lastClaimedAt).getTime() +
    (casino.intervalHours || 24) * 60 * 60 * 1000;

  if (casino.resetAtTime) {
    const [hours, minutes] = casino.resetAtTime.split(":").map(Number);
    const reset = new Date(now);
    reset.setHours(hours, minutes, 0, 0);
    if (reset.getTime() <= new Date(casino.lastClaimedAt).getTime()) {
      reset.setDate(reset.getDate() + 1);
    }
    nextReset = reset.getTime();
  }

  const remaining = nextReset - now;
  if (remaining <= 0) {
    return {
      ready: true,
      state: "ready",
      label: "Ready to claim",
      shortLabel: "now",
      remainingMs: 0,
    };
  }

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return {
    ready: false,
    state: remaining <= 3600000 ? "pending" : "claimed",
    label: `${hours}h ${minutes}m ${seconds}s`,
    shortLabel: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`,
    remainingMs: Math.max(0, remaining),
  };
}

/**
 * Returns partial object with all timer and claim states explicitly cleared to null.
 */
export function resetCasinoTimers(): Partial<Casino> {
  return {
    lastClaimedAt: null,
    snoozedUntil: null,
    targetResetTimestamp: null,
  };
}


