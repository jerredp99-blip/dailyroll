"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/app/components/Logo";

type SignedInUser = {
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export function TopBar() {
  const pathname = usePathname();
  const [signedInUser, setSignedInUser] = useState<SignedInUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [scTotals, setScTotals] = useState<{ available: number; claimedToday: number } | null>(null);

  // Live subscription to tracker SC available and claimed totals
  useEffect(() => {
    try {
      const stored = localStorage.getItem("dailyroll_sc_totals");
      if (stored) {
        setScTotals(JSON.parse(stored));
      } else if (pathname === "/tracker") {
        setScTotals({ available: 0, claimedToday: 0 });
      }
    } catch {
      if (pathname === "/tracker") {
        setScTotals({ available: 0, claimedToday: 0 });
      }
    }

    const handleTotalsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ available: number; claimedToday: number }>;
      if (customEvent.detail) {
        setScTotals(customEvent.detail);
      }
    };

    window.addEventListener("dailyroll_sc_totals", handleTotalsUpdate);
    return () => {
      window.removeEventListener("dailyroll_sc_totals", handleTotalsUpdate);
    };
  }, [pathname]);

  // Re-sync session state whenever navigation happens, since this bar stays
  // mounted across route changes in the shared layout.
  useEffect(() => {
    let cancelled = false;
    setAvatarError(false);
    (async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as {
          user: SignedInUser | null;
          isAdmin: boolean;
        };
        if (cancelled) return;
        setSignedInUser(data.user);
        setIsAdmin(data.isAdmin);
      } catch {
        if (cancelled) return;
        setSignedInUser(null);
        setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const profileInitial = signedInUser?.name
    ? signedInUser.name.charAt(0).toUpperCase()
    : signedInUser?.email
    ? signedInUser.email.charAt(0).toUpperCase()
    : isAdmin
    ? "A"
    : "U";

  return (
    <header className="sticky top-0 z-30 bg-[#070d0a]/90 backdrop-blur-md border-b border-zinc-800/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 py-2.5 sm:px-8 sm:py-4 lg:px-16 min-w-0">
        <Logo className="shrink-0" />

        {/* Centered Available & Claimed SC Motivation Badge */}
        {pathname === "/tracker" && scTotals && (
          <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-lg shadow-black/40 backdrop-blur-md shrink-0 select-none">
            {/* Available SC (The Reward / Call-to-Action) */}
            <div className="flex flex-col items-center leading-tight">
              <span
                className={`font-mono text-sm sm:text-base tracking-tight ${
                  scTotals.available > 0
                    ? "text-emerald-400 font-black drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                    : "text-zinc-400 font-extrabold"
                }`}
              >
                {scTotals.available.toFixed(2)} SC
              </span>
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/80 mt-0.5">
                <span className="hidden sm:inline">READY TO CLAIM</span>
                <span className="sm:hidden">AVAIL</span>
              </span>
            </div>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-zinc-700/60 mx-0.5 shrink-0" />

            {/* Claimed SC (The Daily Streak / Score) */}
            <div className="flex flex-col items-center leading-tight">
              <span className="text-zinc-100 font-extrabold font-mono text-sm sm:text-base tracking-tight">
                {scTotals.claimedToday.toFixed(2)} SC
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5">
                <span className="hidden sm:inline">CLAIMED TODAY</span>
                <span className="sm:hidden">SECURED</span>
              </span>
            </div>
          </div>
        )}

        <div
          className={`flex items-center gap-2 sm:gap-3.5 transition-all shrink-0 ${
            pathname === "/tracker" ? "sm:pr-14" : ""
          }`}
        >
          {(signedInUser || isAdmin) && pathname !== "/tracker" && (
            <Link
              href="/tracker"
              className="text-xs sm:text-sm font-semibold text-[#9bcf9c] hover:text-[#c2e4bd]"
            >
              Feed & Tracker
            </Link>
          )}
          {isAdmin && pathname !== "/dashboard" && (
            <Link
              href="/dashboard"
              className="text-xs sm:text-sm font-semibold text-amber-300 hover:text-amber-200"
            >
              Admin
            </Link>
          )}
          {(signedInUser || isAdmin) && (
            <Link
              href="/profile"
              title={signedInUser?.name ? `${signedInUser.name} (Profile)` : "View Profile"}
              aria-label="View Profile"
              className={`relative flex items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 ${
                pathname === "/profile"
                  ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#101815]"
                  : "hover:ring-2 hover:ring-emerald-500/50 hover:ring-offset-1 hover:ring-offset-[#101815]"
              }`}
            >
              {signedInUser?.avatarUrl && !avatarError ? (
                <img
                  src={signedInUser.avatarUrl}
                  alt={signedInUser.name || "Profile"}
                  onError={() => setAvatarError(true)}
                  className="h-8 w-8 rounded-full object-cover border border-[#2d4a36] shadow-sm"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/40 bg-gradient-to-br from-emerald-800 to-teal-900 text-xs font-bold text-emerald-100 shadow-sm">
                  {profileInitial}
                </div>
              )}
            </Link>
          )}
          {!signedInUser && !isAdmin && pathname !== "/sign-in" && (
            <Link
              href="/sign-in"
              className="text-sm font-semibold text-[#9bcf9c] hover:text-[#c2e4bd]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}