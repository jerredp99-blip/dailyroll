import { promises as fs } from "fs";
import path from "path";

// Use Upstash Redis in deployed environments and the JSON file for local development.

export type UserPreferences = {
  /** Daily login reminder opt-in. */
  notifications: boolean;
  /** AMOE / mail-in entry tracking opt-in. */
  amoe: boolean;
  /** Default sort order for the rollcall list. */
  sortOrder: "next-available" | "provider" | "f2p" | "trustpilot" | "name-asc" | "name-desc";
  /** Display name typed on /profile — applied to the account when saved. */
  name?: string;
  /** Contact email saved from /profile (never used for sign-in). */
  contactEmail?: string;
  /** Avatar photo URL or base64 data */
  avatarUrl?: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  signInMethod: "password" | "passwordless email";
  passwordHash?: string;
  avatarUrl?: string;
  role?: "user" | "admin";
  isAdmin?: boolean;
  /** Preferences saved from the /profile settings page. */
  preferences?: UserPreferences;
};

/** Creates admin user profile from environment variables. Returns null if ADMIN_EMAIL is not configured. */
function getEnvAdminUser(): UserProfile | null {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) return null;
  return {
    id: `user-admin-${adminEmail.split("@")[0]}`,
    name: "Admin",
    email: adminEmail.toLowerCase(),
    createdAt: "2026-01-01T00:00:00.000Z",
    signInMethod: "password",
    role: "admin",
    isAdmin: true,
  };
}

import type { Casino, SpeedRunSessionState } from "@/types/casino";
export type { Casino, SpeedRunSessionState };
import { MASTER_CASINOS_DATA } from "@/lib/casinosData";
import { casinoDirectory, casinoDirectoryUrls } from "@/lib/casino-directory";

export type Session = {
  token: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
  expiresAt: string;
};

export type MagicLink = {
  token: string;
  email: string;
  name?: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
};

export type PostType = "discussion" | "big_win" | "drop_code" | "daily_claim";

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorAvatar?: string;
  casinoId?: string | null;
  casinoName?: string | null;
  casinoTag?: string | null;
  tags?: string[];
  type: PostType;
  content: string;
  winAmount?: string | null;
  multiplier?: string | null;
  dropCode?: string | null;
  targetUrl?: string | null;
  linkUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "link" | null;
  createdAt: string;
  updatedAt?: string;
  likes: string[];
  reactions: Record<string, string[]>;
  commentCount: number;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
};

type Store = {
  users: UserProfile[];
  casinos: Record<string, Casino[]>;
  directoryList: string[] | null;
  directoryUrls: Record<string, string>;
  directoryRatings: Record<string, number>;
  affiliateUrls: Record<string, string>;
  claimUrls: Record<string, string>;
  bonusUrls: Record<string, string>;
  bonusTitles: Record<string, string>;
  directoryDailyBonuses?: Record<string, string>;
  directoryDailyBonusSc?: Record<string, string>;
  directoryDailyBonusGc?: Record<string, string>;
  directoryMinRedemption?: Record<string, string>;
  directoryPayoutMethods?: Record<string, string>;
  directoryPayoutSpeed?: Record<string, string>;
  directoryResetRules?: Record<string, string>;
  directoryRestrictedStates?: Record<string, string>;
  directoryResetTimes?: Record<string, string | null>;
  directoryDetails?: Record<string, string>;
  directoryProviders?: Record<string, string>;
  directoryClaimTips?: Record<string, string>;
  directoryHasStreak?: Record<string, boolean>;
  sessions: Record<string, Session>;
  magicLinks: Record<string, MagicLink>;
  posts: Post[];
  comments: Record<string, Comment[]>;
  speedRunSessions?: Record<string, SpeedRunSessionState>;
};

const DATA_DIR = process.env.VERCEL ? "/tmp/dailyroll" : path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = "dailyroll:store";

