import { ArrowRight, Check, Sparkles } from "lucide-react";
import { SignInForm } from "@/app/components/SignInForm";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0c1410] text-[#e6eee5]">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-emerald-900/15 blur-[120px]" />
        <div className="absolute right-0 top-1/4 h-[32rem] w-[32rem] rounded-full bg-teal-900/10 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full bg-amber-900/10 blur-[140px]" />
      </div>

      <section className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-12 px-6 pb-16 pt-8 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-16">
        {/* Left Hero Column */}
        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-800/40 bg-[#14231b]/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300 shadow-sm backdrop-blur">
            <Sparkles size={13} className="text-amber-400" />
            <span>Your daily wins, organized</span>
          </div>

          <h1 className="font-serif text-[clamp(2.5rem,8vw,4.25rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[#edf5ec]">
            Never miss a daily bonus again.
          </h1>

          <p className="mt-5 text-base leading-7 text-[#9bb09e] sm:text-lg">
            Track daily login rewards, cooldown timers, and sweepstakes drops across all your favorite platforms in one calm, simple place.
          </p>

          {/* Feature Highlights */}
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-[#8ea893] sm:text-sm">
            <span className="flex items-center gap-2">
              <Check size={16} className="text-[#78ae7e]" /> One-tap bonus claim links
            </span>
            <span className="flex items-center gap-2">
              <Check size={16} className="text-[#78ae7e]" /> Built-in countdown timers
            </span>
            <span className="flex items-center gap-2">
              <Check size={16} className="text-[#78ae7e]" /> Private by design
            </span>
          </div>

          {/* Mobile Quick Jump */}
          <div className="mt-8 lg:hidden">
            <a
              href="#sign-in-box"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#79b77f] px-6 text-sm font-semibold text-[#0d1c12] shadow-md transition hover:bg-[#8ec893]"
            >
              Sign In or Register <ArrowRight size={15} />
            </a>
          </div>
        </div>

        {/* Right Form Column */}
        <div id="sign-in-box" className="relative mx-auto w-full max-w-[430px]">
          <div className="absolute -inset-2 rounded-3xl bg-emerald-700/10 blur-xl" />
          <div className="relative rounded-2xl border border-emerald-800/30 bg-[#14221a]/95 p-6 shadow-2xl backdrop-blur sm:p-7">
            <SignInForm />
          </div>
        </div>
      </section>
    </main>
  );
}