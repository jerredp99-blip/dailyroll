"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/app/components/Logo";

type SignedInUser = {
  name: string;
  email: string;
};

export function TopBar() {
  const pathname = usePathname();
  const [signedInUser, setSignedInUser] = useState<SignedInUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Re-sync session state whenever navigation happens, since this bar stays
  // mounted across route changes in the shared layout.
  useEffect(() => {
    let cancelled = false;
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

  return (
    <header className="sticky top-0 z-30 border-b border-[#1e2f24]/80 bg-[#101815]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-10 lg:px-16">
        <Logo />
        <div className="flex items-center gap-3">
          {(signedInUser || isAdmin) && pathname !== "/tracker" && (
            <Link
              href="/tracker"
              className="text-sm font-semibold text-[#9bcf9c] hover:text-[#c2e4bd]"
            >
              Feed & Tracker
            </Link>
          )}
          {(signedInUser || isAdmin) && pathname !== "/profile" && (
            <Link
              href="/profile"
              className="hidden text-sm font-semibold text-[#8ca892] hover:text-[#c2e4bd] sm:block"
            >
              Profile
            </Link>
          )}
          {isAdmin && pathname !== "/dashboard" && (
            <Link
              href="/dashboard"
              className="hidden text-sm font-semibold text-amber-300 hover:text-amber-200 sm:block"
            >
              Admin
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