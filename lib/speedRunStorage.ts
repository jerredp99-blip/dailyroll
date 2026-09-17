import type { Casino, SpeedRunSessionState, SpeedRunStep } from "@/types/casino";

export const SPEED_RUN_STORAGE_KEY = "dailyroll_speedrun_v2_session";

// Known provider groupings for social / sweepstakes casinos
export const KNOWN_PROVIDERS: Record<string, string> = {
  chumba: "VGW",
  "chumba casino": "VGW",
  "global poker": "VGW",
  luckyland: "VGW",
  "luckyland slots": "VGW",
  pulsz: "Yellow Social Interactive",
  pulszbingo: "Yellow Social Interactive",
  "pulsz bingo": "Yellow Social Interactive",
  mcluck: "B2Services",
  "hello millions": "B2Services",
  megabonanza: "B2Services",
  jackpota: "B2Services",
  modo: "ARB Gaming",
  "modo.us": "ARB Gaming",
  "wow vegas": "MW SERVICES",
  "high 5 casino": "High 5 Entertainment",
  "high 5": "High 5 Entertainment",
  stake: "Stake",
  "stake.us": "Stake",
  sportzino: "Blazesoft",
  "fortune coins": "Blazesoft",
  zula: "Blazesoft",
  "zula casino": "Blazesoft",
  realprize: "RealPrize",
  "crown coins": "Sunflower Ltd",
  "crown coins casino": "Sunflower Ltd",
  chanced: "Gold Coin Group",
  punt: "Punt",
  rebet: "ReBet",
  fliff: "Fliff",
  superboo: "Superboo",
  spree: "Spree",
  myprize: "MyPrize",
  lonestar: "LoneStar",
  "1up": "1UP",
  coinsback: "Coinsback",
  "lucky bunny": "Lucky Bunny",
  "the win zone": "Win Zone",
  "dogg house": "Dogg House",
  "lucky bits vegas": "Lucky Bits",
  "oder casino": "Oder",
  "coin wizard": "Coin Wizard",
  "golden hearts games": "Golden Hearts",
  "rolling riches": "Rolling Riches",
  "casino.click": "Casino Click",
  "american luck": "American Luck",
  "luck party": "Luck Party",
  newluck: "NewLuck",
  "shuffle.us": "Shuffle",
  "fortune purple": "Fortune Purple",
  "fortune wins": "Fortune Wins",
  acebet: "AceBet",
  ace: "Ace",
  lucklake: "Lucklake",
  sidepot: "SidePot",
  kingprize: "KingPrize",
  "sheesh casino": "Sheesh",
  playfame: "PlayFame",
  yaycasino: "YayCasino",
};

// Built-in cheat-code tips for claiming daily bonuses
export const KNOWN_MICRO_INSTRUCTIONS: Record<string, string> = {
  chumba: "Click 'Get Coins' at the top right, then switch to the 'Daily Bonus' tab.",
  "chumba casino": "Click 'Get Coins' at the top right, then switch to the 'Daily Bonus' tab.",
  luckyland: "Spin the Daily Bonus Wheel pop-up immediately upon entering the lobby.",
  "luckyland slots": "Spin the Daily Bonus Wheel pop-up immediately upon entering the lobby.",
  "global poker": "Click 'Get Coins' in top nav, then scroll down to the 'Daily Bonus' tile.",
  pulsz: "Tap the daily gift chest pop-up or find the chest in the lobby header.",
  pulszbingo: "Tap the daily reward chest pop-up on the home screen.",
  mcluck: "Click 'Daily Login Reward' button directly on the left sidebar menu.",
  "hello millions": "Click the daily reward chest in the left navigation sidebar.",
  megabonanza: "Click daily login reward on the left sidebar navigation.",
  jackpota: "Claim your daily login bonus from the left-hand navigation menu.",
  modo: "Claim the daily streak bonus pop-up, or click Rewards in the top bar.",
  "wow vegas": "Go to Promotions in header -> click 'Daily Coin Reward'.",
  "high 5 casino": "Tap the 4-hour Classic Bonus chest at the bottom of the classic lobby.",
  stake: "Open Wallet -> select 'Daily Reload' or 'Daily Bonus' tab.",
  "stake.us": "Open Wallet -> select 'Daily Reload' or 'Daily Bonus' tab.",
  sportzino: "Click the daily bonus gift box on the top right header.",
  "fortune coins": "Collect the daily reload from the top banner or pop-up.",
  zula: "Collect the daily bonus pop-up in the promotions lobby.",
  "zula casino": "Collect the daily bonus pop-up in the promotions lobby.",
  realprize: "Click the daily reward gift box icon on the top navbar.",
  "crown coins": "Claim the daily bonus pop-up or collect in the club menu.",
  chanced: "Click the hourly bonus drop countdown bar on the top header.",
  rebet: "Tap the ReBet coin icon in the profile menu to claim.",
  fliff: "Claim $1.00 Fliff Cash every 2 hours from Cashier when balance is below $5.",
};

