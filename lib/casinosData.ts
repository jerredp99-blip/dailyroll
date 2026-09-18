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
  signupBonusText?: string;
}

export const KNOWN_SIGNUP_BONUSES: Record<string, string> = {
  "Stake.us": "25 Stake Cash",
  Stake: "25 Stake Cash",
  Chumba: "2.00 SC",
  "Chumba Casino": "2.00 SC",
  Luckyland: "10 SC",
  "Luckyland Slots": "10 SC",
  "Global Poker": "5 SC",
  "Crown Coins": "2.00 SC",
  Pulsz: "2.30 SC",
  Pulszbingo: "2.30 SC",
  "Pulsz Bingo": "2.30 SC",
  McLuck: "2.50 SC",
  "Hello Millions": "2.50 SC",
  Zula: "10 SC",
  "Zula Casino": "10 SC",
  Sportzino: "10 SC",
  RealPrize: "2.00 SC",
  Spree: "2.50 SC",
  MegaBonanza: "2.50 SC",
  Megabonanza: "2.50 SC",
  PlayFame: "2.50 SC",
  "High 5 Casino": "5 SC",
  Legendz: "3.00 SC",
  "Fortune Coins": "1,400 FC",
  "Fortune Wheels": "1.00 SC",
  "Fortune Wins": "1.00 SC",
  "Fortune Purple": "1.00 SC",
  Coinsback: "1.00 SC",
  DimeSweeps: "1.00 SC",
  Jackpota: "2.50 SC",
  YayCasino: "5 SC",
  Chanced: "2.00 SC",
  SidePot: "1.00 SC",
  "The Win Zone": "1.00 SC",
  "Coinz.us": "2.00 SC",
  Rolla: "2.00 SC",
  Sixty6: "2.00 SC",
  Fliff: "$5 Fliff Cash",
};

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
    signupBonusText: "1.00 SC",
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
    signupBonusText: "2.00 SC",
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
    signupBonusText: "25 Stake Cash",
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
    signupBonusText: "2.30 SC",
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
    signupBonusText: "2.50 SC",
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
    signupBonusText: "1.00 SC",
  },
  {
    name: "Chumba",
    siteUrl: "https://chumbacasino.com",
    dailyBonus: "1.00 SC",
    dailyBonusSc: "1.00",
    signupBonusText: "2.00 SC",
  },
  {
    name: "Luckyland",
    siteUrl: "https://luckylandslots.com",
    dailyBonus: "0.30 SC",
    dailyBonusSc: "0.30",
    signupBonusText: "10 SC",
  },
  {
    name: "Global Poker",
    siteUrl: "https://globalpoker.com",
    dailyBonus: "0.25 SC",
    dailyBonusSc: "0.25",
    signupBonusText: "5 SC",
  },
  {
    name: "Pulszbingo",
    siteUrl: "https://pulszbingo.com",
    dailyBonus: "0.30 SC",
    dailyBonusSc: "0.30",
    signupBonusText: "2.30 SC",
  },
  {
    name: "Hello Millions",
    siteUrl: "https://hellomillions.com",
    dailyBonus: "0.25 SC",
    dailyBonusSc: "0.25",
    signupBonusText: "2.50 SC",
  },
  {
    name: "Zula",
    siteUrl: "https://zulacasino.com",
    dailyBonus: "1.00 SC",
    dailyBonusSc: "1.00",
    signupBonusText: "10 SC",
  },
  {
    name: "Sportzino",
    siteUrl: "https://sportzino.com",
    dailyBonus: "1.00 SC",
    dailyBonusSc: "1.00",
    signupBonusText: "10 SC",
  },
  {
    name: "RealPrize",
    siteUrl: "https://realprize.com",
    dailyBonus: "0.30 SC",
    dailyBonusSc: "0.30",
    signupBonusText: "2.00 SC",
  },
  {
    name: "Spree",
    siteUrl: "https://spree.com",
    dailyBonus: "0.40 SC",
    dailyBonusSc: "0.40",
    signupBonusText: "2.50 SC",
  },
  {
    name: "Megabonanza",
    siteUrl: "https://megabonanza.com",
    dailyBonus: "0.25 SC",
    dailyBonusSc: "0.25",
    signupBonusText: "2.50 SC",
  },
  {
    name: "PlayFame",
    siteUrl: "https://playfame.com",
    dailyBonus: "0.25 SC",
    dailyBonusSc: "0.25",
    signupBonusText: "2.50 SC",
  },
  {
    name: "High 5 Casino",
    siteUrl: "https://high5casino.com",
    dailyBonus: "0.50 SC",
    dailyBonusSc: "0.50",
    signupBonusText: "5 SC",
  },
  {
    name: "Legendz",
    siteUrl: "https://legendz.com",
    dailyBonus: "1.00 SC",
    dailyBonusSc: "1.00",
    signupBonusText: "3.00 SC",
  },
  {
    name: "Fortune Coins",
    siteUrl: "https://fortunecoins.com",
    dailyBonus: "100 FC",
    signupBonusText: "1,400 FC",
  },
  {
    name: "Fortune Wins",
    siteUrl: "https://fortunewins.com",
    dailyBonus: "0.20 SC",
    signupBonusText: "1.00 SC",
  },
  {
    name: "Fortune Purple",
    siteUrl: "https://fortunepurple.com",
    dailyBonus: "0.20 SC",
    signupBonusText: "1.00 SC",
  },
  {
    name: "Coinsback",
    siteUrl: "https://coinsback.com",
    dailyBonus: "0.20 SC",
    signupBonusText: "1.00 SC",
  },
  {
    name: "Jackpota",
    siteUrl: "https://jackpota.com",
    dailyBonus: "0.25 SC",
    signupBonusText: "2.50 SC",
  },
  {
    name: "YayCasino",
    siteUrl: "https://yaycasino.com",
    dailyBonus: "0.50 SC",
    signupBonusText: "5 SC",
  },
  {
    name: "Chanced",
    siteUrl: "https://chanced.com",
    dailyBonus: "0.10 SC hourly",
    signupBonusText: "2.00 SC",
  },
  {
    name: "The Win Zone",
    siteUrl: "https://thewinzone.com",
    dailyBonus: "0.20 SC",
    signupBonusText: "1.00 SC",
  },
  {
    name: "Coinz.us",
    siteUrl: "https://coinz.us",
    dailyBonus: "0.20 SC",
    signupBonusText: "2.00 SC",
  },
  {
    name: "Rolla",
    siteUrl: "https://rolla.com",
    dailyBonus: "0.20 SC",
    signupBonusText: "2.00 SC",
  },
  {
    name: "Sixty6",
    siteUrl: "https://sixty6.com",
    dailyBonus: "0.20 SC",
    signupBonusText: "2.00 SC",
  },
  {
    name: "Fliff",
    siteUrl: "https://fliff.com",
    dailyBonus: "1.00 Fliff Cash",
    signupBonusText: "$5 Fliff Cash",
  },
];

const DATA_BY_NAME: Record<string, CasinoSeedData> = Object.fromEntries(
  MASTER_CASINOS_DATA.map((c) => [c.name.toLowerCase(), c])
);

export function getCasinoDefaultMetadata(name: string): CasinoSeedData | undefined {
  if (!name) return undefined;
  const lower = name.trim().toLowerCase();
  const found = DATA_BY_NAME[lower];
  if (found) return found;
  const defaultBonusText = KNOWN_SIGNUP_BONUSES[name] || KNOWN_SIGNUP_BONUSES[name.trim()];
  if (defaultBonusText) {
    return {
      name,
      siteUrl: `https://${lower.replace(/[^a-z0-9]/g, "")}.com`,
      dailyBonus: "Free daily",
      signupBonusText: defaultBonusText,
    };
  }
  return undefined;
}

export function createPrefilledCasino(
  name: string,
  overrides?: Partial<Casino>
): Casino {
  const seed = getCasinoDefaultMetadata(name);
  const signupBonusText = seed?.signupBonusText || KNOWN_SIGNUP_BONUSES[name] || KNOWN_SIGNUP_BONUSES[name.trim()] || null;
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
    signupBonusText,
    lastClaimedAt: null, // Initialized to ready
    ...overrides,
  };
}
