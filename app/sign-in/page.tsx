import { Suspense } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { SignInForm } from "@/app/components/SignInForm";

export default async function SignInPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/tracker");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#101815] text-[#e6eee5]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(55,103,71,0.32),transparent_28%),radial-gradient(circle_at_88%_82%,rgba(156,113,47,0.18),transparent_27%)]" />
      <div className="absolute -right-28 top-[-9rem] h-[28rem] w-[28rem] rounded-full border-[42px] border-[#1c3026] opacity-80" />
      <div className="absolute -bottom-48 -left-32 h-[32rem] w-[32rem] rounded-full border-[56px] border-[#17271f] opacity-90" />

      <section className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-16 px-6 pb-14 pt-10 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24 lg:px-16 lg:pb-20">
        <div className="max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#2d4a35] bg-[#18271f]/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a4c5a0] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e5b85d]" /> Your daily wins, organized
          </div>
          <h1 className="max-w-lg font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#edf4ea] sm:text-7xl">
            Make every day a little more rewarding.
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-[#9aa99c] sm:text-lg">
            Keep your daily bonuses in one calm, simple place. Never miss a check-in, and watch the small wins add up.
          </p>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-[#9eb4a0]">
            <span className="flex items-center gap-2">
              <Check size={16} className="text-[#9bcf9c]" /> One-tap check-ins
            </span>
            <span className="flex items-center gap-2">
              <Check size={16} className="text-[#9bcf9c]" /> Private by design
            </span>
          </div>
          <Link
            href="/"
            className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-[#9bcf9c] hover:text-[#c2e4bd]"
          >
            ← Back to home
          </Link>
        </div>

        <div className="relative mx-auto w-full max-w-[440px]">
          <div className="absolute -inset-3 rounded-[2rem] bg-[#294631]/30 shadow-[0_28px_70px_rgba(0,0,0,0.28)] blur-xl" />
          <div className="relative rounded-[1.75rem] border border-[#2b4434] bg-[#19251f]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.32)] backdrop-blur sm:p-8">
            <SignInForm />
          </div>
        </div>
      </section>
    </main>
  );
}