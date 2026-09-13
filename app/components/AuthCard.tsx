"use client";

import { Dices, Sparkles } from "lucide-react";
import Link from "next/link";
import { SignInForm } from "@/app/components/SignInForm";

export function AuthCard() {
  return (
    <div className="relative w-full max-w-[430px] min-w-[300px] px-2 sm:px-0">
      {/* Background atmospheric glow */}
      <div className="absolute -inset-2 rounded-3xl bg-emerald-700/10 blur-xl pointer-events-none" />

      {/* Main card container */}
      <div className="relative rounded-2xl border border-emerald-800/30 bg-[#14221a]/95 p-5 shadow-2xl backdrop-blur sm:p-8">
        {/* Card Header */}
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-3 transition hover:opacity-90"
            aria-label="dailyroll home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#a9dba9] to-[#4f8f5b] text-[#0e1f14] shadow-[0_8px_20px_rgba(83,151,96,0.28)]">
              <Dices size={22} strokeWidth={2.3} />
            </span>
            <span className="font-bold text-2xl tracking-[-0.06em] text-[#e1ece0]">
              daily<span className="text-[#9bcf9c]">roll</span>
            </span>
          </Link>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/40 bg-[#122018] px-3 py-1 text-[11px] font-semibold text-emerald-300">
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
