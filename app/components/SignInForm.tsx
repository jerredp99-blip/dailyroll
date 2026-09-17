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
          setError("Incorrect password, or no account yet? Click 'Create Account' above.");
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
      {/* Tactile Segmented Pill Toggle */}
      <div className="mb-4 grid grid-cols-2 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs font-bold select-none">
        <button
          type="button"
          onClick={() => {
            setIsCreatingProfile(false);
            setError("");
          }}
          className={`py-1.5 rounded-lg transition-all cursor-pointer ${
            !isCreatingProfile
              ? "bg-gradient-to-b from-zinc-800 to-zinc-900 text-emerald-400 border border-emerald-500/30 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setIsCreatingProfile(true);
            setError("");
          }}
          className={`py-1.5 rounded-lg transition-all cursor-pointer ${
            isCreatingProfile
              ? "bg-gradient-to-b from-zinc-800 to-zinc-900 text-emerald-400 border border-emerald-500/30 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Create Account
        </button>
      </div>

      <div className="mb-4 text-left">
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">
          {isCreatingProfile ? "Get started" : "Welcome back"}
        </p>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          {isCreatingProfile ? "Create your profile" : "Sign in to Daily Roll"}
        </h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          {isCreatingProfile ? "Save your daily bonus roll in one place." : "Your next daily bonus is waiting."}
        </p>
      </div>

      {/* Prominent Full-Width Google OAuth Button */}
      <div className="mb-3">
        <a
          href="/api/auth/google"
          className="w-full h-10 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 border-t border-zinc-700/60 border-x border-b border-zinc-950 text-zinc-100 text-xs font-bold shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-0.5 transition-all flex items-center justify-center gap-2.5 cursor-pointer min-w-0"
        >
          <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M21.35 12.23c0-.79-.07-1.55-.2-2.28H12v4.31h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" />
            <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.04H3.28v2.53A9.74 9.74 0 0 0 12 21.75Z" />
            <path fill="#FBBC05" d="M6.53 13.82a5.85 5.85 0 0 1 0-3.64V7.65H3.28a9.75 9.75 0 0 0 0 8.7l3.25-2.53Z" />
            <path fill="#EA4335" d="M12 6.14c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.22 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.72 5.4l3.25 2.53C7.3 7.86 9.46 6.14 12 6.14Z" />
          </svg>
          <span>Continue with Google</span>
        </a>
      </div>

      <div className="my-3.5 flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        <span className="h-px flex-1 bg-zinc-800/80" />
        <span>or with email</span>
        <span className="h-px flex-1 bg-zinc-800/80" />
      </div>

      {/* Dedicated Inline Dismissible Error Banner */}
      {error && (
        <div
          role="alert"
          className="mb-3 flex items-start justify-between gap-2 rounded-xl border border-rose-800/50 bg-rose-950/40 p-2.5 text-xs text-rose-200 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle size={15} className="text-rose-400 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-400 hover:text-white shrink-0 p-0.5 rounded transition cursor-pointer"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {isCreatingProfile && (
          <div>
            <label htmlFor="name-input" className="mb-1 block text-xs font-semibold text-zinc-300">
              Your Name
            </label>
            <input
              id="name-input"
              type="text"
              required
              disabled={isSubmitting}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="h-10 w-full bg-zinc-950/80 border border-emerald-500/20 rounded-xl px-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all disabled:opacity-50"
            />
          </div>
        )}
        <div>
          <label htmlFor="email-input" className="mb-1 block text-xs font-semibold text-zinc-300">
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
            className="h-10 w-full bg-zinc-950/80 border border-emerald-500/20 rounded-xl px-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="password-input" className="mb-1 block text-xs font-semibold text-zinc-300">
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
            className="h-10 w-full bg-zinc-950/80 border border-emerald-500/20 rounded-xl px-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-10 w-full rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 border-t border-emerald-300/60 border-x border-b border-emerald-800/80 shadow-[0_4px_14px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>{isCreatingProfile ? "Creating profile..." : "Signing in..."}</span>
            </>
          ) : (
            <>
              <span>{isCreatingProfile ? "Create profile & sign in" : "Sign in"}</span>
              <ArrowRight size={14} />
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
        className="mt-3.5 w-full text-center text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer disabled:opacity-50"
      >
        {isCreatingProfile ? "Already have a profile? Sign in" : "New to Daily Roll? Create a profile"}
      </button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
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
