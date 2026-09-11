import { promises as fs } from "fs";
import path from "path";

// File-backed JSON store so tracker data (ratings, casino lists, users,
// directory) persists on the server instead of per-browser localStorage.
// NOTE: this relies on a writable local filesystem. If this app is deployed
// to a serverless/read-only environment (e.g. Vercel), swap this module for
// a real database or KV store — the on-disk file will not persist there.

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  signInMethod: "passwordless email";
};

export type Casino = {
  id: string;
  name: string;
  dailyBonus: string;
  url: string;
  lastClaimedAt: string | null;
  intervalHours: number;
  resetAtTime?: string | null;
  trustpilotRating?: number;
  logo?: string;
  details?: string;
};

type Store = {
  users: UserProfile[];
  casinos: Record<string, Casino[]>;
  directoryList: string[] | null;
  directoryUrls: Record<string, string>;
  directoryRatings: Record<string, number>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const EMPTY_STORE: Store = {
  users: [],
  casinos: {},
  directoryList: null,
  directoryUrls: {},
  directoryRatings: {},
};

let writeQueue: Promise<unknown> = Promise.resolve();

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return { ...EMPTY_STORE, ...(JSON.parse(raw) as Partial<Store>) };
  } catch {
    return { ...EMPTY_STORE };
  }
}

async function writeStoreFile(store: Store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function queueMutation<T>(mutate: (store: Store) => T | Promise<T>): Promise<T> {
  const result = writeQueue.then(async () => {
    const store = await readStore();
    const value = await mutate(store);
    await writeStoreFile(store);
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

export async function getDirectory() {
  const store = await readStore();
  return {
    list: store.directoryList,
    urls: store.directoryUrls,
    ratings: store.directoryRatings,
  };
}

export async function saveDirectory(update: {
  list?: string[];
  urls?: Record<string, string>;
  ratings?: Record<string, number>;
}) {
  return queueMutation((store) => {
    if (update.list) store.directoryList = update.list;
    if (update.urls) store.directoryUrls = { ...store.directoryUrls, ...update.urls };
    if (update.ratings) store.directoryRatings = { ...store.directoryRatings, ...update.ratings };
    return {
      list: store.directoryList,
      urls: store.directoryUrls,
      ratings: store.directoryRatings,
    };
  });
}