/**
 * Resolves the provider name for a casino.
 * Precedence: casino.provider -> KNOWN_PROVIDERS -> "Other"
 */
export function getCasinoProvider(casino: Casino): string {
  if (casino.provider && casino.provider.trim()) {
    return casino.provider.trim();
  }
  const cleanName = casino.name.toLowerCase().trim();
  return KNOWN_PROVIDERS[cleanName] || "Independent / Other";
}

/**
 * Resolves micro-instructions / cheat-code tip for a casino.
 * Precedence: casino.claimInstructions -> KNOWN_MICRO_INSTRUCTIONS -> null
 */
export function getCasinoMicroInstruction(casino: Casino): string | null {
  if (casino.claimTip && casino.claimTip.trim()) {
    return casino.claimTip.trim();
  }
  if (casino.claimInstructions && casino.claimInstructions.trim()) {
    return casino.claimInstructions.trim();
  }
  const cleanName = casino.name.toLowerCase().trim();
  return KNOWN_MICRO_INSTRUCTIONS[cleanName] || null;
}

/**
 * Parses the Sweeps Coins (SC) amount from a dailyBonus string.
 * Examples:
 *   "$1.00 SC" -> 1.00
 *   "1 SC + 1000 GC" -> 1.00
 *   "0.20 SC" -> 0.20
 *   "$2.50" -> 2.50
 *   "5,000 GC" -> 0 (no SC)
 */
export function parseScReward(dailyBonus: string): number {
  if (!dailyBonus) return 0;
  // Match explicitly labeled SC: e.g. "1.50 SC", "1 SC", "$1.00 SC", "$1.00"
  const scMatch = dailyBonus.match(/(?:\$|SC\s*|\s*SC)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:SC|\$)?/i);
  if (scMatch && scMatch[1]) {
    // If string has GC only without SC, check
    if (/GC/i.test(dailyBonus) && !/SC|\$/i.test(dailyBonus)) {
      return 0;
    }
    const val = parseFloat(scMatch[1]);
    return Number.isFinite(val) ? val : 0;
  }
  return 0;
}

/**
 * Parses Gold Coins (GC) from a dailyBonus string if present.
 * Examples:
 *   "1 SC + 10,000 GC" -> 10000
 *   "50k GC" -> 50000
 */
export function parseGcReward(dailyBonus: string): number {
  if (!dailyBonus) return 0;
  const matchK = dailyBonus.match(/([0-9]+(?:\.[0-9]+)?)\s*k\s*GC/i);
  if (matchK && matchK[1]) {
    return Math.round(parseFloat(matchK[1]) * 1000);
  }
  const matchNum = dailyBonus.match(/([0-9,]+)\s*GC/i);
  if (matchNum && matchNum[1]) {
    const raw = matchNum[1].replace(/,/g, "");
    const val = parseInt(raw, 10);
    return Number.isFinite(val) ? val : 0;
  }
  return 0;
}

/**
 * Requirement 2: Smart Sorting (Provider & Reset Type)
 * 1. Primary Sort: Group by Provider (e.g. all VGW sites like Chumba/Global/LuckyLand together)
 * 2. Secondary Sort: Fixed-time resets (Midnight UTC/EST) BEFORE rolling 24-hour resets.
 */
export function sortSpeedRunQueue(casinos: Casino[]): Casino[] {
  return [...casinos].sort((a, b) => {
    const providerA = getCasinoProvider(a).toLowerCase();
    const providerB = getCasinoProvider(b).toLowerCase();

    // 1. Group by provider
    if (providerA !== providerB) {
      // Prioritize prominent multi-casino providers (e.g. VGW, B2Services, Blazesoft)
      const isAOther = providerA.includes("other") || providerA.includes("independent");
      const isBOther = providerB.includes("other") || providerB.includes("independent");
      if (isAOther && !isBOther) return 1;
      if (!isAOther && isBOther) return -1;
      return providerA.localeCompare(providerB);
    }

    // 2. Secondary sort: Fixed-time resets (has resetAtTime) BEFORE Rolling resets
    const hasFixedA = Boolean(a.resetAtTime);
    const hasFixedB = Boolean(b.resetAtTime);

    if (hasFixedA && !hasFixedB) return -1;
    if (!hasFixedA && hasFixedB) return 1;

    // If both have fixed resets, sort by reset time
    if (hasFixedA && hasFixedB && a.resetAtTime && b.resetAtTime) {
      if (a.resetAtTime !== b.resetAtTime) {
        return a.resetAtTime.localeCompare(b.resetAtTime);
      }
    }

    // Tie-breaker: Name ascending
    return a.name.localeCompare(b.name);
  });
}

