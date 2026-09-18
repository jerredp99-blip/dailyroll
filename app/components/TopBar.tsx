"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/app/components/Logo";
import { Settings, ShieldCheck, LogOut, Compass, Wallet, MessageSquare } from "lucide-react";
import { BalancesIntroTooltip } from "@/components/BalancesIntroTooltip";
import { ActionNav } from "@/components/ActionNav";
import { useActiveDropsCount } from "@/lib/dropsStore";
import { useHeartbeat } from "@/hooks/useHeartbeat";

type SignedInUser = {
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const unclaimedBonusDropsCount = useActiveDropsCount();
  const [signedInUser, setSignedInUser] = useState<SignedInUser | null>(null);
  useHeartbeat(signedInUser?.email);
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [scTotals, setScTotals] = useState<{ available: number; claimedToday: number; totalPortfolioBalance?: number } | null>(null);
  const [isBalancesTooltipOpen, setIsBalancesTooltipOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close account menu on click outside or escape key
  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  // Close menu on route change
  useEffect(() => {
    setIsAccountMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear state even if request fails
    }
    setSignedInUser(null);
    setIsAdmin(false);
    setIsAccountMenuOpen(false);
    router.replace("/sign-in");
  };

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

  // Check onboarding tooltip eligibility for Balances button
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("dailyroll_balances_tooltip_dismissed");
      if (dismissed === "true") {
        setIsBalancesTooltipOpen(false);
        return;
      }
      if (typeof scTotals?.totalPortfolioBalance === "number" && scTotals.totalPortfolioBalance >= 3.0) {
        setIsBalancesTooltipOpen(true);
      }
    } catch {
      // Ignore
    }
  }, [scTotals?.totalPortfolioBalance]);

  const handleDismissBalancesTooltip = useCallback(() => {
    setIsBalancesTooltipOpen(false);
    try {
      localStorage.setItem("dailyroll_balances_tooltip_dismissed", "true");
    } catch {
      // Ignore
    }
  }, []);

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

        {/* Centered Available & Claimed SC Motivation Badge (Acts as button to /balances) */}
        {pathname === "/tracker" && scTotals && (
          <div className="relative flex flex-col items-center shrink-0">
            <Link
              href="/balances"
              onClick={handleDismissBalancesTooltip}
              title="Click to view Casino Balances & Cashout Manager"
              className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/60 hover:bg-zinc-850/90 shadow-lg shadow-black/40 backdrop-blur-md shrink-0 select-none cursor-pointer transition-all active:scale-[0.98] group"
            >
              {/* Available SC (The Reward / Call-to-Action) */}
              <div className="flex flex-col items-center leading-tight">
                <span
                  className={`font-mono text-xs sm:text-base tracking-tight ${
                    scTotals.available > 0
                      ? "text-emerald-400 font-black drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                      : "text-zinc-400 font-extrabold"
                  }`}
                >
                  {scTotals.available.toFixed(2)} SC
                </span>
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/80 mt-0.5 group-hover:text-emerald-300">
                  <span className="hidden sm:inline">READY TO CLAIM</span>
                  <span className="sm:hidden">AVAIL</span>
                </span>
              </div>

              {/* Vertical Divider */}
              <div className="h-6 w-px bg-zinc-700/60 mx-0.5 shrink-0" />

              {/* Claimed SC (The Daily Streak / Score) */}
              <div className="flex flex-col items-center leading-tight">
                <span className="text-zinc-100 font-extrabold font-mono text-xs sm:text-base tracking-tight">
                  {scTotals.claimedToday.toFixed(2)} SC
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5 group-hover:text-zinc-300">
                  <span className="hidden sm:inline">CLAIMED TODAY</span>
                  <span className="sm:hidden">SECURED</span>
                </span>
              </div>
            </Link>

            <BalancesIntroTooltip
              isOpen={isBalancesTooltipOpen}
              onDismiss={handleDismissBalancesTooltip}
            />
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3.5 transition-all shrink-0">
          {(signedInUser || isAdmin) && (
            <div className="flex items-center">
              <ActionNav unclaimedBonusDropsCount={unclaimedBonusDropsCount} />
            </div>
          )}
          {(signedInUser || isAdmin) && pathname !== "/tracker" && (
            <Link
              href="/tracker"
              className="text-xs sm:text-sm font-semibold text-[#9bcf9c] hover:text-[#c2e4bd]"
            >
              Rollcall
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
          {(signedInUser || isAdmin) ? (
            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                title={signedInUser?.name ? `${signedInUser.name} (Account Menu)` : "Account Menu"}
                aria-label="Account Menu"
                className={`relative flex items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
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
              </button>

              {/* Account Dropdown Menu */}
              {isAccountMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-emerald-500/40 bg-zinc-950/98 p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  role="menu"
                >
                  <div className="px-3 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/20 mb-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      {isAdmin ? "Admin Account" : "Signed in as"}
                    </p>
                    <p className="truncate text-sm font-extrabold text-white mt-0.5">
                      {isAdmin ? "Administrator" : signedInUser?.name || "Player"}
                    </p>
                    {signedInUser?.email && !isAdmin && (
                      <p className="truncate text-xs font-medium text-emerald-200/90 mt-0.5">
                        {signedInUser.email}
                      </p>
                    )}
                  </div>

                  <div className="py-1 space-y-1 text-xs font-bold">
                    <Link
                      href="/balances"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all ${
                        pathname === "/balances"
                          ? "bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/40"
                          : "text-white hover:text-emerald-300 hover:bg-emerald-500/15"
                      }`}
                      role="menuitem"
                    >
                      <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Casino Balances</span>
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all ${
                        pathname === "/profile"
                          ? "bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/40"
                          : "text-white hover:text-emerald-300 hover:bg-emerald-500/15"
                      }`}
                      role="menuitem"
                    >
                      <Settings className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Profile & Settings</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/dashboard"
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-amber-300 font-extrabold hover:text-amber-100 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
                        role="menuitem"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Admin Workspace</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        if (pathname === "/tracker") {
                          window.dispatchEvent(new CustomEvent("dailyroll_open_feed"));
                        } else {
                          router.push("/tracker?feed=open");
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-white hover:text-emerald-300 hover:bg-emerald-500/15 transition-all text-left cursor-pointer"
                      role="menuitem"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Chat</span>
                    </button>

                    <Link
                      href="/tracker"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all ${
                        pathname === "/tracker"
                          ? "bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/40"
                          : "text-white hover:text-emerald-300 hover:bg-emerald-500/15"
                      }`}
                      role="menuitem"
                    >
                      <Compass className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>Rollcall</span>
                    </Link>
                  </div>

                  <div className="border-t border-emerald-500/20 pt-2 mt-1.5">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 transition-all text-left cursor-pointer"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            pathname !== "/sign-in" && pathname !== "/" && pathname !== "/login" && (
              <Link
                href="/sign-in"
                className="text-xs sm:text-sm font-extrabold text-white hover:text-emerald-300 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/50 shadow-[0_2px_10px_rgba(16,185,129,0.3)] rounded-xl px-4 py-2 transition-all cursor-pointer"
              >
                Sign in
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}