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
  siteUrl?: string | null;
  affiliateUrl?: string | null;
  claimUrl?: string | null;
  bonusUrl?: string | null;
  bonusTitle?: string | null;
  trustpilotRating?: number | string | null;
  dailyBonus?: string | null;
  dailyBonusSc?: string | null;
  dailyBonusGc?: string | null;
  minRedemption?: string | null;
  payoutMethods?: string | null;
  payoutSpeed?: string | null;
  resetRule?: string | null;
  restrictedStates?: string | null;
  details?: string | null;
  resetAtTime?: string | null;
  intervalHours?: number | string | null;
  provider?: string | null;
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
    if ("siteUrl" in data) {
      if (data.siteUrl === "" || data.siteUrl === null || data.siteUrl === undefined) {
        delete store.directoryUrls?.[trimmedName];
      } else {
        store.directoryUrls = { ...(store.directoryUrls || {}), [trimmedName]: data.siteUrl };
      }
    }
    if ("affiliateUrl" in data) {
      if (data.affiliateUrl === "" || data.affiliateUrl === null || data.affiliateUrl === undefined) {
        delete store.affiliateUrls?.[trimmedName];
      } else {
        store.affiliateUrls = { ...(store.affiliateUrls || {}), [trimmedName]: data.affiliateUrl };
      }
    }
    if ("claimUrl" in data) {
      if (data.claimUrl === "" || data.claimUrl === null || data.claimUrl === undefined) {
        delete store.claimUrls?.[trimmedName];
      } else {
        store.claimUrls = { ...(store.claimUrls || {}), [trimmedName]: data.claimUrl };
      }
    }
    if ("bonusUrl" in data) {
      if (data.bonusUrl === "" || data.bonusUrl === null || data.bonusUrl === undefined) {
        delete store.bonusUrls?.[trimmedName];
      } else {
        store.bonusUrls = { ...(store.bonusUrls || {}), [trimmedName]: data.bonusUrl };
      }
    }
    if ("bonusTitle" in data) {
      if (data.bonusTitle === "" || data.bonusTitle === null || data.bonusTitle === undefined) {
        delete store.bonusTitles?.[trimmedName];
      } else {
        store.bonusTitles = { ...(store.bonusTitles || {}), [trimmedName]: data.bonusTitle };
      }
    }
    if ("trustpilotRating" in data) {
      if (data.trustpilotRating === "" || data.trustpilotRating === null || data.trustpilotRating === undefined || Number.isNaN(Number(data.trustpilotRating))) {
        delete store.directoryRatings?.[trimmedName];
      } else {
        store.directoryRatings = { ...(store.directoryRatings || {}), [trimmedName]: Number(data.trustpilotRating) };
      }
    }
    if ("dailyBonus" in data) {
      if (data.dailyBonus === "" || data.dailyBonus === null || data.dailyBonus === undefined) {
        delete store.directoryDailyBonuses?.[trimmedName];
      } else {
        store.directoryDailyBonuses = {
          ...(store.directoryDailyBonuses || {}),
          [trimmedName]: data.dailyBonus,
        };
      }
    }
    if ("resetAtTime" in data) {
      if (data.resetAtTime === "" || data.resetAtTime === null || data.resetAtTime === undefined) {
        delete store.directoryResetTimes?.[trimmedName];
      } else {
        store.directoryResetTimes = {
          ...(store.directoryResetTimes || {}),
          [trimmedName]: data.resetAtTime,
        };
      }
    }
    if ("details" in data) {
      if (data.details === "" || data.details === null || data.details === undefined) {
        delete store.directoryDetails?.[trimmedName];
      } else {
        store.directoryDetails = {
          ...(store.directoryDetails || {}),
          [trimmedName]: data.details,
        };
      }
    }
    if ("provider" in data) {
      if (data.provider === "" || data.provider === null || data.provider === undefined) {
        delete store.directoryProviders?.[trimmedName];
      } else {
        store.directoryProviders = {
          ...(store.directoryProviders || {}),
          [trimmedName]: data.provider,
        };
      }
    }
    if ("dailyBonusSc" in data) {
      if (data.dailyBonusSc === "" || data.dailyBonusSc === null || data.dailyBonusSc === undefined) {
        delete store.directoryDailyBonusSc?.[trimmedName];
      } else {
        store.directoryDailyBonusSc = {
          ...(store.directoryDailyBonusSc || {}),
          [trimmedName]: data.dailyBonusSc,
        };
      }
    }
    if ("dailyBonusGc" in data) {
      if (data.dailyBonusGc === "" || data.dailyBonusGc === null || data.dailyBonusGc === undefined) {
        delete store.directoryDailyBonusGc?.[trimmedName];
      } else {
        store.directoryDailyBonusGc = {
          ...(store.directoryDailyBonusGc || {}),
          [trimmedName]: data.dailyBonusGc,
        };
      }
    }
    if ("minRedemption" in data) {
      if (data.minRedemption === "" || data.minRedemption === null || data.minRedemption === undefined) {
        delete store.directoryMinRedemption?.[trimmedName];
      } else {
        store.directoryMinRedemption = {
          ...(store.directoryMinRedemption || {}),
          [trimmedName]: data.minRedemption,
        };
      }
    }
    if ("payoutMethods" in data) {
      if (data.payoutMethods === "" || data.payoutMethods === null || data.payoutMethods === undefined) {
        delete store.directoryPayoutMethods?.[trimmedName];
      } else {
        store.directoryPayoutMethods = {
          ...(store.directoryPayoutMethods || {}),
          [trimmedName]: data.payoutMethods,
        };
      }
    }
    if ("payoutSpeed" in data) {
      if (data.payoutSpeed === "" || data.payoutSpeed === null || data.payoutSpeed === undefined) {
        delete store.directoryPayoutSpeed?.[trimmedName];
      } else {
        store.directoryPayoutSpeed = {
          ...(store.directoryPayoutSpeed || {}),
          [trimmedName]: data.payoutSpeed,
        };
      }
    }
    if ("resetRule" in data) {
      if (data.resetRule === "" || data.resetRule === null || data.resetRule === undefined) {
        delete store.directoryResetRules?.[trimmedName];
      } else {
        store.directoryResetRules = {
          ...(store.directoryResetRules || {}),
          [trimmedName]: data.resetRule,
        };
      }
    }
    if ("restrictedStates" in data) {
      if (data.restrictedStates === "" || data.restrictedStates === null || data.restrictedStates === undefined) {
        delete store.directoryRestrictedStates?.[trimmedName];
      } else {
        store.directoryRestrictedStates = {
          ...(store.directoryRestrictedStates || {}),
          [trimmedName]: data.restrictedStates,
        };
      }
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
        if ("siteUrl" in data) {
          updated.siteUrl = data.siteUrl || undefined;
          updated.url = data.siteUrl || undefined;
        }
        if ("affiliateUrl" in data) updated.affiliateUrl = data.affiliateUrl || undefined;
        if ("claimUrl" in data) updated.claimUrl = data.claimUrl || undefined;
        if ("bonusUrl" in data) updated.bonusUrl = data.bonusUrl || undefined;
        if ("bonusTitle" in data) updated.bonusTitle = data.bonusTitle || undefined;
        if ("trustpilotRating" in data) {
          updated.trustpilotRating = (data.trustpilotRating === null || data.trustpilotRating === "" || data.trustpilotRating === undefined)
            ? undefined
            : Number(data.trustpilotRating);
        }
        if ("dailyBonus" in data) updated.dailyBonus = data.dailyBonus || "Free daily";
        if ("details" in data) updated.details = data.details || undefined;
        if ("resetAtTime" in data) updated.resetAtTime = data.resetAtTime || null;
        if ("intervalHours" in data) {
          updated.intervalHours = (data.intervalHours === null || data.intervalHours === "" || data.intervalHours === undefined)
            ? 24
            : Number(data.intervalHours);
        }
        if ("provider" in data) updated.provider = data.provider || undefined;
        if ("dailyBonusSc" in data) updated.dailyBonusSc = data.dailyBonusSc || null;
        if ("dailyBonusGc" in data) updated.dailyBonusGc = data.dailyBonusGc || null;
        if ("minRedemption" in data) updated.minRedemption = data.minRedemption || null;
        if ("payoutMethods" in data) updated.payoutMethods = data.payoutMethods || null;
        if ("payoutSpeed" in data) updated.payoutSpeed = data.payoutSpeed || null;
        if ("resetRule" in data) updated.resetRule = data.resetRule || null;
        if ("restrictedStates" in data) updated.restrictedStates = data.restrictedStates || null;
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
      dailyBonusSc: store.directoryDailyBonusSc || {},
      dailyBonusGc: store.directoryDailyBonusGc || {},
      minRedemption: store.directoryMinRedemption || {},
      payoutMethods: store.directoryPayoutMethods || {},
      payoutSpeed: store.directoryPayoutSpeed || {},
      resetRules: store.directoryResetRules || {},
      restrictedStates: store.directoryRestrictedStates || {},
      resetTimes: store.directoryResetTimes || {},
      details: store.directoryDetails || {},
      providers: store.directoryProviders || {},
    };
  });
}
