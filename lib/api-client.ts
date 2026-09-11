import type { Casino, UserProfile } from "@/lib/store";

export async function apiGetUsers(): Promise<UserProfile[]> {
  const res = await fetch("/api/users");
  const data = (await res.json()) as { users: UserProfile[] };
  return data.users;
}

export async function apiSaveUsers(users: UserProfile[]): Promise<UserProfile[]> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ users }),
  });
  const data = (await res.json()) as { users: UserProfile[] };
  return data.users;
}

export async function apiGetCasinos(key?: string | null): Promise<Casino[] | null> {
  const res = await fetch(`/api/casinos?key=${encodeURIComponent(key || "admin")}`);
  const data = (await res.json()) as { casinos: Casino[] | null };
  return data.casinos;
}

export async function apiSaveCasinos(key: string | undefined | null, casinos: Casino[]): Promise<void> {
  await fetch("/api/casinos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: key || "admin", casinos }),
  });
}

export async function apiDeleteCasinos(key: string): Promise<void> {
  await fetch(`/api/casinos?key=${encodeURIComponent(key)}`, { method: "DELETE" });
}

type DirectoryData = {
  list: string[] | null;
  urls: Record<string, string>;
  ratings: Record<string, number>;
};

export async function apiGetDirectory(): Promise<DirectoryData> {
  const res = await fetch("/api/directory");
  return (await res.json()) as DirectoryData;
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
  return (await res.json()) as DirectoryData;
}
