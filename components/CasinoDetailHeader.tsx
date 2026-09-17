"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { Casino } from "@/types/casino";
import { CasinoLogo } from "@/components/CasinoLogo";
import { TrustpilotStars } from "@/components/TrustpilotStars";
import { BonusLabelBadge } from "@/components/BonusLabelBadge";

function getExternalUrl(url?: string | null): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (!trimmed) return "#";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function CasinoDetailHeader({
  casino,
  isTracked,
  onAddToRollcall,
}: {
  casino: Casino;
  isTracked: boolean;
  onAddToRollcall?: () => void;
}) {
  const rawUrl = casino.affiliateUrl || casino.siteUrl || casino.url;
  const visitUrl = getExternalUrl(rawUrl);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-[#14231b] via-[#0f1914] to-[#0c1410] p-4 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
      {/* Top row: Back link */}
      <div className="flex items-center justify-between gap-3 border-b border-emerald-950 pb-3 sm:pb-4">
        <Link
          href="/tracker"
          className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition"
        >
          <ArrowLeft size={16} className="transition group-hover:-translate-x-1" />
          <span>Back to Rollcall</span>
        </Link>
      </div>

      {/* Main identity & Action section */}
      <div className="mt-4 sm:mt-5 flex flex-col gap-4">
        {/* Left: Casino Logo + Title + Provider + Rating */}
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
          <div className="grid h-14 w-14 sm:h-16 sm:w-16 shrink-0 place-items-center rounded-2xl border border-emerald-800/60 bg-[#1a2f23] p-2 shadow-inner">
            <CasinoLogo
              name={casino.name}
              siteUrl={casino.siteUrl}
              className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
              fallbackClassName="text-lg sm:text-xl font-black text-emerald-400"
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                {casino.name}
              </h1>
              {casino.provider && (
                <span className="rounded-full border border-emerald-700/50 bg-[#13261b] px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                  {casino.provider}
                </span>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <TrustpilotStars rating={casino.trustpilotRating} className="text-sm" />
                {casino.trustpilotRating && (
                  <span className="font-semibold text-gray-300">
                    {Number(casino.trustpilotRating).toFixed(1)}
                  </span>
                )}
              </div>

              {typeof casino.currentBalance === "number" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-950/40 border border-blue-500/30 text-blue-400 font-mono text-[11px] font-bold shrink-0 shadow-sm">
                  <Wallet className="w-3 h-3 text-blue-400/70 shrink-0" />
                  {casino.currentBalance.toFixed(2)} SC
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Full-width Primary Action Buttons */}
        <div className="w-full flex flex-col gap-2.5 mt-1">
          {rawUrl && (
            <a
              href={visitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 rounded-xl inline-flex items-center justify-center gap-2 font-black text-sm tracking-wide text-white bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 border-t border-emerald-300/50 border-x border-b border-emerald-900 shadow-[0_4px_14px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.35),0_2px_0_rgba(6,78,59,1)] hover:brightness-110 active:translate-y-0.5 active:shadow-[0_1px_4px_rgba(16,185,129,0.25)] transition-all select-none cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-white stroke-[2.5] shrink-0" />
              <span>Visit {casino.name}</span>
            </a>
          )}

          {!isTracked && onAddToRollcall && (
            <button
              type="button"
              onClick={onAddToRollcall}
              className="w-full h-11 rounded-xl flex items-center justify-center gap-2 border border-emerald-600/70 bg-[#193323] text-xs sm:text-sm font-bold text-emerald-200 hover:bg-[#22442f] hover:text-white transition shadow-[0_4px_16px_rgba(0,0,0,0.3)] cursor-pointer"
            >
              <Plus size={16} />
              <span>Add to My Rollcall</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CasinoDetailHeader;