const INITIAL_POSTS: Post[] = [
  {
    id: "post-seed-1",
    authorId: "seed-user-1",
    authorName: "RollKing",
    authorEmail: "rollking@dailyroll.app",
    casinoTag: "STAKE",
    tags: ["STAKE", "BIG_WIN"],
    type: "big_win",
    content: "Just hit a 500x multiplier on Gates of Olympus off my daily $1 reload!! 250 SC cashed out to crypto in 10 mins 🚀",
    winAmount: "250 SC",
    multiplier: "500x",
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    likes: ["timber@gmail.com"],
    reactions: { "🔥": ["timber@gmail.com"], "🎰": ["rollking@dailyroll.app"] },
    commentCount: 2,
  },
  {
    id: "post-seed-2",
    authorId: "seed-user-2",
    authorName: "PromoHunter",
    authorEmail: "promohunter@dailyroll.app",
    casinoTag: "CROWN",
    tags: ["CROWN", "BONUS_CODE"],
    type: "drop_code",
    content: "Crown Coins just dropped an active promo on IG stories! Use code below for 0.50 SC + 25k GC. Claim fast before cap!",
    dropCode: "CROWN25DROP",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likes: ["timber@gmail.com", "rollking@dailyroll.app"],
    reactions: { "💎": ["timber@gmail.com"] },
    commentCount: 1,
  },
  {
    id: "post-seed-3",
    authorId: "seed-user-3",
    authorName: "LuckyStreak",
    authorEmail: "luckystreak@dailyroll.app",
    casinoTag: "WOW",
    tags: ["WOW"],
    type: "daily_claim",
    content: "Day 7 streak complete! Just claimed my 1.00 SC daily bonus at WOW Vegas. Remember to check in before midnight EST.",
    winAmount: "1.00 SC",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    likes: ["rollking@dailyroll.app"],
    reactions: { "🚀": ["rollking@dailyroll.app"] },
    commentCount: 0,
  },
  {
    id: "post-seed-4",
    authorId: "seed-user-4",
    authorName: "SpinDoc",
    authorEmail: "spindoc@dailyroll.app",
    casinoTag: "PULSZ",
    tags: ["PULSZ", "DISCUSSION"],
    type: "discussion",
    content: "What is everyone's go-to strategy for clearing the 1x playthrough on Pulsz daily bonuses? Blackjack or low volatility slots like Starburst?",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    likes: [],
    reactions: {},
    commentCount: 3,
  },
];

const INITIAL_COMMENTS: Record<string, Comment[]> = {
  "post-seed-1": [
    {
      id: "comment-seed-1",
      postId: "post-seed-1",
      authorId: "seed-user-2",
      authorName: "PromoHunter",
      authorEmail: "promohunter@dailyroll.app",
      content: "Insane hit! Base game or did you buy the feature?",
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: "comment-seed-2",
      postId: "post-seed-1",
      authorId: "seed-user-1",
      authorName: "RollKing",
      authorEmail: "rollking@dailyroll.app",
      content: "Natural spin on 0.20 SC with double chance on!",
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    },
  ],
  "post-seed-2": [
    {
      id: "comment-seed-3",
      postId: "post-seed-2",
      authorId: "seed-user-3",
      authorName: "LuckyStreak",
      authorEmail: "luckystreak@dailyroll.app",
      content: "Confirmed working, thanks for the heads up!",
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    },
  ],
};

const EMPTY_STORE: Store = {
  users: [],
  casinos: {},
  directoryList: null,
  directoryUrls: {},
  directoryRatings: {},
  affiliateUrls: {},
  claimUrls: {},
  bonusUrls: {},
  bonusTitles: {},
  directoryDailyBonuses: {},
  directoryDailyBonusSc: {},
  directoryDailyBonusGc: {},
  directoryMinRedemption: {},
  directoryPayoutMethods: {},
  directoryPayoutSpeed: {},
  directoryResetRules: {},
  directoryRestrictedStates: {},
  directoryResetTimes: {},
  directoryDetails: {},
  directoryProviders: {},
  directoryHasStreak: {},
  sessions: {},
  magicLinks: {},
  posts: INITIAL_POSTS,
  comments: INITIAL_COMMENTS,
};

