"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Loader2, LockKeyhole, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function SignInFormComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams?.get("redirect") || "/tracker";
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
      const target = redirectTarget || data.redirectTo || "/tracker";
      router.push(target);
      router.refresh();
    } catch {
      setError("Unable to connect to server. Please check your network and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-5 text-left">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">
          {isCreatingProfile ? "Get started" : "Welcome back"}
        </p>
        <h2 className="font-serif text-2xl font-semibold tracking-[-0.04em] text-[#e5eee3] sm:text-3xl">
          {isCreatingProfile ? "Create your profile" : "Sign in to dailyroll"}
        </h2>
        <p className="mt-1 text-xs text-[#93a495] sm:text-sm">
          {isCreatingProfile ? "Save your daily bonus roll in one place." : "Your next small win is waiting."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a
          href="/api/auth/google"
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#344d3b] bg-[#1a2920] px-2 text-xs font-semibold text-[#d6e4d5] transition hover:border-[#608363] hover:bg-[#23382c] min-w-0"
        >
          <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M21.35 12.23c0-.79-.07-1.55-.2-2.28H12v4.31h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" />
            <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.04H3.28v2.53A9.74 9.74 0 0 0 12 21.75Z" />
            <path fill="#FBBC05" d="M6.53 13.82a5.85 5.85 0 0 1 0-3.64V7.65H3.28a9.75 9.75 0 0 0 0 8.7l3.25-2.53Z" />
            <path fill="#EA4335" d="M12 6.14c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.22 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.72 5.4l3.25 2.53C7.3 7.86 9.46 6.14 12 6.14Z" />
          </svg>
          <span className="truncate">Google</span>
        </a>
        <button
          type="button"
          onClick={() => setError("Facebook sign-in isn't available yet. Use email and password below.")}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#344d3b] bg-[#1a2920] px-2 text-xs font-semibold text-[#d6e4d5] transition hover:border-[#608363] hover:bg-[#23382c] min-w-0"
        >
          <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.86v-8.4H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.93-1.95 1.87V12h3.32l-.53 3.46h-2.79v8.4A12 12 0 0 0 24 12Z" />
            <path fill="#fff" d="M16.67 15.46 17.2 12h-3.32V9.76c0-.94.46-1.87 1.95-1.87h1.51V4.94s-1.37-.24-2.68-.24c-2.74 0-4.53 1.66-4.53 4.66V12H7.08v3.46h3.04v8.4a12.12 12.12 0 0 0 3.76 0v-8.4h2.79Z" />
          </svg>
          <span className="truncate">Facebook</span>
        </button>
      </div>

      <div className="my-4 flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#819487]">
        <span className="h-px flex-1 bg-[#2b4434]" />
        <span className="truncate">or with email</span>
        <span className="h-px flex-1 bg-[#2b4434]" />
      </div>

      {/* Dedicated Inline Dismissible Error Banner */}
      {error && (
        <div
          role="alert"
          className="mb-3.5 flex items-start justify-between gap-2 rounded-xl border border-rose-800/50 bg-rose-950/40 p-3 text-xs text-rose-200 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle size={15} className="text-rose-400 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-400 hover:text-white shrink-0 p-0.5 rounded transition"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {isCreatingProfile && (
          <div>
            <label htmlFor="name-input" className="mb-1 block text-xs font-semibold text-[#b7cbb8]">
              Your Name
            </label>
            <input
              id="name-input"
              type="text"
              required
              disabled={isSubmitting}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Alex"
              className="h-10 sm:h-11 w-full rounded-xl border border-[#344d3b] bg-[#101a14] px-3.5 text-sm text-[#e0ece0] outline-none transition placeholder:text-[#586c5e] focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        )}
        <div>
          <label htmlFor="email-input" className="mb-1 block text-xs font-semibold text-[#b7cbb8]">
            Email Address
          </label>
          <input
            id="email-input"
            type="email"
            required
            disabled={isSubmitting}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-10 sm:h-11 w-full rounded-xl border border-[#344d3b] bg-[#101a14] px-3.5 text-sm text-[#e0ece0] outline-none transition placeholder:text-[#586c5e] focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label htmlFor="password-input" className="mb-1 block text-xs font-semibold text-[#b7cbb8]">
            Password
          </label>
          <input
            id="password-input"
            type="password"
            required
            disabled={isSubmitting}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isCreatingProfile ? "Choose a password" : "Enter your password"}
            className="h-10 sm:h-11 w-full rounded-xl border border-[#344d3b] bg-[#101a14] px-3.5 text-sm text-[#e0ece0] outline-none transition placeholder:text-[#586c5e] focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-sm font-bold text-white shadow-[0_8px_18px_rgba(44,100,57,0.25)] transition hover:from-emerald-500 hover:to-teal-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>{isCreatingProfile ? "Creating profile..." : "Signing in..."}</span>
            </>
          ) : (
            <>
              <span>{isCreatingProfile ? "Create profile & sign in" : "Sign in"}</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => {
          setIsCreatingProfile((creating) => !creating);
          setError("");
        }}
        className="mt-4 w-full text-center text-xs font-semibold text-[#9bcf9c] hover:text-[#d0edc9] transition disabled:opacity-50"
      >
        {isCreatingProfile ? "Already have a profile? Sign in" : "New to dailyroll? Create a profile"}
      </button>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#819487]">
        <LockKeyhole size={13} className="text-emerald-400" />
        <span>Secure authentication</span>
      </div>
    </div>
  );
}

export function SignInForm() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-[#93a495]">Loading sign-in form...</p>}>
      <SignInFormComponent />
    </Suspense>
  );
}

