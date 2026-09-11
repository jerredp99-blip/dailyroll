"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiGetUsers, apiSaveUsers } from "@/lib/api-client";
import { migrateLegacyLocalStorage } from "@/lib/migrate-legacy";

const ADMIN_EMAIL = "AdminJerredp99@gmail.com";
const LOCAL_USERS_KEY = "dailyroll_users";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  signInMethod: "passwordless email";
};

function getLocalUsers(): UserProfile[] {
  const rawUsers = localStorage.getItem(LOCAL_USERS_KEY);
  if (!rawUsers) return [];

  try {
    const users = JSON.parse(rawUsers) as unknown;
    return Array.isArray(users) ? users as UserProfile[] : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: UserProfile[]) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setError("");
    setIsSubmitting(true);
    try {
      await migrateLegacyLocalStorage();
      if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
        localStorage.setItem("dailyroll_admin", JSON.stringify({ email: ADMIN_EMAIL, signedInAt: new Date().toISOString() }));
        router.push("/dashboard");
        return;
      }

      const localUsers = getLocalUsers();
      let serverUsers: UserProfile[] = [];
      let canSyncProfiles = true;
      try {
        serverUsers = await apiGetUsers();
      } catch (error) {
        canSyncProfiles = false;
        console.warn("Unable to load server profiles; using profiles saved on this device.", error);
      }
      const usersByEmail = new Map(
        [...serverUsers, ...localUsers].map((candidate) => [
          candidate.email.toLowerCase(),
          candidate,
        ]),
      );
      let user = usersByEmail.get(normalizedEmail);
      if (isCreatingProfile) {
        const trimmedName = name.trim();
        if (!trimmedName) {
          setError("Enter your name to create a profile.");
          return;
        }
        if (user) {
          setError("A profile with that email already exists. Sign in instead.");
          return;
        }
        user = {
          id: crypto.randomUUID(),
          name: trimmedName,
          email: normalizedEmail,
          createdAt: new Date().toISOString(),
          signInMethod: "passwordless email",
        };
        const updatedLocalUsers = [...localUsers, user];
        saveLocalUsers(updatedLocalUsers);

        if (canSyncProfiles) {
          try {
            await apiSaveUsers([...serverUsers, user]);
          } catch (error) {
            console.warn("Profile was saved locally but could not be synced to the server.", error);
          }
        }
      } else if (!user) {
        setError("That email is not registered. Create a profile to get started.");
        return;
      }

      localStorage.setItem("dailyroll_user", JSON.stringify({ ...user, signedInAt: new Date().toISOString() }));
      router.push("/user-profile");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#101815] text-[#e6eee5]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(55,103,71,0.32),transparent_28%),radial-gradient(circle_at_88%_82%,rgba(156,113,47,0.18),transparent_27%)]" />
      <div className="absolute -right-28 top-[-9rem] h-[28rem] w-[28rem] rounded-full border-[42px] border-[#1c3026] opacity-80" />
      <div className="absolute -bottom-48 -left-32 h-[32rem] w-[32rem] rounded-full border-[56px] border-[#17271f] opacity-90" />

      <section className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-16 px-6 pb-14 pt-10 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24 lg:px-16 lg:pb-20">
        <div className="max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#2d4a35] bg-[#18271f]/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a4c5a0] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e5b85d]" /> Your daily wins, organized
          </div>
          <h1 className="max-w-lg font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#edf4ea] sm:text-7xl">
            Make every day a little more rewarding.
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-[#9aa99c] sm:text-lg">
            Keep your daily bonuses in one calm, simple place. Never miss a check-in, and watch the small wins add up.
          </p>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-[#9eb4a0]">
            <span className="flex items-center gap-2"><Check size={16} className="text-[#9bcf9c]" /> One-tap check-ins</span>
            <span className="flex items-center gap-2"><Check size={16} className="text-[#9bcf9c]" /> Private by design</span>
          </div>
        </div>

        <div id="signin" className="relative mx-auto w-full max-w-[430px] scroll-mt-8">
          <div className="absolute -inset-3 rounded-[2rem] bg-[#294631]/30 shadow-[0_28px_70px_rgba(0,0,0,0.28)] blur-xl" />
          <div className="relative rounded-[1.75rem] border border-[#2b4434] bg-[#19251f]/95 p-7 shadow-[0_18px_50px_rgba(0,0,0,0.32)] backdrop-blur sm:p-9">
            <div className="mb-8">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">{isCreatingProfile ? "Get started" : "Welcome back"}</p>
              <h2 className="font-serif text-3xl font-semibold tracking-[-0.04em] text-[#e5eee3]">{isCreatingProfile ? "Create your profile" : "Sign in to dailyroll"}</h2>
              <p className="mt-2 text-sm text-[#93a495]">{isCreatingProfile ? "Save your daily bonus roll in one place." : "Your next small win is waiting."}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#344d3b] bg-[#223128] text-sm font-semibold text-[#d6e4d5] transition hover:border-[#608363] hover:bg-[#2a3d30]">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.35 12.23c0-.79-.07-1.55-.2-2.28H12v4.31h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" /><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.04H3.28v2.53A9.74 9.74 0 0 0 12 21.75Z" /><path fill="#FBBC05" d="M6.53 13.82a5.85 5.85 0 0 1 0-3.64V7.65H3.28a9.75 9.75 0 0 0 0 8.7l3.25-2.53Z" /><path fill="#EA4335" d="M12 6.14c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.22 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.72 5.4l3.25 2.53C7.3 7.86 9.46 6.14 12 6.14Z" /></svg> Google
              </button>
              <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#344d3b] bg-[#223128] text-sm font-semibold text-[#d6e4d5] transition hover:border-[#608363] hover:bg-[#2a3d30]">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.86v-8.4H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.93-1.95 1.87V12h3.32l-.53 3.46h-2.79v8.4A12 12 0 0 0 24 12Z" /><path fill="#fff" d="M16.67 15.46 17.2 12h-3.32V9.76c0-.94.46-1.87 1.95-1.87h1.51V4.94s-1.37-.24-2.68-.24c-2.74 0-4.53 1.66-4.53 4.66V12H7.08v3.46h3.04v8.4a12.12 12.12 0 0 0 3.76 0v-8.4h2.79Z" /></svg> Facebook
              </button>
            </div>

            <div className="my-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#819487]">
              <span className="h-px flex-1 bg-[#304438]" /> or continue with email <span className="h-px flex-1 bg-[#304438]" />
            </div>

            <form onSubmit={handleSubmit}>
                {isCreatingProfile && (
                  <>
                    <label htmlFor="name" className="mb-2 block text-xs font-semibold text-[#b7cbb8]">Name</label>
                    <input id="name" type="text" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="mb-3 h-12 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-4 text-sm text-[#e0ece0] outline-none transition placeholder:text-[#718275] focus:border-[#78ae7e] focus:ring-4 focus:ring-[#294a31]" />
                  </>
                )}
                <label htmlFor="email" className="mb-2 block text-xs font-semibold text-[#b7cbb8]">Email address</label>
                <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-4 text-sm text-[#e0ece0] outline-none transition placeholder:text-[#718275] focus:border-[#78ae7e] focus:ring-4 focus:ring-[#294a31]" />
                <button type="submit" disabled={isSubmitting} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#79b77f] text-sm font-semibold text-[#122519] shadow-[0_8px_18px_rgba(44,100,57,0.25)] transition hover:bg-[#91c991] disabled:cursor-not-allowed disabled:opacity-70">
                  {isSubmitting ? "Saving..." : isCreatingProfile ? "Create profile" : "Continue with email"} <ArrowRight size={16} />
                </button>
                {error && <p role="alert" className="mt-3 text-center text-xs text-[#e69b91]">{error}</p>}
            </form>
            <button type="button" onClick={() => { setIsCreatingProfile((creating) => !creating); setError(""); }} className="mt-4 w-full text-center text-xs font-semibold text-[#9bcf9c] hover:text-[#d0edc9]">
              {isCreatingProfile ? "Already have a profile? Sign in" : "New to dailyroll? Create a profile"}
            </button>

            <div className="mt-7 flex items-center justify-center gap-2 text-[11px] text-[#91a595]"><LockKeyhole size={13} /> Secure sign-in, no spam</div>
            <p className="mt-5 text-center text-[11px] leading-5 text-[#84988a]">By continuing, you agree to our <a href="#terms" className="underline decoration-[#506b55] underline-offset-2">Terms</a> and <a href="#privacy" className="underline decoration-[#506b55] underline-offset-2">Privacy Policy</a>.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
