import type { Casino, UserPreferences, UserProfile } from "@/lib/store";

async function readApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: (T & { error?: string }) | undefined;

  if (text) {
    try {
      data = JSON.parse(text) as T & { error?: string };
    } catch {
      throw new Error(`The server returned an invalid response (status ${response.status}).`);
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}.`);
  }
  if (!data) {
    throw new Error("The server returned an empty response.");
  }
  return data;
}

const NO_CACHE_FETCH_OPTIONS = {
  cache: "no-store" as const,
  headers: {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
  },
};

export async function apiGetUsers(): Promise<UserProfile[]> {
  const res = await fetch("/api/users", NO_CACHE_FETCH_OPTIONS);
  const data = await readApiResponse<{ users: UserProfile[] }>(res);
  return data.users;
}

export async function apiSaveUsers(users: UserProfile[]): Promise<UserProfile[]> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ users }),
  });
  const data = await readApiResponse<{ users: UserProfile[] }>(res);
  return data.users;
}

export type ProfileResponse = {
  user: { name: string; email: string; avatarUrl?: string | null } | null;
  preferences: UserPreferences | null;
};

export async function apiGetProfile(): Promise<ProfileResponse> {
  const res = await fetch("/api/profile", NO_CACHE_FETCH_OPTIONS);
  return readApiResponse<ProfileResponse>(res);
}

export async function apiSaveProfile(
  preferences: UserPreferences,
): Promise<ProfileResponse> {
  const res = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  return readApiResponse<ProfileResponse>(res);
}

export async function apiGetCasinos(key?: string | null): Promise<Casino[] | null> {
  const url = key ? `/api/casinos?key=${encodeURIComponent(key)}` : `/api/casinos`;
  const res = await fetch(url, NO_CACHE_FETCH_OPTIONS);
  const data = await readApiResponse<{ casinos: Casino[] | null }>(res);
  return data.casinos;
}

export async function apiSaveCasinos(key: string | undefined | null, casinos: Casino[]): Promise<void> {
  const res = await fetch("/api/casinos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...(key ? { key } : {}), casinos }),
  });
  await readApiResponse<{ casinos: Casino[] }>(res);
}

export async function apiUpdateCasinoBalance(casinoId: string, currentBalance: number): Promise<{ success: boolean; currentBalance: number }> {
  const res = await fetch(`/api/casinos/${encodeURIComponent(casinoId)}/balance`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentBalance }),
  });
  return readApiResponse<{ success: boolean; currentBalance: number }>(res);
}

export async function apiDeleteCasinos(key: string): Promise<void> {
  const res = await fetch(`/api/casinos?key=${encodeURIComponent(key)}`, { method: "DELETE" });
  await readApiResponse<{ ok: true }>(res);
}

export type DirectoryData = {
  list: string[] | null;
  urls: Record<string, string>;
  affiliateUrls: Record<string, string>;
  claimUrls: Record<string, string>;
  bonusUrls: Record<string, string>;
  bonusTitles: Record<string, string>;
  ratings: Record<string, number>;
  dailyBonuses?: Record<string, string>;
  dailyBonusSc?: Record<string, string>;
  dailyBonusGc?: Record<string, string>;
  minRedemption?: Record<string, string>;
  payoutMethods?: Record<string, string>;
  payoutSpeed?: Record<string, string>;
  resetRules?: Record<string, string>;
  restrictedStates?: Record<string, string>;
  resetTimes?: Record<string, string | null>;
  details?: Record<string, string>;
  providers?: Record<string, string>;
  claimTips?: Record<string, string>;
  hasStreak?: Record<string, boolean>;
};

export async function apiGetDirectory(): Promise<DirectoryData> {
  const res = await fetch("/api/directory", NO_CACHE_FETCH_OPTIONS);
  return readApiResponse<DirectoryData>(res);
}

export async function apiSaveDirectory(update: {
  list?: string[];
  urls?: Record<string, string>;
  affiliateUrls?: Record<string, string>;
  claimUrls?: Record<string, string>;
  bonusUrls?: Record<string, string>;
  bonusTitles?: Record<string, string>;
  ratings?: Record<string, number>;
  dailyBonuses?: Record<string, string>;
  dailyBonusSc?: Record<string, string>;
  dailyBonusGc?: Record<string, string>;
  minRedemption?: Record<string, string>;
  payoutMethods?: Record<string, string>;
  payoutSpeed?: Record<string, string>;
  resetRules?: Record<string, string>;
  restrictedStates?: Record<string, string>;
  resetTimes?: Record<string, string | null>;
  details?: Record<string, string>;
  providers?: Record<string, string>;
  claimTips?: Record<string, string>;
  hasStreak?: Record<string, boolean>;
}): Promise<DirectoryData> {
  const res = await fetch("/api/directory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  return readApiResponse<DirectoryData>(res);
}

export async function apiUpdateAdminCasino(data: {
  name: string;
  siteUrl?: string | null;
  affiliateUrl?: string | null;
  claimUrl?: string | null;
  bonusUrl?: string | null;
  bonusTitle?: string | null;
  trustpilotRating?: number | null;
  dailyBonus?: string | null;
  details?: string | null;
  resetAtTime?: string | null;
  intervalHours?: number | null;
  provider?: string | null;
  claimTip?: string | null;
  claimInstructions?: string | null;
  dailyBonusSc?: string | null;
  dailyBonusGc?: string | null;
  minRedemption?: string | null;
  payoutMethods?: string | null;
  payoutSpeed?: string | null;
  resetRule?: string | null;
  restrictedStates?: string | null;
  hasStreak?: boolean | null;
}): Promise<{ ok: boolean; directory: DirectoryData }> {
  const res = await fetch("/api/admin/casinos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return readApiResponse<{ ok: boolean; directory: DirectoryData }>(res);
}