export const STATIC_ADMIN_EMAILS = [
  "adminjerredp99@gmail.com",
  "mykayla.mann1222@gmail.com",
];

export function ensureAdminUsers(users: UserProfile[]): { users: UserProfile[]; changed: boolean } {
  let changed = false;
  const list = Array.isArray(users) ? [...users] : [];

  for (const adminEmail of STATIC_ADMIN_EMAILS) {
    const targetEmail = adminEmail.toLowerCase();
    const existingIdx = list.findIndex(
      (u) => u.email.toLowerCase() === targetEmail || (u.name && u.name.toLowerCase() === "mkia" && targetEmail.includes("mykayla"))
    );

    if (existingIdx === -1) {
      list.push({
        id: `user-admin-${targetEmail.split("@")[0]}`,
        name: targetEmail.includes("mykayla") ? "Mkia" : "Admin",
        email: targetEmail,
        createdAt: new Date().toISOString(),
        signInMethod: "passwordless email",
        role: "admin",
        isAdmin: true,
      });
      changed = true;
    } else {
      const existing = list[existingIdx];
      if (existing.role !== "admin" || !existing.isAdmin) {
        list[existingIdx] = {
          ...existing,
          role: "admin",
          isAdmin: true,
          ...(targetEmail.includes("mykayla") && (!existing.name || existing.name === "Player") ? { name: "Mkia" } : {}),
        };
        changed = true;
      }
    }
  }

  const adminUser = getEnvAdminUser();
  if (adminUser) {
    const targetEmail = adminUser.email.toLowerCase();
    const existingIdx = list.findIndex((u) => u.email.toLowerCase() === targetEmail);

    if (existingIdx === -1) {
      list.push({ ...adminUser });
      changed = true;
    } else {
      const existing = list[existingIdx];
      if (existing.role !== "admin" || !existing.isAdmin) {
        list[existingIdx] = {
          ...existing,
          name: existing.name || adminUser.name,
          role: "admin",
          isAdmin: true,
        };
        changed = true;
      }
    }
  }

  return { users: list, changed };
}

export async function seedAdminUserIfMissing(): Promise<void> {
  return queueMutation((store) => {
    const { users, changed } = ensureAdminUsers(store.users || []);
    if (changed) {
      store.users = users;
    }
  });
}

let writeQueue: Promise<unknown> = Promise.resolve();

