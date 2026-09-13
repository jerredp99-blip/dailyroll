export type CasinoLinkConfig = {
  /** Direct bonus claim / coin store / daily rewards modal URL */
  directClaimUrl?: string;
  /** Coin store / shop URL */
  storeUrl?: string;
  /** Primary lobby / site URL fallback */
  fallbackUrl: string;
};

/**
 * Master mapping of casino names (lowercase) to their deep claim and store paths.
 */
export const CASINO_DEEP_LINKS: Record<string, CasinoLinkConfig> = {
  "crown coins": {
    directClaimUrl: "https://crowncoinscasino.com/daily-bonus",
    storeUrl: "https://crowncoinscasino.com/buy",
    fallbackUrl: "https://crowncoinscasino.com",
  },
  "stake.us": {
    directClaimUrl: "https://stake.us/?tab=daily",
    storeUrl: "https://stake.us/?modal=buyCrypto",
    fallbackUrl: "https://stake.us",
  },
  stake: {
    directClaimUrl: "https://stake.us/?tab=daily",
    storeUrl: "https://stake.us/?modal=buyCrypto",
    fallbackUrl: "https://stake.us",
  },
  pulsz: {
    directClaimUrl: "https://pulsz.com/promotions",
    storeUrl: "https://pulsz.com/coin-store",
    fallbackUrl: "https://pulsz.com",
  },
  mcluck: {
    directClaimUrl: "https://mcluck.com/promotions",
    storeUrl: "https://mcluck.com/buy-coins",
    fallbackUrl: "https://mcluck.com",
  },
  "high 5 casino": {
    directClaimUrl: "https://high5casino.com/promotions",
    storeUrl: "https://high5casino.com/store",
    fallbackUrl: "https://high5casino.com",
  },
  "wow vegas": {
    directClaimUrl: "https://wowvegas.com/promotions",
    storeUrl: "https://wowvegas.com/buy-coins",
    fallbackUrl: "https://wowvegas.com",
  },
  chanced: {
    directClaimUrl: "https://chanced.com/promotions",
    fallbackUrl: "https://chanced.com",
  },
  modo: {
    directClaimUrl: "https://modo.us/daily-bonus",
    storeUrl: "https://modo.us/store",
    fallbackUrl: "https://modo.us",
  },
  "hello millions": {
    directClaimUrl: "https://hellomillions.com/promotions",
    fallbackUrl: "https://hellomillions.com",
  },
  realprize: {
    directClaimUrl: "https://realprize.com/promotions",
    fallbackUrl: "https://realprize.com",
  },
  spree: {
    directClaimUrl: "https://spree.com/promotions",
    fallbackUrl: "https://spree.com",
  },
  "rolling riches": {
    directClaimUrl: "https://rollingriches.com/promotions",
    fallbackUrl: "https://rollingriches.com",
  },
  rebet: {
    directClaimUrl: "https://rebet.app/claim",
    fallbackUrl: "https://rebet.app",
  },
  coinsback: {
    directClaimUrl: "https://coinsback.com/claim",
    fallbackUrl: "https://coinsback.com",
  },
  "lucky bunny": {
    directClaimUrl: "https://luckybunnycasino.com/daily-bonus",
    fallbackUrl: "https://luckybunnycasino.com",
  },
  "1up": {
    directClaimUrl: "https://1upcasino.com/promotions",
    fallbackUrl: "https://1upcasino.com",
  },
  lucklake: {
    directClaimUrl: "https://lucklake.com/promotions",
    fallbackUrl: "https://lucklake.com",
  },
  sidepot: {
    directClaimUrl: "https://sidepotcasino.com/promotions",
    fallbackUrl: "https://sidepotcasino.com",
  },
  kingprize: {
    directClaimUrl: "https://kingprize.com/promotions",
    fallbackUrl: "https://kingprize.com",
  },
  ace: {
    directClaimUrl: "https://ace.bet/promotions",
    fallbackUrl: "https://ace.bet",
  },
  "the win zone": {
    directClaimUrl: "https://thewinzone.com/promotions",
    fallbackUrl: "https://thewinzone.com",
  },
  "dogg house": {
    directClaimUrl: "https://dogghousecasino.com/promotions",
    fallbackUrl: "https://dogghousecasino.com",
  },
  "lucky bits vegas": {
    directClaimUrl: "https://luckybitsvegas.com/promotions",
    fallbackUrl: "https://luckybitsvegas.com",
  },
  "coin wizard": {
    directClaimUrl: "https://coinwizard.com/promotions",
    fallbackUrl: "https://coinwizard.com",
  },
  "golden hearts games": {
    directClaimUrl: "https://goldenheartsgames.com/promotions",
    fallbackUrl: "https://goldenheartsgames.com",
  },
  pulszbingo: {
    directClaimUrl: "https://pulszbingo.com/promotions",
    fallbackUrl: "https://pulszbingo.com",
  },
  sportzino: {
    directClaimUrl: "https://sportzino.com/promotions",
    fallbackUrl: "https://sportzino.com",
  },
  megabonanza: {
    directClaimUrl: "https://megabonanza.com/promotions",
    fallbackUrl: "https://megabonanza.com",
  },
  jackpota: {
    directClaimUrl: "https://jackpota.com/promotions",
    fallbackUrl: "https://jackpota.com",
  },
};

/**
 * Resolves the most direct bonus link available for a casino:
 * 1. casino.claimUrl (explicit override)
 * 2. directClaimUrl in deep links configuration
 * 3. casino.siteUrl or casino.url
 * 4. fallbackUrl in deep links configuration
 * 5. Google query search fallback
 */
export function getCasinoDeepLink(casino: {
  id?: string;
  name: string;
  claimUrl?: string | null;
  siteUrl?: string | null;
  url?: string | null;
}): string {
  if (casino.claimUrl && casino.claimUrl.trim()) {
    return casino.claimUrl.trim();
  }

  const normalizedName = casino.name.toLowerCase().trim();
  const config = CASINO_DEEP_LINKS[normalizedName];

  if (config?.directClaimUrl) {
    return config.directClaimUrl;
  }

  if (casino.siteUrl && casino.siteUrl.trim()) {
    return casino.siteUrl.trim();
  }

  if (casino.url && casino.url.trim()) {
    return casino.url.trim();
  }

  if (config?.fallbackUrl) {
    return config.fallbackUrl;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(`${casino.name} casino daily bonus claim`)}`;
}
