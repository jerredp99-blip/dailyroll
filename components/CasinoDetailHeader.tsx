"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  Wallet,
  Pencil,
  X,
} from "lucide-react";
import type { Casino } from "@/types/casino";
import { CasinoLogo } from "@/components/CasinoLogo";
import { TrustpilotStars } from "@/components/TrustpilotStars";
import { apiUpdateCasinoBalance } from "@/lib/api-client";

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
  onUpdateCasino,
  onClose,
}: {
  casino: Casino;
  isTracked: boolean;
  onAddToRollcall?: () => void;
  onUpdateCasino?: (casino: Casino, updates: Partial<Casino>) => void;
  onClose?: () => void;
}) {
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [localBalance, setLocalBalance] = useState<number | null>(casino.currentBalance ?? null);

  useEffect(() => {
    setLocalBalance(casino.currentBalance ?? null);
  }, [casino.currentBalance]);

  const handleSaveBalance = async () => {
    setIsEditingBalance(false);
    const trimmed = balanceInput.trim();
    if (trimmed === "") return;
    const val = parseFloat(trimmed);
    if (isNaN(val) || val < 0) return;

    setLocalBalance(val);
    if (onUpdateCasino) {
      onUpdateCasino(casino, { currentBalance: val });
    }

    try {
      await apiUpdateCasinoBalance(casino.id, val);
    } catch (err) {
      console.error("Failed to update casino balance:", err);
    }
  };

  const rawUrl = casino.affiliateUrl || casino.siteUrl || casino.url;
  const visitUrl = getExternalUrl(rawUrl);

  const [showTrustpilotTip, setShowTrustpilotTip] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem("dailyroll_seen_trustpilot_tip");
      if (!seen) {
        setShowTrustpilotTip(true);
      }
    } catch {}
  }, []);

  const dismissTrustpilotTip = () => {
    setShowTrustpilotTip(false);
    try {
      localStorage.setItem("dailyroll_seen_trustpilot_tip", "true");
    } catch {}
  };

  let hostname = "google.com";
  try {
    const raw = casino.siteUrl || casino.affiliateUrl || casino.url || "";
    if (raw) hostname = new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    hostname = casino.name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
  }
  const trustpilotUrl =
    casino.trustpilotUrl?.trim() || `https://www.trustpilot.com/review/${hostname}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-[#14231b] via-[#0f1914] to-[#0c1410] p-4 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
      {/* Top row: Back link */}
      <div className="flex items-center justify-between gap-3 border-b border-emerald-950 pb-3 sm:pb-4">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
          >
            <ArrowLeft size={16} className="transition group-hover:-translate-x-1" />
            <span>Back to Rollcall</span>
          </button>
        ) : (
          <Link
            href="/tracker"
            className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition"
          >
            <ArrowLeft size={16} className="transition group-hover:-translate-x-1" />
            <span>Back to Rollcall</span>
          </Link>
        )}
      </div>

      {showTrustpilotTip && (
        <div className="relative w-full mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2 shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <span className="text-sm">⭐</span>
            <span className="text-[11px] leading-tight text-zinc-200">
              <strong className="text-amber-400 font-bold">Pro-Tip:</strong> Tap the stars anytime to read verified reviews directly on Trustpilot.
            </span>
          </div>
          <button
            type="button"
            onClick={dismissTrustpilotTip}
            className="p-1 rounded text-zinc-400 hover:text-white shrink-0 cursor-pointer"
            aria-label="Dismiss Trustpilot tip"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
              <a
                href={trustpilotUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`View ${casino.name} reviews on Trustpilot`}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-950/40 border border-amber-400/20 hover:border-amber-400/50 hover:bg-emerald-950/70 transition-all cursor-pointer group"
              >
                <TrustpilotStars rating={casino.trustpilotRating} className="text-xs text-amber-400" />
                <span className="text-xs font-bold text-zinc-200 group-hover:text-amber-300">
                  {casino.trustpilotRating ? Number(casino.trustpilotRating).toFixed(1) : "3.8"}
                </span>
                <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-amber-300 transition-colors ml-0.5" />
              </a>

              {/* Interactive Balance Pill */}
              {isEditingBalance ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveBalance();
                  }}
                  className="inline-flex items-center gap-1 bg-zinc-900 border border-emerald-500/50 rounded-lg px-2 py-0.5 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                >
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    autoFocus
                    value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    onBlur={handleSaveBalance}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setIsEditingBalance(false);
                        setBalanceInput(localBalance?.toFixed(2) ?? "0.00");
                      }
                    }}
                    className="w-16 bg-transparent text-xs font-black text-emerald-400 outline-none text-right"
                  />
                  <span className="text-[10px] font-bold text-zinc-400">SC</span>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBalanceInput(localBalance != null ? localBalance.toFixed(2) : "0.00");
                    setIsEditingBalance(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-emerald-500/25 hover:border-emerald-400/50 text-xs font-bold text-emerald-400 cursor-pointer group transition-all"
                  title="Click to edit balance"
                >
                  <Wallet className="w-3 h-3 text-emerald-400/70 group-hover:text-emerald-400 transition-colors shrink-0" />
                  <span>{localBalance != null ? Number(localBalance).toFixed(2) : "0.00"} SC</span>
                  <Pencil className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                </button>
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
              onClick={() => {
                if (onClose) {
                  onClose();
                }
              }}
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
