"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, Mail, User, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function SignInFormComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [tab, setTab] = useState<"signin" | "register">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && (data?.user || data?.isAdmin) && pathname === "/sign-in") {
          router.replace("/tracker");
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    const errorParam = searchParams?.get("error");
    if (errorParam === "invalid" || errorParam === "expired") {
      setError("That sign-in link is invalid or expired. Please sign in with your password.");
    } else if (errorParam === "google-not-configured") {
      setError("Google sign-in is not configured. Please use email and password.");
    } else if (errorParam === "google-failed") {
      setError("Google sign-in failed. Please try again or use email.");
    }
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setError("");

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (tab === "register" && !name.trim()) {
      setError("Please enter your name.");
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
          name: tab === "register" ? name.trim() : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) {
        if (tab === "signin" && data.error === "Incorrect email or password.") {
          setError("Incorrect password, or no account yet. Try the 'Create Account' tab above!");
        } else {
          setError(data.error || "Unable to sign in. Please try again.");
        }
        return;
      }
      router.push(data.redirectTo || "/tracker");
      router.refresh();
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      {/* Animated Segmented Tab Switcher */}
      <div className="relative flex rounded-xl bg-[#0f1913] p-1 border border-[#243a2c] mb-6 select-none">
        {/* Sliding Indicator Pill */}
        <div
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-r from-[#244330] to-[#2f553d] border border-emerald-500/40 shadow-lg shadow-emerald-950/50 transition-all duration-300 ease-out"
          style={{
            left: tab === "signin" ? "4px" : "calc(50%)",
          }}
        />

        {/* Sign In Button */}
        <button
          type="button"
          onClick={() => {
            setTab("signin");
            setError("");
          }}
          className={`relative z-10 flex flex-1 items-center justify-center py-2.5 text-xs font-semibold transition-colors duration-200 ${
            tab === "signin" ? "text-white" : "text-[#7f9884] hover:text-[#b0cdb5]"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 transition-all duration-300 ${
              tab === "signin" ? "scale-100 opacity-100" : "scale-0 opacity-0 w-0 mr-0"
            }`}
          />
          Sign In
        </button>

        {/* Create Account Button */}
        <button
          type="button"
          onClick={() => {
            setTab("register");
            setError("");
          }}
          className={`relative z-10 flex flex-1 items-center justify-center py-2.5 text-xs font-semibold transition-colors duration-200 ${
            tab === "register" ? "text-white" : "text-[#7f9884] hover:text-[#b0cdb5]"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 transition-all duration-300 ${
              tab === "register" ? "scale-100 opacity-100" : "scale-0 opacity-0 w-0 mr-0"
            }`}
          />
          Create Account
        </button>
      </div>

      {/* Header text with gentle crossfade */}
      <div className="mb-6 transition-all duration-300">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-[#e5eee3]">
          {tab === "signin" ? "Welcome back" : "Start your daily roll"}
        </h2>
        <p className="mt-1 text-xs text-[#93a495]">
          {tab === "signin"
            ? "Sign in to track your bonuses and reset timers."
            : "Keep your daily sweepstakes bonuses all in one place."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Animated Name Field (smooth slide in / out) */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            tab === "register"
              ? "max-h-24 opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          <label
            htmlFor="landing-name"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#b7cbb8]"
          >
            <User size={13} className="text-[#78ae7e]" /> Name
          </label>
          <input
            id="landing-name"
            type="text"
            tabIndex={tab === "register" ? 0 : -1}
            required={tab === "register"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-11 w-full rounded-xl border border-[#2e4735] bg-[#101914] px-3.5 text-sm text-[#e0ece0] outline-none transition placeholder:text-[#5f7363] focus:border-[#78ae7e] focus:ring-2 focus:ring-[#78ae7e]/20"
          />
        </div>

        <div>
          <label
            htmlFor="landing-email"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#b7cbb8]"
          >
            <Mail size={13} className="text-[#78ae7e]" /> Email Address
          </label>
          <input
            id="landing-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full rounded-xl border border-[#2e4735] bg-[#101914] px-3.5 text-sm text-[#e0ece0] outline-none transition placeholder:text-[#5f7363] focus:border-[#78ae7e] focus:ring-2 focus:ring-[#78ae7e]/20"
          />
        </div>

        <div>
          <label
            htmlFor="landing-password"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#b7cbb8]"
          >
            <LockKeyhole size={13} className="text-[#78ae7e]" /> Password
          </label>
          <input
            id="landing-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tab === "register" ? "Create a secure password" : "Enter your password"}
            className="h-11 w-full rounded-xl border border-[#2e4735] bg-[#101914] px-3.5 text-sm text-[#e0ece0] outline-none transition placeholder:text-[#5f7363] focus:border-[#78ae7e] focus:ring-2 focus:ring-[#78ae7e]/20"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#68a66e] to-[#79b77f] text-sm font-semibold text-[#0d1c12] shadow-[0_4px_14px_rgba(40,90,50,0.3)] transition-all duration-200 hover:from-[#76b77c] hover:to-[#8ac890] hover:shadow-[0_6px_18px_rgba(40,90,50,0.4)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            "Processing..."
          ) : tab === "register" ? (
            <>Create Profile <ArrowRight size={15} /></>
          ) : (
            <>Sign In <ArrowRight size={15} /></>
          )}
        </button>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-900/40 bg-red-950/30 p-2.5 text-center text-xs text-red-200 animate-in fade-in duration-200"
          >
            {error}
          </div>
        )}
      </form>

      <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#78907e]">
        <ShieldCheck size={13} className="text-[#78ae7e]" />
        <span>Private & secure session</span>
      </div>
    </div>
  );
}

export function SignInForm() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-[#809984]">
          Loading form...
        </div>
      }
    >
      <SignInFormComponent />
    </Suspense>
  );
}
