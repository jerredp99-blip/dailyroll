import type { Casino } from "@/types/casino";

export interface CasinoSeedData {
  name: string;
  siteUrl: string;
  dailyBonus: string;
  dailyBonusSc?: string;
  dailyBonusGc?: string;
  minRedemption?: string;
  intervalHours?: number;
  resetRule?: string;
  hasStreak?: boolean;
  provider?: string;
  trustpilotRating?: number;
}

export const NEW_DISCOVERED_CASINOS: CasinoSeedData[] = [
  {
    name: "ThrillCoins",
    siteUrl: "https://thrillcoins.com",
    dailyBonus: "0.05 SC",
    dailyBonusSc: "0.05",
    minRedemption: "$100 Min Cash",
    intervalHours: 24,
    resetRule: "24h cooldown",
    hasStreak: true,
  },
  {
    name: "SweepstakesCasino.com",
    siteUrl: "https://sweepstakescasino.com",
    dailyBonus: "0.05 SC",
    dailyBonusSc: "0.05",
    minRedemption: "$100 Min Cash",
    intervalHours: 24,
    resetRule: "24h cooldown",
    hasStreak: true,
  },
  {
    name: "BangCoins",
    siteUrl: "https://bangcoins.com",
    dailyBonus: "0.05 SC",
    dailyBonusSc: "0.05",
    minRedemption: "$100 Min Cash",
    intervalHours: 24,
    resetRule: "24h cooldown",
    hasStreak: true,
  },
  {
    name: "DimeSweeps",
    siteUrl: "https://dimesweeps.com",
    dailyBonus: "0.05 SC",
    dailyBonusSc: "0.05",
    minRedemption: "$100 Min Cash",
    intervalHours: 24,
    resetRule: "24h cooldown",
    hasStreak: false,
  },
  {
    name: "SweepsRoyal",
    siteUrl: "https://sweepsroyal.com",
    dailyBonus: "0.05 SC",
    dailyBonusSc: "0.05",
    minRedemption: "$100 Min Cash",
    intervalHours: 24,
    resetRule: "24h cooldown",
    hasStreak: false,
  },
];

export const MASTER_CASINOS_DATA: CasinoSeedData[] = [
  ...NEW_DISCOVERED_CASINOS,
  {
    name: "Crown Coins",
    siteUrl: "https://crowncoinscasino.com",
    dailyBonus: "1.00 SC",
    dailyBonusSc: "1.00",
    dailyBonusGc: "100,000 CC",
    minRedemption: "$50 (Gift Card) / $100 (Bank Transfer)",
    intervalHours: 24,
    resetRule: "Rolling 24 Hours",
    hasStreak: true,
  },
  {
    name: "Stake.us",
    siteUrl: "https://stake.us",
    dailyBonus: "1.00 Stake Cash",
    dailyBonusSc: "1.00",
    dailyBonusGc: "10,000 GC",
    minRedemption: "$50 (Crypto)",
    intervalHours: 24,
    resetRule: "Fixed 7:00 PM EST",
    hasStreak: false,
  },
  {
    name: "Pulsz",
    siteUrl: "https://pulsz.com",
    dailyBonus: "0.30 SC",
    dailyBonusSc: "0.30",
    dailyBonusGc: "5,000 GC",
    minRedemption: "$10 (Gift Card) / $100 (Bank)",
    intervalHours: 24,
    resetRule: "Rolling 24 Hours",
    hasStreak: true,
  },
  {
    name: "McLuck",
    siteUrl: "https://mcluck.com",
    dailyBonus: "0.25 SC",
    dailyBonusSc: "0.25",
    dailyBonusGc: "2,500 GC",
    minRedemption: "$75 (Gift Card) / $100 (Bank)",
    intervalHours: 24,
    resetRule: "Rolling 24 Hours",
    hasStreak: true,
  },
  {
    name: "SidePot",
    siteUrl: "https://sidepotcasino.com",
    dailyBonus: "0.20 SC every 6h",
    dailyBonusSc: "0.20",
    minRedemption: "$50 Min Cash",
    intervalHours: 6,
    resetRule: "6-Hour Reload",
    hasStreak: false,
  },
];

const DATA_BY_NAME: Record<string, CasinoSeedData> = Object.fromEntries(
  MASTER_CASINOS_DATA.map((c) => [c.name.toLowerCase(), c])
);

export function getCasinoDefaultMetadata(name: string): CasinoSeedData | undefined {
  if (!name) return undefined;
  return DATA_BY_NAME[name.trim().toLowerCase()];
}

export function createPrefilledCasino(
  name: string,
  overrides?: Partial<Casino>
): Casino {
  const seed = getCasinoDefaultMetadata(name);
  return {
    id: Date.now().toString() + "-" + Math.random().toString(36).substring(2, 6),
    name: seed?.name || name,
    dailyBonus: seed?.dailyBonus || "Free daily",
    siteUrl:
      seed?.siteUrl ||
      `https://www.google.com/search?q=${encodeURIComponent(`${name} casino`)}`,
    dailyBonusSc: seed?.dailyBonusSc,
    dailyBonusGc: seed?.dailyBonusGc,
    minRedemption: seed?.minRedemption,
    resetRule: seed?.resetRule || "24h cooldown",
    hasStreak: seed?.hasStreak ?? false,
    intervalHours: seed?.intervalHours || 24,
    lastClaimedAt: null, // Initialized to ready
    ...overrides,
  };
}
