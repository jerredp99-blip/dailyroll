"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Eye, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiDeleteCasinos, apiGetUsers, apiSaveUsers } from "@/lib/api-client";
import { migrateLegacyLocalStorage } from "@/lib/migrate-legacy";

type AdminProfile = {
  email: string;
  signedInAt: string;
};

type UserProfile = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  signInMethod: "passwordless email";
};

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    const savedProfile = localStorage.getItem("dailyroll_admin");
    if (!savedProfile) {
      router.replace("/#signin");
      return;
    }
    let cancelled = false;
    (async () => {
      await migrateLegacyLocalStorage();
      const fetchedUsers = await apiGetUsers();
      if (cancelled) return;
      setProfile(JSON.parse(savedProfile) as AdminProfile);
      setUsers(fetchedUsers);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newUserName.trim();
    const email = newUserEmail.trim().toLowerCase();
    if (!name || !email) return;
    if (users.some((user) => user.email.toLowerCase() === email)) {
      setProfileError("A profile with that email already exists.");
      return;
    }
    const newUser: UserProfile = { id: Date.now().toString(), name, email, createdAt: new Date().toISOString(), signInMethod: "passwordless email" };
    const updatedUsers = [...users, newUser];
    setProfileError("");
    try {
      const savedUsers = await apiSaveUsers(updatedUsers);
      setUsers(savedUsers);
      setNewUserName("");
      setNewUserEmail("");
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
            <p className="mt-2 text-xs text-[#819487]">Signed in locally for this browser.</p>
          </div>
        </section>

        <section id="sign-ups" className="mt-10 rounded-2xl border border-[#2b4434] bg-[#19251f] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">User management</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-[#e5eee3]">Users</h2>
              <p className="mt-2 text-sm text-[#93a495]">Create passwordless profiles and open them from the admin view.</p>
            </div>
            <span className="rounded-full border border-[#355b3d] bg-[#1b3625] px-3 py-1 text-xs font-semibold text-[#9bcf9c]">{users.length} users</span>
          </div>

          <form onSubmit={addUser} className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input aria-label="New user name" required value={newUserName} onChange={(event) => setNewUserName(event.target.value)} placeholder="User name" className="h-11 rounded-xl border border-[#344d3b] bg-[#111b16] px-4 text-sm text-[#e0ece0] outline-none placeholder:text-[#718275] focus:border-[#78ae7e]" />
            <input aria-label="New user email" required type="email" value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} placeholder="user@example.com" className="h-11 rounded-xl border border-[#344d3b] bg-[#111b16] px-4 text-sm text-[#e0ece0] outline-none placeholder:text-[#718275] focus:border-[#78ae7e]" />
            <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#79b77f] px-5 text-sm font-semibold text-[#122519] transition hover:bg-[#91c991]"><UserPlus size={16} /> Add user</button>
          </form>
          {profileError && <p role="alert" className="mt-3 text-sm text-[#e69b91]">{profileError}</p>}

          <div className="mt-6 space-y-3">
            {users.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#38503d] px-4 py-6 text-center text-sm text-[#819487]">No users yet. Add one above to create a profile.</p>
            ) : users.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#304638] bg-[#1f3027] p-4">
                <div><p className="font-semibold text-[#e5eee3]">{user.name}</p><p className="mt-1 text-sm text-[#93a495]">{user.email}</p></div>
                <div className="flex items-center gap-2"><button type="button" onClick={() => setSelectedUser(user)} className="flex items-center gap-2 rounded-lg border border-[#4c6d50] px-3 py-2 text-xs font-semibold text-[#b7d5b5] transition hover:bg-[#2a4230]"><Eye size={15} /> View profile</button><button type="button" onClick={() => deleteUser(user)} aria-label={`Remove ${user.name}`} className="rounded-lg p-2 text-[#718275] transition hover:bg-[#422c2b] hover:text-[#e69b91]"><Trash2 size={15} /></button></div>
              </div>
            ))}
          </div>
        </section>

        <Link href="/" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-[#9bcf9c] hover:text-[#c2e4bd]"><ArrowLeft size={16} /> Back to landing page</Link>
      </div>
      {selectedUser && <div className="fixed inset-0 z-10 grid place-items-center bg-black/60 p-5" role="presentation" onMouseDown={() => setSelectedUser(null)}><div className="w-full max-w-md rounded-2xl border border-[#38503d] bg-[#19251f] p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="user-profile-title" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">User profile</p><h2 id="user-profile-title" className="mt-2 font-serif text-3xl font-semibold text-[#e5eee3]">{selectedUser.name}</h2></div><button type="button" onClick={() => setSelectedUser(null)} aria-label="Close user profile" className="text-[#91a595] hover:text-white"><X size={20} /></button></div><div className="mt-7 space-y-4 text-sm"><div><p className="text-xs text-[#819487]">Email</p><p className="mt-1 text-[#d4e4d2]">{selectedUser.email}</p></div><div><p className="text-xs text-[#819487]">Sign-in</p><p className="mt-1 text-[#9bcf9c]">Passwordless email</p></div><div><p className="text-xs text-[#819487]">Profile ID</p><p className="mt-1 font-mono text-xs text-[#a9bbaa]">{selectedUser.id}</p></div><div><p className="text-xs text-[#819487]">Created</p><p className="mt-1 text-[#a9bbaa]">{new Date(selectedUser.createdAt).toLocaleString()}</p></div></div><button type="button" onClick={() => { localStorage.setItem("dailyroll_user", JSON.stringify({ ...selectedUser, signedInAt: new Date().toISOString() })); router.push("/user-profile"); }} className="mt-7 flex h-11 w-full items-center justify-center rounded-xl bg-[#79b77f] text-sm font-semibold text-[#122519] transition hover:bg-[#91c991]">Open user page</button></div></div>}
    </main>
  );
}
