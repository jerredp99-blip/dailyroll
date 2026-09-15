"use client";

export function Footer() {
  return (
    <footer className="w-full border-t border-zinc-800/60 bg-[#0a110e] px-4 py-6 mt-auto">
      <div className="mx-auto max-w-3xl space-y-3 text-center">
        <p className="text-[11px] leading-relaxed text-zinc-500">
          <span className="font-semibold text-zinc-400">Affiliate Disclosure:</span>{" "}
          Daily Roll is an informational tracking tool and may receive compensation from
          affiliate links on this site at no extra cost to you.
        </p>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          <span className="font-semibold text-zinc-400">Responsible Gaming:</span>{" "}
          21+ only (or 18+ where legally permitted). Daily Roll does not offer real-money
          gambling. Free-to-play with no purchase necessary. Gambling problem?{" "}
          <a
            href="tel:1-800-426-2537"
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition"
          >
            Call 1-800-GAMBLER
          </a>
          .
        </p>
        <p className="text-[10px] text-zinc-600">
          © {new Date().getFullYear()} Daily Roll. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
