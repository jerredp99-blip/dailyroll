"use client";

import { Dices, Sparkles } from "lucide-react";
import Link from "next/link";
import { SignInForm } from "@/app/components/SignInForm";

export function AuthCard() {
  return (
    <div className="relative w-full max-w-[430px] min-w-[290px] mx-auto">
      {/* Background atmospheric glow */}
      <div className="absolute -inset-2 rounded-3xl bg-emerald-500/10 blur-xl pointer-events-none" />

      {/* Main card container */}
      <div className="relative rounded-2xl border border-emerald-500/25 bg-zinc-900/90 p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(16,185,129,0.15)] backdrop-blur-md">
        {/* Card Header */}
        <div className="mb-5 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-2.5 transition hover:opacity-90 cursor-pointer"
            aria-label="Daily Roll home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-zinc-950 shadow-[0_4px_14px_rgba(16,185,129,0.4)]">
              <Dices size={22} strokeWidth={2.3} />
            </span>
            <span className="font-bold text-2xl tracking-tight text-white">
              Daily <span className="text-emerald-400">Roll</span>
            </span>
          </Link>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-zinc-950/80 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            <Sparkles size={12} className="text-amber-400" />
            <span>Daily bonus tracker & feed</span>
          </div>
        </div>

        {/* Embedded form */}
        <SignInForm />
      </div>
    </div>
  );
}

