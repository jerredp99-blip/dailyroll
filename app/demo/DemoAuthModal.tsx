"use client";

import React, { useEffect, useState, useRef, FormEvent } from "react";
import { createPortal } from "react-dom";
import { X, ShieldCheck, Sparkles, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export interface DemoAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerContext?: string | null;
}

export function DemoAuthModal({ isOpen, onClose, triggerContext }: DemoAuthModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authMode, setAuthMode] = useState<"choose" | "signup" | "login">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setError("");
      setIsSubmitting(false);
      setAuthMode("choose");
    }
  }, [isOpen]);

  async function handleEmailAuth(e: FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setError("");

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter a password.");
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
          name: authMode === "signup" ? (name.trim() || normalizedEmail.split("@")[0]) : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to complete request. Please try again.");
        return;
      }

      router.push("/tracker");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-[#091510] border border-emerald-500/30 rounded-2xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(16,185,129,0.2)] flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Action Intercept Context Badge */}
        {triggerContext && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold w-fit">
            <Sparkles size={13} className="text-amber-400" />
            <span>{triggerContext}</span>
          </div>
        )}

        {/* Modal Header & Subheader */}
        <div>
          <h2
            id="auth-modal-title"
            className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug"
          >
            Save your reset timers across phone & desktop
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Sign up in 10 seconds to track your claims, sync timers across devices, and receive instant drop-code alerts.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-800/50 bg-rose-950/40 p-2.5 text-xs text-rose-200 animate-in fade-in duration-150">
            <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <span className="break-words flex-1">{error}</span>
          </div>
        )}

        {/* Primary CTA: Google Auth */}
        {authMode === "choose" ? (
          <div className="space-y-3 pt-1">
            <a
              href="/api/auth/google"
              className="w-full h-11 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 hover:from-zinc-750 hover:to-zinc-850 border-t border-zinc-750 border-x border-b border-zinc-950 text-white text-sm font-bold shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M21.35 12.23c0-.79-.07-1.55-.2-2.28H12v4.31h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"
                />
                <path
                  fill="#34A853"
                  d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.04H3.28v2.53A9.74 9.74 0 0 0 12 21.75Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.53 13.82a5.85 5.85 0 0 1 0-3.64V7.65H3.28a9.75 9.75 0 0 0 0 8.7l3.25-2.53Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6.14c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.22 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.72 5.4l3.25 2.53C7.3 7.86 9.46 6.14 12 6.14Z"
                />
              </svg>
              <span>Continue with Google</span>
            </a>

            {/* Email Signup Button */}
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setError("");
              }}
              className="w-full h-11 rounded-xl bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 hover:brightness-110 active:translate-y-0.5 border-t border-emerald-300/40 text-white text-sm font-black shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Create Free Account (Email)</span>
              <ArrowRight size={16} />
            </button>

            {/* Already have an account link */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setError("");
                }}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer transition-colors"
              >
                Already have an account? Log in
              </button>
            </div>
          </div>
        ) : (
          /* Streamlined Inline Form for Signup / Login */
          <form onSubmit={handleEmailAuth} className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {authMode === "signup" ? "Create Free Account" : "Welcome Back"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("choose");
                  setError("");
                }}
                className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
              >
                ← Other options
              </button>
            </div>

            {authMode === "signup" && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Username (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="LuckyRoller"
                  className="w-full h-9 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-9 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 rounded-xl bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 hover:brightness-110 active:translate-y-0.5 border-t border-emerald-300/40 text-white text-xs font-black shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>{authMode === "signup" ? "Create Free Account & Sync" : "Log In & Continue"}</span>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "signup" ? "login" : "signup");
                  setError("");
                }}
                className="text-[11px] text-zinc-400 hover:text-emerald-300 transition-colors"
              >
                {authMode === "signup" ? "Already have an account? Log in" : "Need an account? Sign up free"}
              </button>
            </div>
          </form>
        )}

        {/* Micro-Trust Copy */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-center gap-2 text-[11px] text-zinc-400">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span>100% Free • No spam • Never misses a daily reload</span>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}

