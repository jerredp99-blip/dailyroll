import { promises as fs } from "fs";
import path from "path";

// Use Upstash Redis in deployed environments and the JSON file for local development.

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
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = "dailyroll:store";

const EMPTY_STORE: Store = {
  users: [],
  casinos: {},
  directoryList: null,
  directoryUrls: {},
  directoryRatings: {},
};

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

async function readFileStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return { ...EMPTY_STORE, ...(JSON.parse(raw) as Partial<Store>) };
  } catch {
    return { ...EMPTY_STORE };
  }
}

async function readStore(): Promise<Store> {
  if (hasRemoteStore()) {
    const raw = await redisCommand<string | null>(["GET", REDIS_KEY]);
    if (raw) return { ...EMPTY_STORE, ...(JSON.parse(raw) as Partial<Store>) };
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

function queueMutation<T>(mutate: (store: Store) => T | Promise<T>): Promise<T> {
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
