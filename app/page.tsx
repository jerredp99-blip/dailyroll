import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { SignInForm } from "@/app/components/SignInForm";

export default async function Home() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/tracker");
  }

  return (
    <main className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-[#070d0a] text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="absolute right-0 top-1/4 h-[32rem] w-[32rem] rounded-full bg-teal-500/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full bg-amber-500/5 blur-[150px]" />
      </div>

      <div className="relative mx-auto flex-1 w-full max-w-6xl min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row items-center justify-between gap-8 px-4 sm:px-8 py-6">
        {/* Left Column (Hero & Preview) */}
        <div className="flex flex-col justify-center max-w-xl mx-auto lg:mx-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-zinc-900/80 px-3.5 py-1 text-xs font-semibold text-emerald-300 shadow-sm backdrop-blur w-fit">
              <Sparkles size={13} className="text-amber-400" />
              <span>Your daily wins, organized</span>
            </div>

            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 shadow-sm backdrop-blur transition-all"
            >
              <span>🎮 Live Demo Preview ↗</span>
            </Link>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none">
            Never miss a daily bonus again.
          </h1>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-zinc-400">
            Track daily login rewards, cooldown timers, and sweepstakes drops across all your favorite platforms in one calm, simple place.
          </p>

          {/* Genuine Mini Rollcall Preview Cards */}
          <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {/* Crown Coins */}
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-zinc-900/80 p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 font-black text-xs">
                CC
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-white truncate">Crown Coins</p>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </div>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold">
                  1.00 SC Ready
                </span>
              </div>
            </div>

            {/* Stake.us */}
            <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 shadow-sm backdrop-blur opacity-85">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 font-black text-xs">
                ST
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">Stake.us</p>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-semibold">
                  Reset in 4h
                </span>
              </div>
            </div>

            {/* Pulsz */}
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-zinc-900/80 p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 font-black text-xs">
                PZ
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-white truncate">Pulsz</p>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </div>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold">
                  0.30 SC Ready
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Demo Link */}
          <div className="mt-3.5">
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors"
            >
              <span>Test live interactive dashboard demo with ticking reset timers ↗</span>
            </Link>
          </div>

          {/* Feature Highlights */}
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-400 stroke-[2.5]" /> One-tap bonus claim links
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-400 stroke-[2.5]" /> Built-in countdown timers
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-400 stroke-[2.5]" /> AI bonus offer parser
            </span>
          </div>
        </div>

        {/* Right Column (Interactive Auth Card) */}
        <div className="w-full max-w-md shrink-0 mx-auto lg:mx-0 my-auto">
          <div className="relative rounded-2xl border border-emerald-500/25 bg-zinc-900/90 p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(16,185,129,0.15)] backdrop-blur-md">
            <SignInForm />
          </div>
        </div>
      </div>

      {/* Footer / Legal Notice */}
      <footer className="w-full py-3.5 border-t border-zinc-800/40 bg-zinc-950/60 shrink-0">
        <div className="max-w-2xl mx-auto px-4 space-y-1 text-center text-[10px] text-zinc-500 leading-normal">
          <p>
            <span className="font-semibold text-zinc-400">Affiliate Disclosure:</span> Daily Roll is an informational tracking tool and may receive compensation from affiliate links.
          </p>
          <p>
            <span className="font-semibold text-zinc-400">Responsible Gaming:</span> 21+ only (or 18+ where legally permitted). Daily Roll does not offer real-money gambling. Gambling problem? Call 1-800-GAMBLER.
          </p>
        </div>
      </footer>
    </main>
  );
}