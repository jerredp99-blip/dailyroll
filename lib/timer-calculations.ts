import type { Casino } from "@/types/casino";

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

export function calculateCustomResetTimestamp(
  hours: number,
  minutes: number,
  fromTime: number = Date.now()
): number {
  const safeHours = Math.max(0, Number(hours) || 0);
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  return fromTime + safeHours * 3600000 + safeMinutes * 60000;
}

export function getNextPacificResetTimestamp(
  resetAtTimeStr: string,
  fromTimestamp: number = Date.now()
): number {
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
  let year = "",
    month = "",
    day = "";
  for (const p of formattedParts) {
    if (p.type === "year") year = p.value;
    if (p.type === "month") month = p.value;
    if (p.type === "day") day = p.value;
  }

  if (!year || !month || !day) return fromTimestamp + 24 * 60 * 60 * 1000;

  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const laDate = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );
  const offsetMs = laDate.getTime() - utcDate.getTime();

  const targetInLaAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    targetH,
    targetM,
    0,
    0
  );
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
    const localTime = new Date(nextUtc).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `Fixed at ${localTime}`;
  } catch {
    return `Fixed at ${resetAtTimeStr}`;
  }
}

/**
 * Computes the target expiration timestamp (epoch ms) for a casino's cooldown.
 * Pure server-safe function without React dependencies.
 */
export function getCasinoTargetResetTimestamp(
  casino?: Casino | null,
  now: number = Date.now()
): number | null {
  if (!casino) return null;

  // 1. Explicit target reset timestamp (Custom Timer or Snooze Override)
  if (casino.targetResetTimestamp) {
    const targetReset =
      typeof casino.targetResetTimestamp === "string"
        ? new Date(casino.targetResetTimestamp).getTime()
        : Number(casino.targetResetTimestamp);
    if (targetReset && !isNaN(targetReset)) {
      return targetReset;
    }
  }

  // 2. Snooze hold
  if (casino.snoozedUntil) {
    const snoozeEnd = new Date(casino.snoozedUntil).getTime();
    if (!isNaN(snoozeEnd)) {
      return snoozeEnd;
    }
  }

  // 3. If never claimed, no active target cooldown
  if (!casino.lastClaimedAt) {
    return null;
  }

  // 4. Reset time (fixed Pacific time or rolling interval)
  if (casino.resetAtTime) {
    const nextPacificReset = getNextPacificResetTimestamp(casino.resetAtTime, now);
    const currentCycleReset = nextPacificReset - 24 * 60 * 60 * 1000;
    const lastClaimedTime = new Date(casino.lastClaimedAt).getTime();

    if (lastClaimedTime >= currentCycleReset) {
      return nextPacificReset;
    }
    return null;
  }

  const nextReset =
    new Date(casino.lastClaimedAt).getTime() +
    (casino.intervalHours || 24) * 60 * 60 * 1000;

  return nextReset;
}

