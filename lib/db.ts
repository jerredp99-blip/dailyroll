import {
  casinoKey,
  deleteCasinos,
  getCasinos,
  getDirectory,
  getUsers,
  queueMutation,
  saveCasinos,
  saveDirectory,
  type Casino,
  type UserProfile,
} from "./store";
import { ADMIN_EMAIL, ADMIN_EMAILS } from "./auth";

export {
  casinoKey,
  deleteCasinos,
  getCasinos,
  getDirectory,
  getUsers,
  saveCasinos,
  saveDirectory,
};

export type { Casino, UserProfile };

/**
 * Updates a casino's canonical metadata (URLs, bonus, title, rating, reset time, details) across:
 * 1. The shared master directory in Upstash Redis / DB
 * 2. Every user profile's saved casino list in Upstash Redis / DB
 *
 * All changes are performed inside a SINGLE atomic queueMutation call.
 * This guarantees that changes are immediately persisted to the shared DB without race
 * conditions, partial writes, or multiple Redis HTTP roundtrips.
 */
export async function updateCasinoMetadata(data: {
  name: string;
  siteUrl?: string;
  affiliateUrl?: string;
  claimUrl?: string;
  bonusUrl?: string;
  bonusTitle?: string;
  trustpilotRating?: number;
  dailyBonus?: string;
  details?: string;
  resetAtTime?: string | null;
  intervalHours?: number;
  provider?: string;
}) {
  const trimmedName = data.name.trim();
  const lowerName = trimmedName.toLowerCase();

  return queueMutation((store) => {
    // 1. Ensure master directory list contains this casino
    if (
      store.directoryList &&
      !store.directoryList.some((n) => n.trim().toLowerCase() === lowerName)
    ) {
      store.directoryList = [...store.directoryList, trimmedName];
    }

    // 2. Update shared canonical directory maps
    if (data.siteUrl !== undefined) {
      store.directoryUrls = { ...(store.directoryUrls || {}), [trimmedName]: data.siteUrl };
    }
    if (data.affiliateUrl !== undefined) {
      store.affiliateUrls = { ...(store.affiliateUrls || {}), [trimmedName]: data.affiliateUrl };
    }
    if (data.claimUrl !== undefined) {
      store.claimUrls = { ...(store.claimUrls || {}), [trimmedName]: data.claimUrl };
    }
    if (data.bonusUrl !== undefined) {
      store.bonusUrls = { ...(store.bonusUrls || {}), [trimmedName]: data.bonusUrl };
    }
    if (data.bonusTitle !== undefined) {
      store.bonusTitles = { ...(store.bonusTitles || {}), [trimmedName]: data.bonusTitle };
    }
    if (data.trustpilotRating !== undefined) {
      store.directoryRatings = { ...(store.directoryRatings || {}), [trimmedName]: data.trustpilotRating };
    }
    if (data.dailyBonus !== undefined) {
      store.directoryDailyBonuses = {
        ...(store.directoryDailyBonuses || {}),
        [trimmedName]: data.dailyBonus,
      };
    }
    if (data.resetAtTime !== undefined) {
      store.directoryResetTimes = {
        ...(store.directoryResetTimes || {}),
        [trimmedName]: data.resetAtTime,
      };
    }
    if (data.details !== undefined) {
      store.directoryDetails = {
        ...(store.directoryDetails || {}),
        [trimmedName]: data.details,
      };
    }
    if (data.provider !== undefined) {
      store.directoryProviders = {
        ...(store.directoryProviders || {}),
        [trimmedName]: data.provider,
      };
    }

    // 3. Atomically update all user records in store.casinos
    const targetKeys = new Set<string>([
      ...store.users.map((u) => casinoKey(u.email)),
      ...ADMIN_EMAILS.map((email) => casinoKey(email)),
      casinoKey(ADMIN_EMAIL),
      "admin",
      ...Object.keys(store.casinos || {}),
    ]);

    for (const key of targetKeys) {
      const records = store.casinos[key];
      if (!records || !Array.isArray(records)) continue;

      store.casinos[key] = records.map((casino) => {
        if (casino.name.trim().toLowerCase() !== lowerName) return casino;

        const updated: Casino = { ...casino };
        if (data.siteUrl !== undefined) {
          updated.siteUrl = data.siteUrl;
          updated.url = data.siteUrl;
        }
        if (data.affiliateUrl !== undefined) updated.affiliateUrl = data.affiliateUrl;
        if (data.claimUrl !== undefined) updated.claimUrl = data.claimUrl;
        if (data.bonusUrl !== undefined) updated.bonusUrl = data.bonusUrl;
        if (data.bonusTitle !== undefined) updated.bonusTitle = data.bonusTitle;
        if (data.trustpilotRating !== undefined) updated.trustpilotRating = data.trustpilotRating;
        if (data.dailyBonus !== undefined) updated.dailyBonus = data.dailyBonus;
        if (data.details !== undefined) updated.details = data.details;
        if (data.resetAtTime !== undefined) updated.resetAtTime = data.resetAtTime;
        if (data.intervalHours !== undefined) updated.intervalHours = data.intervalHours;
        if (data.provider !== undefined) updated.provider = data.provider;
        return updated;
      });
    }

    // Return the updated master directory snapshot
    return {
      list: store.directoryList,
      urls: store.directoryUrls || {},
      affiliateUrls: store.affiliateUrls || {},
      claimUrls: store.claimUrls || {},
      bonusUrls: store.bonusUrls || {},
      bonusTitles: store.bonusTitles || {},
      ratings: store.directoryRatings || {},
      dailyBonuses: store.directoryDailyBonuses || {},
      resetTimes: store.directoryResetTimes || {},
      details: store.directoryDetails || {},
      providers: store.directoryProviders || {},
    };
  });
}
