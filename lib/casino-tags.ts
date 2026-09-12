export type TagCategory = "category" | "casino";

export type TagDefinition = {
  id: string;
  name: string;
  category: TagCategory;
  logoUrl?: string;
  emoji?: string;
  postType?: "big_win" | "drop_code" | "discussion";
};

export const CATEGORY_TAGS: TagDefinition[] = [
  {
    id: "BIG_WIN",
    name: "Big Wins",
    category: "category",
    emoji: "🏆",
    postType: "big_win",
  },
  {
    id: "BONUS_CODE",
    name: "Bonus Code",
    category: "category",
    emoji: "🎁",
    postType: "drop_code",
  },
  {
    id: "DISCUSSION",
    name: "Discussion",
    category: "category",
    emoji: "💬",
    postType: "discussion",
  },
];

export const CASINO_TAGS: TagDefinition[] = [
  {
    id: "STAKE",
    name: "Stake",
    category: "casino",
    logoUrl: "https://www.google.com/s2/favicons?domain=stake.us&sz=64",
  },
  {
    id: "CROWN",
    name: "Crown Coins",
    category: "casino",
    logoUrl: "https://www.google.com/s2/favicons?domain=crowncoinscasino.com&sz=64",
  },
  {
    id: "WOW",
    name: "WOW Vegas",
    category: "casino",
    logoUrl: "https://www.google.com/s2/favicons?domain=wowvegas.com&sz=64",
  },
  {
    id: "PULSZ",
    name: "Pulsz",
    category: "casino",
    logoUrl: "https://www.google.com/s2/favicons?domain=pulsz.com&sz=64",
  },
  {
    id: "HIGH5",
    name: "High 5 Casino",
    category: "casino",
    logoUrl: "https://www.google.com/s2/favicons?domain=high5casino.com&sz=64",
  },
  {
    id: "MCLUCK",
    name: "McLuck",
    category: "casino",
    logoUrl: "https://www.google.com/s2/favicons?domain=mcluck.com&sz=64",
  },
  {
    id: "CHUMBA",
    name: "Chumba",
    category: "casino",
    logoUrl: "https://www.google.com/s2/favicons?domain=chumbacasino.com&sz=64",
  },
  {
    id: "FORTUNE",
    name: "Fortune Coins",
    category: "casino",
    logoUrl: "https://www.google.com/s2/favicons?domain=fortunecoins.com&sz=64",
  },
  {
    id: "MODO",
    name: "Modo",
    category: "casino",
    logoUrl: "https://www.google.com/s2/favicons?domain=modo.us&sz=64",
  },
  {
    id: "SPREE",
    name: "Spree",
    category: "casino",
    logoUrl: "https://www.google.com/s2/favicons?domain=spree.com&sz=64",
  },
  {
    id: "REALPRIZE",
    name: "RealPrize",
    category: "casino",
    logoUrl: "https://www.google.com/s2/favicons?domain=realprize.com&sz=64",
  },
  {
    id: "ZULA",
    name: "Zula Casino",
    category: "casino",
    logoUrl: "https://www.google.com/s2/favicons?domain=zulacasino.com&sz=64",
  },
];

export const ALL_TAGS: TagDefinition[] = [...CATEGORY_TAGS, ...CASINO_TAGS];

/**
 * Resolves any raw tag string (e.g. "$STAKE", "STAKE", "Big Wins", "Crown Coins")
 * into normalized name, category, and logo URL without any leading "$" sign.
 */
export function resolveTagDetails(rawTag?: string | null): {
  id: string;
  name: string;
  category: TagCategory | "none";
  logoUrl?: string;
  emoji?: string;
} | null {
  if (!rawTag) return null;

  // Clean raw input: strip leading "$" or "#" and trim
  const clean = rawTag.trim().replace(/^[$#]+/, "");
  if (!clean) return null;

  const upper = clean.toUpperCase();

  // Match predefined tags
  const matched = ALL_TAGS.find(
    (t) =>
      t.id.toUpperCase() === upper ||
      t.name.toUpperCase() === upper ||
      t.name.toUpperCase().replace(/\s+/g, "") === upper
  );

  if (matched) {
    return {
      id: matched.id,
      name: matched.name,
      category: matched.category,
      logoUrl: matched.logoUrl,
      emoji: matched.emoji,
    };
  }

  // Handle category names directly
  if (upper === "BIG WINS" || upper === "BIG_WIN" || upper === "BIGWIN") {
    return { id: "BIG_WIN", name: "Big Wins", category: "category", emoji: "🏆" };
  }
  if (upper === "BONUS CODE" || upper === "BONUS_CODE" || upper === "DROP_CODE" || upper === "DROP CODE") {
    return { id: "BONUS_CODE", name: "Bonus Code", category: "category", emoji: "🎁" };
  }
  if (upper === "DISCUSSION" || upper === "DISCUSSIONS") {
    return { id: "DISCUSSION", name: "Discussion", category: "category", emoji: "💬" };
  }

  // Fallback for custom casino names: produce clean name and favicon lookup
  const prettyName = clean
    .split(/[-_ ]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const domain = clean.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
  const fallbackLogo = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  return {
    id: upper,
    name: prettyName,
    category: "casino",
    logoUrl: fallbackLogo,
  };
}