function hasRemoteStore() {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

async function redisCommand<T>(command: string[]) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Upstash Redis is not configured");
  const response = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Upstash Redis request failed: ${response.status}`);
  const data = (await response.json()) as { result: T };
  return data.result;
}

function normalizePosts(posts: Post[]): Post[] {
  return posts.map((p) => {
    const tags =
      p.tags && p.tags.length > 0
        ? p.tags
        : p.casinoTag
        ? [p.casinoTag]
        : [];
    return {
      ...p,
      tags,
      casinoTag: tags[0] || p.casinoTag,
    };
  });
}

async function readFileStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    const rawPosts = parsed.posts && parsed.posts.length > 0 ? parsed.posts : INITIAL_POSTS;
    const { users: hydratedUsers } = ensureAdminUsers(parsed.users || []);
    return {
      ...EMPTY_STORE,
      ...parsed,
      users: hydratedUsers,
      posts: normalizePosts(rawPosts),
      comments: parsed.comments && Object.keys(parsed.comments).length > 0 ? parsed.comments : INITIAL_COMMENTS,
    };
  } catch {
    const adminUser = getEnvAdminUser();
    return { ...EMPTY_STORE, users: adminUser ? [{ ...adminUser }] : [], posts: normalizePosts(INITIAL_POSTS) };
  }
}

async function readStore(): Promise<Store> {
  if (hasRemoteStore()) {
    const raw = await redisCommand<string | null>(["GET", REDIS_KEY]);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Store>;
      const rawPosts = parsed.posts && parsed.posts.length > 0 ? parsed.posts : INITIAL_POSTS;
      const { users: hydratedUsers } = ensureAdminUsers(parsed.users || []);
      return {
        ...EMPTY_STORE,
        ...parsed,
        users: hydratedUsers,
        posts: normalizePosts(rawPosts),
        comments: parsed.comments && Object.keys(parsed.comments).length > 0 ? parsed.comments : INITIAL_COMMENTS,
      };
    }
  }
  return readFileStore();
}

async function writeStoreFile(store: Store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

async function writeStore(store: Store) {
  if (hasRemoteStore()) {
    await redisCommand(["SET", REDIS_KEY, JSON.stringify(store)]);
    return;
  }
  await writeStoreFile(store);
}

export function queueMutation<T>(mutate: (store: Store) => T | Promise<T>): Promise<T> {
  const result = writeQueue.then(async () => {
    const store = await readStore();
    const value = await mutate(store);
    await writeStore(store);
    return value;
  });
  writeQueue = result.catch(() => undefined);
  return result;
}

export function casinoKey(email?: string | null) {
  return email ? email.trim().toLowerCase() : "admin";
}

export async function getUsers() {
  return (await readStore()).users;
}

export async function saveUsers(users: UserProfile[]) {
  return queueMutation((store) => {
    store.users = users;
    return users;
  });
}

export async function saveUserPreferences(
  email: string,
  preferences: UserPreferences,
) {
  const normalized = email.trim().toLowerCase();
  return queueMutation((store) => {
    const user = store.users.find(
      (entry) => entry.email.trim().toLowerCase() === normalized,
    );
    if (!user) return null;
    user.preferences = { ...user.preferences, ...preferences };
    const nextName = preferences.name?.trim();
    if (nextName) user.name = nextName;
    if ("avatarUrl" in preferences) {
      user.avatarUrl = preferences.avatarUrl === "" ? undefined : (preferences.avatarUrl ?? undefined);
    }
    return user;
  });
}

export async function getCasinos(key: string) {
  return (await readStore()).casinos[key] ?? null;
}

export async function saveCasinos(key: string, casinos: Casino[]) {
  return queueMutation((store) => {
    store.casinos[key] = casinos;
    return casinos;
  });
}

export async function deleteCasinos(key: string) {
  return queueMutation((store) => {
    delete store.casinos[key];
  });
}

export async function getSpeedRunSessionStore(key: string): Promise<SpeedRunSessionState | null> {
  const store = await readStore();
  return store.speedRunSessions?.[key] ?? null;
}

export async function saveSpeedRunSessionStore(key: string, sessionState: SpeedRunSessionState): Promise<SpeedRunSessionState> {
  return queueMutation((store) => {
    if (!store.speedRunSessions) store.speedRunSessions = {};
    store.speedRunSessions[key] = sessionState;
    return sessionState;
  });
}

export async function deleteSpeedRunSessionStore(key: string): Promise<void> {
  return queueMutation((store) => {
    if (store.speedRunSessions) {
      delete store.speedRunSessions[key];
    }
  });
}

export async function getDirectory() {
  const store = await readStore();

  const defaultUrls: Record<string, string> = { ...casinoDirectoryUrls };
  const defaultDailyBonuses: Record<string, string> = {};
  const defaultDailyBonusSc: Record<string, string> = {};
  const defaultDailyBonusGc: Record<string, string> = {};
  const defaultMinRedemption: Record<string, string> = {};
  const defaultResetRules: Record<string, string> = {};
  const defaultHasStreak: Record<string, boolean> = {};

  for (const c of MASTER_CASINOS_DATA) {
    if (c.siteUrl) defaultUrls[c.name] = c.siteUrl;
    if (c.dailyBonus) defaultDailyBonuses[c.name] = c.dailyBonus;
    if (c.dailyBonusSc) defaultDailyBonusSc[c.name] = c.dailyBonusSc;
    if (c.dailyBonusGc) defaultDailyBonusGc[c.name] = c.dailyBonusGc;
    if (c.minRedemption) defaultMinRedemption[c.name] = c.minRedemption;
    if (c.resetRule) defaultResetRules[c.name] = c.resetRule;
    if (c.hasStreak !== undefined) defaultHasStreak[c.name] = c.hasStreak;
  }

  const rawList = store.directoryList && store.directoryList.length > 0 ? store.directoryList : casinoDirectory;
  const listSet = new Set(rawList);
  for (const c of MASTER_CASINOS_DATA) {
    if (!listSet.has(c.name)) {
      listSet.add(c.name);
    }
  }
  const mergedList = Array.from(listSet);

  return {
    list: mergedList,
    urls: { ...defaultUrls, ...(store.directoryUrls || {}) },
    affiliateUrls: store.affiliateUrls || {},
    claimUrls: store.claimUrls || {},
    bonusUrls: store.bonusUrls || {},
    bonusTitles: store.bonusTitles || {},
    ratings: store.directoryRatings || {},
    dailyBonuses: { ...defaultDailyBonuses, ...(store.directoryDailyBonuses || {}) },
    dailyBonusSc: { ...defaultDailyBonusSc, ...(store.directoryDailyBonusSc || {}) },
    dailyBonusGc: { ...defaultDailyBonusGc, ...(store.directoryDailyBonusGc || {}) },
    minRedemption: { ...defaultMinRedemption, ...(store.directoryMinRedemption || {}) },
    payoutMethods: store.directoryPayoutMethods || {},
    payoutSpeed: store.directoryPayoutSpeed || {},
    resetRules: { ...defaultResetRules, ...(store.directoryResetRules || {}) },
    restrictedStates: store.directoryRestrictedStates || {},
    resetTimes: store.directoryResetTimes || {},
    details: store.directoryDetails || {},
    providers: store.directoryProviders || {},
    hasStreak: { ...defaultHasStreak, ...(store.directoryHasStreak || {}) },
  };
}

export async function saveDirectory(update: {
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
  hasStreak?: Record<string, boolean>;
}) {
  return queueMutation((store) => {
    if (update.list) store.directoryList = update.list;
    if (update.urls) store.directoryUrls = { ...(store.directoryUrls || {}), ...update.urls };
    if (update.affiliateUrls)
      store.affiliateUrls = { ...(store.affiliateUrls || {}), ...update.affiliateUrls };
    if (update.claimUrls) store.claimUrls = { ...(store.claimUrls || {}), ...update.claimUrls };
    if (update.bonusUrls) store.bonusUrls = { ...(store.bonusUrls || {}), ...update.bonusUrls };
    if (update.bonusTitles) store.bonusTitles = { ...(store.bonusTitles || {}), ...update.bonusTitles };
    if (update.ratings) store.directoryRatings = { ...(store.directoryRatings || {}), ...update.ratings };
    if (update.dailyBonuses)
      store.directoryDailyBonuses = { ...(store.directoryDailyBonuses || {}), ...update.dailyBonuses };
    if (update.dailyBonusSc)
      store.directoryDailyBonusSc = { ...(store.directoryDailyBonusSc || {}), ...update.dailyBonusSc };
    if (update.dailyBonusGc)
      store.directoryDailyBonusGc = { ...(store.directoryDailyBonusGc || {}), ...update.dailyBonusGc };
    if (update.minRedemption)
      store.directoryMinRedemption = { ...(store.directoryMinRedemption || {}), ...update.minRedemption };
    if (update.payoutMethods)
      store.directoryPayoutMethods = { ...(store.directoryPayoutMethods || {}), ...update.payoutMethods };
    if (update.payoutSpeed)
      store.directoryPayoutSpeed = { ...(store.directoryPayoutSpeed || {}), ...update.payoutSpeed };
    if (update.resetRules)
      store.directoryResetRules = { ...(store.directoryResetRules || {}), ...update.resetRules };
    if (update.restrictedStates)
      store.directoryRestrictedStates = { ...(store.directoryRestrictedStates || {}), ...update.restrictedStates };
    if (update.resetTimes)
      store.directoryResetTimes = { ...(store.directoryResetTimes || {}), ...update.resetTimes };
    if (update.details)
      store.directoryDetails = { ...(store.directoryDetails || {}), ...update.details };
    if (update.providers)
      store.directoryProviders = { ...(store.directoryProviders || {}), ...update.providers };
    if (update.hasStreak)
      store.directoryHasStreak = { ...(store.directoryHasStreak || {}), ...update.hasStreak };
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
      hasStreak: store.directoryHasStreak || {},
    };
  });
}

// --- Sessions ---

export async function createSession(session: Session) {
  return queueMutation((store) => {
    store.sessions[session.token] = session;
    return session;
  });
}

export async function getSession(token: string) {
  const store = await readStore();
  return store.sessions[token] ?? null;
}

export async function deleteSession(token: string) {
  return queueMutation((store) => {
    delete store.sessions[token];
  });
}

export async function deleteSessionsForEmail(email: string) {
  return queueMutation((store) => {
    const normalized = email.trim().toLowerCase();
    for (const [token, session] of Object.entries(store.sessions)) {
      if (session.email.toLowerCase() === normalized) {
        delete store.sessions[token];
      }
    }
  });
}

// --- Magic links ---

export async function createMagicLink(link: MagicLink) {
  return queueMutation((store) => {
    store.magicLinks[link.token] = link;
    return link;
  });
}

export async function getMagicLink(token: string) {
  const store = await readStore();
  return store.magicLinks[token] ?? null;
}

export async function markMagicLinkUsed(token: string) {
  return queueMutation((store) => {
    const link = store.magicLinks[token];
    if (link) link.used = true;
    return link;
  });
}

export async function deleteMagicLink(token: string) {
  return queueMutation((store) => {
    delete store.magicLinks[token];
  });
}

export async function cleanupExpiredMagicLinks() {
  return queueMutation((store) => {
    const now = Date.now();
    for (const [token, link] of Object.entries(store.magicLinks)) {
      if (new Date(link.expiresAt).getTime() < now) {
        delete store.magicLinks[token];
      }
    }
  });
}

// --- Social Casino Feed ---

export async function getPosts(filter?: {
  type?: PostType;
  casinoTag?: string;
  tag?: string;
  authorEmail?: string;
}) {
  const store = await readStore();
  let posts = [...(store.posts || [])];

  if (filter?.type) {
    posts = posts.filter((p) => p.type === filter.type);
  }
  const tagToFilter = filter?.tag || filter?.casinoTag;
  if (tagToFilter) {
    const target = tagToFilter.trim().toUpperCase().replace(/^[$#]+/, "");
    posts = posts.filter((p) => {
      const allPostTags = (
        p.tags && p.tags.length > 0 ? p.tags : p.casinoTag ? [p.casinoTag] : []
      ).map((t) => t.trim().toUpperCase().replace(/^[$#]+/, ""));
      return allPostTags.includes(target);
    });
  }
  if (filter?.authorEmail) {
    const email = filter.authorEmail.trim().toLowerCase();
    posts = posts.filter((p) => p.authorEmail?.toLowerCase() === email);
  }

  return posts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getPostById(postId: string) {
  const store = await readStore();
  return store.posts?.find((p) => p.id === postId) || null;
}

export async function createPost(
  postData: Omit<Post, "id" | "createdAt" | "likes" | "reactions" | "commentCount">
) {
  return queueMutation((store) => {
    const effectiveTags = postData.tags && postData.tags.length > 0
      ? postData.tags
      : postData.casinoTag
      ? [postData.casinoTag]
      : [];

    const newPost: Post = {
      ...postData,
      id: "post-" + crypto.randomUUID(),
      casinoId: postData.casinoId ?? null,
      casinoName: postData.casinoName ?? null,
      tags: effectiveTags,
      casinoTag: effectiveTags[0] ?? postData.casinoTag,
      createdAt: new Date().toISOString(),
      likes: [],
      reactions: {},
      commentCount: 0,
    };
    store.posts = [newPost, ...(store.posts || [])];
    return newPost;
  });
}

export async function updatePost(
  postId: string,
  updateData: Partial<
    Pick<
      Post,
      | "content"
      | "casinoTag"
      | "casinoId"
      | "casinoName"
      | "tags"
      | "type"
      | "winAmount"
      | "multiplier"
      | "dropCode"
      | "targetUrl"
      | "linkUrl"
      | "mediaUrl"
      | "mediaType"
    >
  >
) {
  return queueMutation((store) => {
    const postIndex = (store.posts || []).findIndex((p) => p.id === postId);
    if (postIndex === -1) return null;
    const existing = store.posts[postIndex];

    const effectiveTags =
      updateData.tags !== undefined
        ? updateData.tags
        : updateData.casinoTag !== undefined
        ? updateData.casinoTag
          ? [updateData.casinoTag]
          : []
        : existing.tags;

    const updated: Post = {
      ...existing,
      ...updateData,
      tags: effectiveTags,
      casinoTag:
        "casinoTag" in updateData
          ? updateData.casinoTag
          : effectiveTags?.[0] ?? existing.casinoTag,
      updatedAt: new Date().toISOString(),
    };
    store.posts[postIndex] = updated;
    return updated;
  });
}

export async function deletePost(postId: string) {
  return queueMutation((store) => {
    const postIndex = (store.posts || []).findIndex((p) => p.id === postId);
    if (postIndex === -1) return false;
    store.posts.splice(postIndex, 1);
    if (store.comments && store.comments[postId]) {
      delete store.comments[postId];
    }
    return true;
  });
}

export async function toggleLikePost(postId: string, userEmail: string) {
  return queueMutation((store) => {
    const post = store.posts.find((p) => p.id === postId);
    if (!post) return null;
    const email = userEmail.trim().toLowerCase();
    const index = post.likes.indexOf(email);
    if (index >= 0) {
      post.likes.splice(index, 1);
    } else {
      post.likes.push(email);
    }
    return post;
  });
}

export async function toggleReactionPost(
  postId: string,
  userEmail: string,
  emoji: string
) {
  return queueMutation((store) => {
    const post = store.posts.find((p) => p.id === postId);
    if (!post) return null;
    if (!post.reactions) post.reactions = {};

    const email = userEmail.trim().toLowerCase();
    const alreadyHadThisEmoji = (post.reactions[emoji] || []).includes(email);

    // Rule: Single reaction per post. Remove user's reaction from all emojis first
    Object.keys(post.reactions).forEach((em) => {
      post.reactions[em] = (post.reactions[em] || []).filter((e) => e !== email);
      if (post.reactions[em].length === 0) {
        delete post.reactions[em];
      }
    });

    // If they did not already have this emoji active, add it now (toggle on). Otherwise it stays removed (toggle off).
    if (!alreadyHadThisEmoji) {
      if (!post.reactions[emoji]) {
        post.reactions[emoji] = [];
      }
      post.reactions[emoji].push(email);
    }

    return post;
  });
}

export async function getComments(postId: string) {
  const store = await readStore();
  return store.comments?.[postId] || [];
}

export async function addComment(
  postId: string,
  commentData: Omit<Comment, "id" | "createdAt">
) {
  return queueMutation((store) => {
    if (!store.comments) store.comments = {};
    if (!store.comments[postId]) store.comments[postId] = [];

    const newComment: Comment = {
      ...commentData,
      id: "comm-" + crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    store.comments[postId].push(newComment);

    const post = store.posts.find((p) => p.id === postId);
    if (post) {
      post.commentCount = store.comments[postId].length;
    }

    return newComment;
  });
}