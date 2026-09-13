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
    <header className="sticky top-0 z-30 border-b border-[#1e2f24]/80 bg-[#101815]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4 lg:px-16">
        <Logo />
        <div
          className={`flex items-center gap-2.5 sm:gap-3.5 transition-all ${
            pathname === "/tracker" ? "pr-12 sm:pr-14" : ""
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
          {(signedInUser || isAdmin) && pathname !== "/tracker" && (
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