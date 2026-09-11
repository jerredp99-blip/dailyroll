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
    const savedUser = localStorage.getItem("dailyroll_user");
    const savedAdmin = localStorage.getItem("dailyroll_admin");
    setSignedInUser(savedUser ? (JSON.parse(savedUser) as SignedInUser) : null);
    setIsAdmin(Boolean(savedAdmin));
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-[#1e2f24]/80 bg-[#101815]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-10 lg:px-16">
        <Logo />
        <div className="flex items-center gap-3">
          {isAdmin && pathname !== "/dashboard" && (
            <Link
              href="/dashboard"
              className="hidden text-sm font-semibold text-[#9bcf9c] hover:text-[#c2e4bd] sm:block"
            >
              Admin dashboard
            </Link>
          )}
          {!signedInUser && !isAdmin && (
            <Link
              href={pathname === "/" ? "#signin" : "/#signin"}
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