/**
 * Loads the active Speed Run session from localStorage.
 */
export function loadSpeedRunSession(): SpeedRunSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SPEED_RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SpeedRunSessionState>;
    if (!Array.isArray(parsed.queueIds) || parsed.queueIds.length === 0) {
      clearSpeedRunSession();
      return null;
    }

    // If marked completed, clear stale session and return null
    if (parsed.completed) {
      clearSpeedRunSession();
      return null;
    }

    const queueLength = parsed.queueIds.length;
    let safeIndex = typeof parsed.currentIndex === "number" ? parsed.currentIndex : 0;
    let safeStep: SpeedRunStep =
      parsed.currentStep === 1 || parsed.currentStep === 2 || parsed.currentStep === 3
        ? parsed.currentStep
        : 1;

    // Requirement 3: If stored currentIndex >= queue.length, reset state back to 0 and Step 1 instead of freezing the UI
    if (safeIndex >= queueLength || safeIndex < 0) {
      safeIndex = 0;
      safeStep = 1;
    }

    const state: SpeedRunSessionState = {
      queueIds: parsed.queueIds,
      currentIndex: safeIndex,
      currentStep: safeStep,
      sessionLootSc: typeof parsed.sessionLootSc === "number" ? parsed.sessionLootSc : 0,
      sessionLootGc: typeof parsed.sessionLootGc === "number" ? parsed.sessionLootGc : 0,
      claimedIds: Array.isArray(parsed.claimedIds) ? parsed.claimedIds : [],
      snoozedIds: parsed.snoozedIds && typeof parsed.snoozedIds === "object" ? parsed.snoozedIds : {},
      skippedIds: Array.isArray(parsed.skippedIds) ? parsed.skippedIds : [],
      startedAt: parsed.startedAt || new Date().toISOString(),
      completed: false,
    };

    if (safeIndex !== parsed.currentIndex || safeStep !== parsed.currentStep) {
      try {
        localStorage.setItem(SPEED_RUN_STORAGE_KEY, JSON.stringify(state));
      } catch {
        // ignore
      }
    }

    return state;
  } catch {
    clearSpeedRunSession();
    return null;
  }
}

/**
 * Saves the active Speed Run session to localStorage and syncs across browsers via /api/speedrun.
 */
export function saveSpeedRunSession(state: SpeedRunSessionState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SPEED_RUN_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Failed to persist speed run session to localStorage:", err);
  }

  // Cross-browser synchronization: persist to server store
  try {
    fetch("/api/speedrun", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: state }),
    }).catch(() => {
      // Offline or network error; local state remains safe in localStorage
    });
  } catch {
    // Ignore network sync failures
  }
}

/**
 * Clears the Speed Run session from localStorage and deletes server session across browsers.
 */
export function clearSpeedRunSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SPEED_RUN_STORAGE_KEY);
  } catch {
    // ignore
  }

  try {
    fetch("/api/speedrun", { method: "DELETE" }).catch(() => {});
  } catch {
    // Ignore network failures
  }
}

/**
 * Fetches the active Speed Run session from the server for cross-browser synchronization.
 */
export async function fetchSpeedRunSessionFromServer(): Promise<SpeedRunSessionState | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/speedrun", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { session: SpeedRunSessionState | null };
    if (data?.session && Array.isArray(data.session.queueIds)) {
      // Sync local storage if server session is active
      try {
        localStorage.setItem(SPEED_RUN_STORAGE_KEY, JSON.stringify(data.session));
      } catch {
        // ignore
      }
      return data.session;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Initializes a new Speed Run session with sorted ready casinos.
 */
export function createSpeedRunSession(readyCasinos: Casino[]): SpeedRunSessionState {
  const sorted = sortSpeedRunQueue(readyCasinos);
  const queueIds = sorted.map((c) => c.id);

  const state: SpeedRunSessionState = {
    queueIds,
    currentIndex: 0,
    currentStep: 1,
    sessionLootSc: 0,
    sessionLootGc: 0,
    claimedIds: [],
    snoozedIds: {},
    skippedIds: [],
    startedAt: new Date().toISOString(),
    completed: queueIds.length === 0,
  };

  saveSpeedRunSession(state);
  return state;
}
