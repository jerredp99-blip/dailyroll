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

export interface TimeOption {
  value: string;
  label: string;
}

export const PACIFIC_TIME_OPTIONS: TimeOption[] = [
  { value: "", label: "Rolling 24 Hours (No Fixed Reset)" },
  { value: "00:00", label: "12:00 AM PST (Midnight)" },
  { value: "01:00", label: "1:00 AM PST" },
  { value: "02:00", label: "2:00 AM PST" },
  { value: "03:00", label: "3:00 AM PST" },
  { value: "04:00", label: "4:00 AM PST" },
  { value: "05:00", label: "5:00 AM PST" },
  { value: "06:00", label: "6:00 AM PST" },
  { value: "07:00", label: "7:00 AM PST" },
  { value: "08:00", label: "8:00 AM PST" },
  { value: "09:00", label: "9:00 AM PST" },
  { value: "10:00", label: "10:00 AM PST" },
  { value: "11:00", label: "11:00 AM PST" },
  { value: "12:00", label: "12:00 PM PST (Noon)" },
  { value: "13:00", label: "1:00 PM PST" },
  { value: "14:00", label: "2:00 PM PST" },
  { value: "15:00", label: "3:00 PM PST" },
  { value: "16:00", label: "4:00 PM PST" },
  { value: "17:00", label: "5:00 PM PST" },
  { value: "18:00", label: "6:00 PM PST" },
  { value: "19:00", label: "7:00 PM PST" },
  { value: "20:00", label: "8:00 PM PST" },
  { value: "21:00", label: "9:00 PM PST" },
  { value: "22:00", label: "10:00 PM PST" },
  { value: "23:00", label: "11:00 PM PST" },
];

/**
 * Given a reset time string in "HH:mm" (PST/PDT, America/Los_Angeles timezone),
 * calculates the next UTC timestamp for that reset time relative to `fromTimestamp`.
 */
export function getNextPacificResetTimestamp(resetAtTimeStr: string, fromTimestamp: number = Date.now()): number {
  if (!resetAtTimeStr) return fromTimestamp + 24 * 60 * 60 * 1000;

  const parts = resetAtTimeStr.split(":");
  const targetH = parseInt(parts[0], 10);
  const targetM = parseInt(parts[1] || "0", 10);
  if (isNaN(targetH) || isNaN(targetM)) return fromTimestamp + 24 * 60 * 60 * 1000;

  const now = new Date(fromTimestamp);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const formattedParts = formatter.formatToParts(now);
  let year = "", month = "", day = "";
  for (const p of formattedParts) {
    if (p.type === "year") year = p.value;
    if (p.type === "month") month = p.value;
    if (p.type === "day") day = p.value;
  }

  if (!year || !month || !day) return fromTimestamp + 24 * 60 * 60 * 1000;

  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const laDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const offsetMs = laDate.getTime() - utcDate.getTime();

  const targetInLaAsUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), targetH, targetM, 0, 0);
  let targetEpoch = targetInLaAsUtc - offsetMs;

  if (targetEpoch <= fromTimestamp) {
    targetEpoch += 24 * 60 * 60 * 1000;
  }

  return targetEpoch;
}

export function formatResetTimeDisplay(resetAtTimeStr?: string | null): string {
  if (!resetAtTimeStr) return "Rolling 24h";
  try {
    const nextUtc = getNextPacificResetTimestamp(resetAtTimeStr);
    const localTime = new Date(nextUtc).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `Fixed at ${localTime}`;
  } catch {
    return `Fixed at ${resetAtTimeStr}`;
  }
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
    const nextPacificReset = getNextPacificResetTimestamp(casino.resetAtTime, now);
    const currentCycleReset = nextPacificReset - 24 * 60 * 60 * 1000;
    const lastClaimedTime = new Date(casino.lastClaimedAt).getTime();

    if (lastClaimedTime >= currentCycleReset) {
      nextReset = nextPacificReset;
    } else {
      return {
        ready: true,
        state: "ready",
        label: "Ready to claim",
        shortLabel: "now",
        remainingMs: 0,
      };
    }
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


