import {
  casinoKey,
  deleteCasinos,
  getCasinos,
  getDirectory,
  getUsers,
  saveCasinos,
  saveDirectory,
  type Casino,
  type UserProfile,
} from "./store";
import { ADMIN_EMAIL } from "./auth";

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
 * Updates a casino's canonical metadata (URLs, bonus title, rating) across:
 * 1. The shared master directory in Upstash Redis / DB
 * 2. Every user profile's saved casino list in Upstash Redis / DB
 *
 * This guarantees that changes are immediately persisted to the shared DB
 * and that no device or user profile ever retains or syncs back stale links.
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
}) {
  const trimmedName = data.name.trim();
  const lowerName = trimmedName.toLowerCase();

  // 1. Update shared master directory in DB
  const directoryUpdate: Parameters<typeof saveDirectory>[0] = {};
  if (data.siteUrl !== undefined) directoryUpdate.urls = { [trimmedName]: data.siteUrl };
  if (data.affiliateUrl !== undefined) directoryUpdate.affiliateUrls = { [trimmedName]: data.affiliateUrl };
  if (data.claimUrl !== undefined) directoryUpdate.claimUrls = { [trimmedName]: data.claimUrl };
  if (data.bonusUrl !== undefined) directoryUpdate.bonusUrls = { [trimmedName]: data.bonusUrl };
  if (data.bonusTitle !== undefined) directoryUpdate.bonusTitles = { [trimmedName]: data.bonusTitle };
  if (data.trustpilotRating !== undefined) directoryUpdate.ratings = { [trimmedName]: data.trustpilotRating };

  const savedDirectory = await saveDirectory(directoryUpdate);

  // 2. Propagate to all saved profile records in DB
  const users = await getUsers();
  const keysToUpdate = [
    ...users.map((u) => casinoKey(u.email)),
    casinoKey(ADMIN_EMAIL),
    "admin",
  ];

  await Promise.all(
    keysToUpdate.map(async (key) => {
      const records = (await getCasinos(key)) ?? [];
      let changed = false;
      const updated = records.map((casino) => {
        if (casino.name.trim().toLowerCase() !== lowerName) return casino;

        const updates: Partial<Casino> = {};
        if (data.siteUrl !== undefined && data.siteUrl !== casino.siteUrl) {
          updates.siteUrl = data.siteUrl;
        }
        if (data.affiliateUrl !== undefined && data.affiliateUrl !== casino.affiliateUrl) {
          updates.affiliateUrl = data.affiliateUrl;
        }
        if (data.claimUrl !== undefined && data.claimUrl !== casino.claimUrl) {
          updates.claimUrl = data.claimUrl;
        }
        if (data.bonusUrl !== undefined && data.bonusUrl !== casino.bonusUrl) {
          updates.bonusUrl = data.bonusUrl;
        }
        if (data.bonusTitle !== undefined && data.bonusTitle !== casino.bonusTitle) {
          updates.bonusTitle = data.bonusTitle;
        }
        if (data.trustpilotRating !== undefined && data.trustpilotRating !== casino.trustpilotRating) {
          updates.trustpilotRating = data.trustpilotRating;
        }
        if (data.dailyBonus !== undefined && data.dailyBonus !== casino.dailyBonus) {
          updates.dailyBonus = data.dailyBonus;
        }
        if (data.details !== undefined && data.details !== casino.details) {
          updates.details = data.details;
        }

        if (Object.keys(updates).length === 0) return casino;
        changed = true;
        return { ...casino, ...updates } as Casino;
      });

      if (changed) {
        await saveCasinos(key, updated);
      }
    })
  );

  return savedDirectory;
}
