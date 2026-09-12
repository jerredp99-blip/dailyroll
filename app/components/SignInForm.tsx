"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function SignInFormComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const errorParam = searchParams?.get("error");
    if (errorParam === "invalid" || errorParam === "expired") {
      setError("That sign-in link is invalid or expired. Please sign in with your password.");
    } else if (errorParam === "google-not-configured") {
      setError("Google sign-in is not configured yet. Please use email and password below.");
    } else if (errorParam === "google-failed") {
      setError("Google sign-in failed. Please try again or use email.");
    }
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setError("");

    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    if (isCreatingProfile && !name.trim()) {
      setError("Enter your name to create a profile.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          name: isCreatingProfile ? name.trim() : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) {
        if (!isCreatingProfile && data.error === "Incorrect email or password.") {
          setError("Incorrect password, or no account yet? Click 'Create a profile' below.");
        } else {
          setError(data.error || "Unable to sign in. Please try again.");
        }
        return;
      }
      router.push(data.redirectTo || "/tracker");
      router.refresh();
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">
          {isCreatingProfile ? "Get started" : "Welcome back"}
        </p>
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-[-0.04em] text-[#e5eee3]">
          {isCreatingProfile ? "Create your profile" : "Sign in to dailyroll"}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-[#93a495]">
          {isCreatingProfile ? "Save your daily bonus roll in one place." : "Your next small win is waiting."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <a
          href="/api/auth/google"
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#344d3b] bg-[#223128] text-xs sm:text-sm font-semibold text-[#d6e4d5] transition hover:border-[#608363] hover:bg-[#2a3d30]"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M21.35 12.23c0-.79-.07-1.55-.2-2.28H12v4.31h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" />
            <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.04H3.28v2.53A9.74 9.74 0 0 0 12 21.75Z" />
            <path fill="#FBBC05" d="M6.53 13.82a5.85 5.85 0 0 1 0-3.64V7.65H3.28a9.75 9.75 0 0 0 0 8.7l3.25-2.53Z" />
            <path fill="#EA4335" d="M12 6.14c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.22 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.72 5.4l3.25 2.53C7.3 7.86 9.46 6.14 12 6.14Z" />
          </svg>
          Google
        </a>
        <button
          type="button"
          onClick={() => setError("Facebook sign-in isn't available yet. Use email and password below.")}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#344d3b] bg-[#223128] text-xs sm:text-sm font-semibold text-[#d6e4d5] transition hover:border-[#608363] hover:bg-[#2a3d30]"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.86v-8.4H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.93-1.95 1.87V12h3.32l-.53 3.46h-2.79v8.4A12 12 0 0 0 24 12Z" />
            <path fill="#fff" d="M16.67 15.46 17.2 12h-3.32V9.76c0-.94.46-1.87 1.95-1.87h1.51V4.94s-1.37-.24-2.68-.24c-2.74 0-4.53 1.66-4.53 4.66V12H7.08v3.46h3.04v8.4a12.12 12.12 0 0 0 3.76 0v-8.4h2.79Z" />
          </svg>
          Facebook
        </button>
      </div>

      <div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#819487]">
        <span className="h-px flex-1 bg-[#304438]" /> or continue with email <span className="h-px flex-1 bg-[#304438]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {isCreatingProfile && (
          <div>
            <label htmlFor="name-input" className="mb-1.5 block text-xs font-semibold text-[#b7cbb8]">
              Your Name
            </label>
            <input
              id="name-input"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Alex"
              className="h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-4 text-sm text-[#e0ece0] outline-none transition placeholder:text-[#718275] focus:border-[#78ae7e] focus:ring-2 focus:ring-[#294a31]"
            />
          </div>
        )}
        <div>
          <label htmlFor="email-input" className="mb-1.5 block text-xs font-semibold text-[#b7cbb8]">
            Email Address
          </label>
          <input
            id="email-input"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-4 text-sm text-[#e0ece0] outline-none transition placeholder:text-[#718275] focus:border-[#78ae7e] focus:ring-2 focus:ring-[#294a31]"
          />
        </div>
        <div>
          <label htmlFor="password-input" className="mb-1.5 block text-xs font-semibold text-[#b7cbb8]">
            Password
          </label>
          <input
            id="password-input"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isCreatingProfile ? "Choose a password" : "Enter your password"}
            className="h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-4 text-sm text-[#e0ece0] outline-none transition placeholder:text-[#718275] focus:border-[#78ae7e] focus:ring-2 focus:ring-[#294a31]"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#79b77f] text-sm font-semibold text-[#122519] shadow-[0_8px_18px_rgba(44,100,57,0.25)] transition hover:bg-[#91c991] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Processing..." : isCreatingProfile ? "Create profile" : "Sign in"}
          <ArrowRight size={16} />
        </button>

        {error && (
          <p role="alert" className="text-center text-xs text-[#e69b91] bg-red-950/30 border border-red-900/40 rounded-lg p-2 mt-2">
            {error}
          </p>
        )}
      </form>

      <button
        type="button"
        onClick={() => {
          setIsCreatingProfile((creating) => !creating);
          setError("");
        }}
        className="mt-4 w-full text-center text-xs font-semibold text-[#9bcf9c] hover:text-[#d0edc9] transition"
      >
        {isCreatingProfile ? "Already have a profile? Sign in" : "New to dailyroll? Create a profile"}
      </button>

      <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#91a595]">
        <LockKeyhole size={13} /> Secure sign-in
      </div>
    </>
  );
}

export function SignInForm() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-[#93a495]">Loading sign-in form...</p>}>
      <SignInFormComponent />
    </Suspense>
  );
}

