import type { Casino, UserProfile } from "@/lib/store";

async function readApiResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}.`);
  }
  return data;
}

export async function apiGetUsers(): Promise<UserProfile[]> {
  const res = await fetch("/api/users");
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

export async function apiGetCasinos(key?: string | null): Promise<Casino[] | null> {
  const res = await fetch(`/api/casinos?key=${encodeURIComponent(key || "admin")}`);
  const data = await readApiResponse<{ casinos: Casino[] | null }>(res);
  return data.casinos;
}

export async function apiSaveCasinos(key: string | undefined | null, casinos: Casino[]): Promise<void> {
  const res = await fetch("/api/casinos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: key || "admin", casinos }),
  });
  await readApiResponse<{ casinos: Casino[] }>(res);
}

export async function apiDeleteCasinos(key: string): Promise<void> {
  const res = await fetch(`/api/casinos?key=${encodeURIComponent(key)}`, { method: "DELETE" });
  await readApiResponse<{ ok: true }>(res);
}

type DirectoryData = {
  list: string[] | null;
  urls: Record<string, string>;
  ratings: Record<string, number>;
};

export async function apiGetDirectory(): Promise<DirectoryData> {
  const res = await fetch("/api/directory");
  return readApiResponse<DirectoryData>(res);
}

export async function apiSaveDirectory(update: {
  list?: string[];
  urls?: Record<string, string>;
  ratings?: Record<string, number>;
}): Promise<DirectoryData> {
  const res = await fetch("/api/directory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  return readApiResponse<DirectoryData>(res);
}
