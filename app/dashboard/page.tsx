"use client";

import { FormEvent, useEffect, useState } from "react";
import { Activity, ArrowLeft, Compass, Eye, Search, ShieldCheck, Trash2, User, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiDeleteCasinos, apiGetUsers, apiSaveUsers } from "@/lib/api-client";
import { migrateLegacyLocalStorage } from "@/lib/migrate-legacy";
import { UserActivityInspectorModal } from "@/components/UserActivityInspectorModal";
import { ActiveBadge } from "@/components/ActiveBadge";

type AdminProfile = {
  email: string;
};

type UserProfile = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  signInMethod: "password" | "passwordless email";
  passwordHash?: string;
  lastActiveAt?: string | number | Date;
};

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [telemetryUser, setTelemetryUser] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState("");

  async function hashPassword(password: string) {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as {
          user: { name: string; email: string } | null;
          isAdmin: boolean;
        };
        if (cancelled) return;
        if (!data.isAdmin || !data.user) {
          router.replace("/sign-in");
          return;
        }
        await migrateLegacyLocalStorage();
        const fetchedUsers = await apiGetUsers();
        if (cancelled) return;
        setProfile({ email: data.user.email });
        setUsers(fetchedUsers);
      } catch {
        if (cancelled) return;
        router.replace("/sign-in");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newUserName.trim();
    const email = newUserEmail.trim().toLowerCase();
    const password = newUserPassword.trim();
    if (!name || !email || !password) return;
    if (email === "AdminJerredp99@gmail.com".toLowerCase()) {
      setProfileError("The admin account is managed separately.");
      return;
    }
    if (users.some((user) => user.email.toLowerCase() === email)) {
      setProfileError("A profile with that email already exists.");
      return;
    }
    const newUser: UserProfile = {
      id: Date.now().toString(),
      name,
      email,
      createdAt: new Date().toISOString(),
      signInMethod: "password",
      passwordHash: await hashPassword(password),
    };
    const updatedUsers = [...users, newUser];
    setProfileError("");
    try {
      const savedUsers = await apiSaveUsers(updatedUsers);
      setUsers(savedUsers);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setSelectedUser(newUser);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save the profile. Please try again.");
    }
  }

  async function deleteUser(user: UserProfile) {
    if (!window.confirm(`Remove ${user.name}'s profile? This also deletes their casino progress.`)) return;
    const updatedUsers = users.filter((item) => item.id !== user.id);
    setProfileError("");
    try {
      const savedUsers = await apiSaveUsers(updatedUsers);
      await apiDeleteCasinos(user.email.toLowerCase());
      setUsers(savedUsers);
      if (selectedUser?.id === user.id) setSelectedUser(null);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to remove the profile. Please try again.");
    }
  }

  if (!profile) {
    return <main className="grid min-h-screen place-items-center bg-[#101815] text-[#9bcf9c]">Loading your dashboard...</main>;
  }

  return (
    <main className="min-h-screen bg-[#101815] px-6 py-8 text-[#e6eee5] sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <section className="mt-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">Admin workspace</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold tracking-[-0.05em] text-[#edf4ea]">Welcome back.</h1>
          <p className="mt-4 max-w-xl text-[#9aa99c]">Your admin profile is active. This is the secure starting point for the rest of your dailyroll tools.</p>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-[#2b4434] bg-[#19251f] p-6">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1f3c29] text-[#9bcf9c]"><ShieldCheck size={20} /></span><div><p className="text-xs text-[#91a595]">Signed-in profile</p><p className="mt-1 font-semibold text-[#e5eee3]">Administrator</p></div></div>
            <p className="mt-6 text-sm text-[#a9bbaa]">{profile.email}</p>
          </div>
          <div className="rounded-2xl border border-[#2b4434] bg-[#19251f] p-6">
            <p className="text-xs text-[#91a595]">Session status</p>
            <p className="mt-2 text-2xl font-semibold text-[#9bcf9c]">Active</p>
            <p className="mt-2 text-xs text-[#819487]">Signed in securely for this browser.</p>
          </div>
        </section>

        <Link href="/dashboard/casinos" className="mt-5 flex items-center justify-between rounded-2xl border border-[#4c6d50] bg-[#1b3625] p-5 transition hover:bg-[#24432c]">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">Casino control</p><p className="mt-2 font-serif text-2xl font-semibold text-[#e5eee3]">View and edit all casinos</p><p className="mt-1 text-sm text-[#a9bbaa]">Manage every profile&apos;s cards from one workspace.</p></div>
          <Eye size={20} className="shrink-0 text-[#9bcf9c]" />
        </Link>

        <section id="sign-ups" className="mt-10 rounded-2xl border border-[#2b4434] bg-[#19251f] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">User management</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-[#e5eee3]">Users</h2>
              <p className="mt-2 text-sm text-[#93a495]">Create password-based profiles and open them from the admin view.</p>
            </div>
            <span className="rounded-full border border-[#355b3d] bg-[#1b3625] px-3 py-1 text-xs font-semibold text-[#9bcf9c]">{users.length} users</span>
          </div>

          <form onSubmit={addUser} className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <input aria-label="New user name" required value={newUserName} onChange={(event) => setNewUserName(event.target.value)} placeholder="User name" className="h-11 rounded-xl border border-[#344d3b] bg-[#111b16] px-4 text-sm text-[#e0ece0] outline-none placeholder:text-[#718275] focus:border-[#78ae7e]" />
            <input aria-label="New user email" required type="email" value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} placeholder="user@example.com" className="h-11 rounded-xl border border-[#344d3b] bg-[#111b16] px-4 text-sm text-[#e0ece0] outline-none placeholder:text-[#718275] focus:border-[#78ae7e]" />
            <input aria-label="New user password" required type="password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} placeholder="Password" className="h-11 rounded-xl border border-[#344d3b] bg-[#111b16] px-4 text-sm text-[#e0ece0] outline-none placeholder:text-[#718275] focus:border-[#78ae7e]" />
            <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#79b77f] px-5 text-sm font-semibold text-[#122519] transition hover:bg-[#91c991]"><UserPlus size={16} /> Add user</button>
          </form>
          {profileError && <p role="alert" className="mt-3 text-sm text-[#e69b91]">{profileError}</p>}

          {/* Live Search Input */}
          <div className="relative w-full mt-6 mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-zinc-900/80 border border-emerald-500/20 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:border-emerald-400 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            {users.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#38503d] px-4 py-6 text-center text-xs text-[#819487]">
                No users yet. Add one above to create a profile.
              </p>
            ) : (() => {
              const filteredUsers = users.filter(
                (u) =>
                  (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (filteredUsers.length === 0) {
                return (
                  <p className="rounded-xl border border-dashed border-[#38503d] px-4 py-6 text-center text-xs text-[#819487]">
                    No users match &quot;{searchQuery}&quot;.
                  </p>
                );
              }

              return filteredUsers.map((user) => {
                const isUserActive = Boolean(
                  user.lastActiveAt &&
                    Date.now() - new Date(user.lastActiveAt).getTime() < 5 * 60 * 1000
                );

                return (
                  <div
                    key={user.id}
                    className="w-full p-2.5 sm:p-3 rounded-xl bg-zinc-900/60 border border-emerald-500/15 hover:border-emerald-500/30 flex items-center justify-between gap-2 transition-all min-w-0"
                  >
                    {/* User Identity Info */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-none">
                          {user.name || "User"}
                        </span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isUserActive
                              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                              : "bg-zinc-600"
                          }`}
                        />
                        <span className="text-[10px] text-zinc-500 hidden sm:inline">
                          {isUserActive ? "Active" : "Offline"}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 truncate max-w-[160px] sm:max-w-none">
                        {user.email}
                      </span>
                    </div>

                    {/* Action Buttons (Strictly within screen bounds) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/tracker?user=${encodeURIComponent(user.email)}`)}
                        title="View Rollcall"
                        className="h-8 px-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-200 inline-flex items-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        <Compass className="w-3 h-3 text-emerald-400" />
                        <span className="hidden sm:inline">Rollcall</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTelemetryUser(user)}
                        title="Telemetry"
                        className="h-8 px-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-200 inline-flex items-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        <Activity className="w-3 h-3 text-teal-400" />
                        <span className="hidden sm:inline">Telemetry</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedUser(user)}
                        title="View Profile"
                        className="h-8 w-8 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-zinc-300" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteUser(user)}
                        title="Delete User"
                        aria-label={`Remove ${user.name}`}
                        className="h-8 w-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 inline-flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </section>

        <Link href="/" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-[#9bcf9c] hover:text-[#c2e4bd]"><ArrowLeft size={16} /> Back to landing page</Link>
      </div>
      {selectedUser && (
        <div className="fixed inset-0 z-10 grid place-items-center bg-black/60 p-5" role="presentation" onMouseDown={() => setSelectedUser(null)}>
          <div className="w-full max-w-md rounded-2xl border border-[#38503d] bg-[#19251f] p-6 shadow-2xl space-y-4" role="dialog" aria-modal="true" aria-labelledby="user-profile-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">User profile</p><h2 id="user-profile-title" className="mt-2 font-serif text-3xl font-semibold text-[#e5eee3]">{selectedUser.name}</h2></div>
              <button type="button" onClick={() => setSelectedUser(null)} aria-label="Close user profile" className="text-[#91a595] hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4 text-sm">
              <div><p className="text-xs text-[#819487]">Email</p><p className="mt-1 text-[#d4e4d2]">{selectedUser.email}</p></div>
              <div><p className="text-xs text-[#819487]">Sign-in</p><p className="mt-1 text-[#9bcf9c]">{selectedUser.signInMethod === "password" ? "Password" : "Passwordless email"}</p></div>
              <div><p className="text-xs text-[#819487]">Profile ID</p><p className="mt-1 font-mono text-xs text-[#a9bbaa]">{selectedUser.id}</p></div>
              <div><p className="text-xs text-[#819487]">Created</p><p className="mt-1 text-[#a9bbaa]">{new Date(selectedUser.createdAt).toLocaleString()}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" onClick={() => setTelemetryUser(selectedUser)} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/60 text-xs font-bold text-emerald-300 transition hover:bg-emerald-900/60">
                <Activity size={15} /> Telemetry
              </button>
              <button type="button" onClick={() => { router.push(`/tracker?user=${encodeURIComponent(selectedUser.email)}`); }} className="flex h-11 items-center justify-center rounded-xl bg-[#79b77f] text-xs font-bold text-[#122519] transition hover:bg-[#91c991]">
                Open {selectedUser.name}&apos;s Rollcall
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Activity Inspector Modal */}
      <UserActivityInspectorModal
        user={telemetryUser}
        isOpen={Boolean(telemetryUser)}
        onClose={() => setTelemetryUser(null)}
      />
    </main>
  );
}