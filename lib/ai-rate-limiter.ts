// Rate limiter specifically tailored for Google AI Studio Free Tier limits
// Free Tier Limits: 15 Requests Per Minute (RPM), 1,500 Requests Per Day (RPD)
// We set conservative caps to ensure 100% zero-cost operation:
// - User limit: 10 live Gemini requests per user/IP per day
// - User cooldown: 4 seconds between requests
// - Global daily limit: 1,000 live requests per day
// - Global minute limit: 12 requests per minute

type RateLimitRecord = {
  count: number;
  resetAt: number; // timestamp in ms
  lastRequestAt: number;
};

const USER_DAILY_LIMIT = 10;
const USER_COOLDOWN_MS = 4000;
const GLOBAL_DAILY_LIMIT = 1000;
const GLOBAL_MINUTE_LIMIT = 12;

// In-memory tracking
const userLimits = new Map<string, RateLimitRecord>();

let globalDailyCount = 0;
let currentDayStr = new Date().toISOString().slice(0, 10);

let globalMinuteCount = 0;
let currentMinuteTimestamp = Math.floor(Date.now() / 60000);

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNextMidnightMs(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

/**
 * Check if a request can proceed with live Gemini API
 */
export function checkAiRateLimit(
  identifier: string,
  isAdmin: boolean = false
): {
  allowed: boolean;
  remainingToday: number;
  reason?: "cooldown" | "user_daily_limit" | "global_daily_limit" | "global_minute_limit";
  message?: string;
} {
  if (isAdmin) {
    return { allowed: true, remainingToday: 999 };
  }

  const now = Date.now();
  const today = getTodayString();
  const currentMinute = Math.floor(now / 60000);

  // Reset global daily counter at midnight UTC
  if (today !== currentDayStr) {
    currentDayStr = today;
    globalDailyCount = 0;
  }

  // Reset global minute counter
  if (currentMinute !== currentMinuteTimestamp) {
    currentMinuteTimestamp = currentMinute;
    globalMinuteCount = 0;
  }

  // 1. Check Global Daily Free Cap
  if (globalDailyCount >= GLOBAL_DAILY_LIMIT) {
    return {
      allowed: false,
      remainingToday: 0,
      reason: "global_daily_limit",
      message:
        "Daily global free AI quota has been reached. Switched to built-in knowledge base (100% free) until midnight UTC.",
    };
  }

  // 2. Check Global RPM Free Cap
  if (globalMinuteCount >= GLOBAL_MINUTE_LIMIT) {
    return {
      allowed: false,
      remainingToday: 0,
      reason: "global_minute_limit",
      message:
        "High traffic on the free AI tier. Switched to built-in knowledge base for this message.",
    };
  }

  // 3. Check User Per-Day & Cooldown Limits
  const userRecord = userLimits.get(identifier);

  if (!userRecord || now >= userRecord.resetAt) {
    // New day or first request
    return {
      allowed: true,
      remainingToday: USER_DAILY_LIMIT,
    };
  }

  // Cooldown check (prevent automated rapid spamming)
  if (now - userRecord.lastRequestAt < USER_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((USER_COOLDOWN_MS - (now - userRecord.lastRequestAt)) / 1000);
    return {
      allowed: false,
      remainingToday: Math.max(0, USER_DAILY_LIMIT - userRecord.count),
      reason: "cooldown",
      message: `Please wait ${waitSeconds}s before asking another question.`,
    };
  }

  // User Daily Limit check
  if (userRecord.count >= USER_DAILY_LIMIT) {
    return {
      allowed: false,
      remainingToday: 0,
      reason: "user_daily_limit",
      message:
        "You have used your 10 free live AI questions for today. You can still ask anything using our unlimited built-in advisor!",
    };
  }

  return {
    allowed: true,
    remainingToday: USER_DAILY_LIMIT - userRecord.count,
  };
}

/**
 * Record an executed live Gemini request against rate limits
 */
export function recordAiUsage(identifier: string, isAdmin: boolean = false): void {
  if (isAdmin) return;

  const now = Date.now();
  globalDailyCount++;
  globalMinuteCount++;

  const userRecord = userLimits.get(identifier);
  const nextMidnight = getNextMidnightMs();

  if (!userRecord || now >= userRecord.resetAt) {
    userLimits.set(identifier, {
      count: 1,
      resetAt: nextMidnight,
      lastRequestAt: now,
    });
  } else {
    userRecord.count++;
    userRecord.lastRequestAt = now;
  }
}

