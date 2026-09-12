import { apiSaveCasinos, apiSaveDirectory, apiSaveUsers } from "@/lib/api-client";
import type { Casino, UserProfile } from "@/lib/store";

// One-time transfer of pre-existing localStorage data (from before the
// server-backed store existed) into the backend, so it isn't lost.
const MIGRATION_FLAG = "dailyroll_migrated_to_server";

let migrationPromise: Promise<void> | null = null;

export function migrateLegacyLocalStorage(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (localStorage.getItem(MIGRATION_FLAG) === "1") return Promise.resolve();
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      const rawUsers = localStorage.getItem("dailyroll_users");
      const rawUrls = localStorage.getItem("dailyroll_casino_urls");
      const rawRatings = localStorage.getItem("dailyroll_casino_ratings");
      const rawDirectory = localStorage.getItem("dailyroll_casino_directory");
      const legacyCasinoKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith("dailyroll_casinos_"),
      );
      const hasLegacyData = Boolean(
        rawUsers || rawUrls || rawRatings || rawDirectory || legacyCasinoKeys.length > 0,
      );
      if (!hasLegacyData) return;

      // Only the admin can migrate users and directory data since those
      // endpoints now require admin auth. Casino data is migrated per-user.
      if (rawUsers) {
        try {
          await apiSaveUsers(JSON.parse(rawUsers) as UserProfile[]);
        } catch (error) {
          console.warn("Unable to migrate legacy user profiles (admin only).", error);
        }
      }

      const directoryUpdate: {
        list?: string[];
        urls?: Record<string, string>;
        ratings?: Record<string, number>;
      } = {};
      if (rawDirectory) directoryUpdate.list = JSON.parse(rawDirectory) as string[];
      if (rawUrls) directoryUpdate.urls = JSON.parse(rawUrls) as Record<string, string>;
      if (rawRatings) directoryUpdate.ratings = JSON.parse(rawRatings) as Record<string, number>;
      if (Object.keys(directoryUpdate).length > 0) {
        try {
          await apiSaveDirectory(directoryUpdate);
        } catch (error) {
          console.warn("Unable to migrate legacy directory data (admin only).", error);
        }
      }

      for (const key of legacyCasinoKeys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const email = key === "dailyroll_casinos_admin" ? "admin" : key.replace("dailyroll_casinos_", "");
        try {
          await apiSaveCasinos(email, JSON.parse(raw) as Casino[]);
        } catch (error) {
          console.warn(`Unable to migrate legacy casino data for ${email}.`, error);
        }
      }

      localStorage.setItem(MIGRATION_FLAG, "1");
    } catch (error) {
      console.error("Failed to migrate legacy localStorage data to server", error);
    }
  })();

  return migrationPromise;
}