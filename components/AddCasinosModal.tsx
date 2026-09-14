"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, Plus, Check, ExternalLink, CheckCircle2, ShieldAlert } from "lucide-react";
import type { Casino } from "@/types/casino";
import { CasinoLogo } from "@/components/CasinoLogo";
import { TrustpilotStars } from "@/components/TrustpilotStars";
import { openInExternalBrowser } from "@/lib/openExternalLink";
import { getCasinoDefaultMetadata, MASTER_CASINOS_DATA } from "@/lib/casinosData";
import { casinoDirectory, casinoDirectoryUrls } from "@/lib/casino-directory";
import type { DirectoryData } from "@/lib/api-client";

export interface AddCasinosModalProps {
  isOpen: boolean;
  onClose: () => void;
  casinos: Casino[];
  onAddCasino: (casinoName: string) => void;
  onClaimCasino?: (casino: Casino) => void;
  directoryData?: DirectoryData | null;
  isAdmin?: boolean;
}

export function AddCasinosModal({
  isOpen,
  onClose,
  casinos,
  onAddCasino,
  onClaimCasino,
  directoryData,
  isAdmin = false,
}: AddCasinosModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"available" | "added" | "all">("available");

  // Compile full directory of names
  const allNames = useMemo(() => {
    const list = directoryData?.list && directoryData.list.length > 0 ? directoryData.list : casinoDirectory;
    const set = new Set(list);
    for (const item of MASTER_CASINOS_DATA) {
      set.add(item.name);
    }
    return Array.from(set);
  }, [directoryData?.list]);

  // Lookup existing user casinos by lowercase name
  const userCasinosByName = useMemo(() => {
    const map = new Map<string, Casino>();
    for (const c of casinos) {
      map.set(c.name.trim().toLowerCase(), c);
    }
    return map;
  }, [casinos]);

  // Filtered and searched list
  const filteredCasinos = useMemo(() => {
    return allNames
      .filter((name) => {
        const isAdded = userCasinosByName.has(name.trim().toLowerCase());
        if (filterMode === "available" && isAdded) return false;
        if (filterMode === "added" && !isAdded) return false;
        if (searchQuery.trim()) {
          return name.toLowerCase().includes(searchQuery.trim().toLowerCase());
        }
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [allNames, userCasinosByName, filterMode, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-casinos-title"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-emerald-900/70 bg-gradient-to-b from-[#122319] to-[#0c1811] shadow-[0_16px_48px_rgba(0,0,0,0.75)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-emerald-950/80 px-4 py-3 sm:px-6 sm:py-4 bg-[#0e1d14]">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2
                id="add-casinos-title"
                className="text-base sm:text-lg font-black tracking-wide text-white uppercase"
                style={{ fontFamily: "Rhinos, Impact, sans-serif" }}
              >
                Explore & Add Casinos
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-400/80">
                Discover supported sweepstakes operators with daily reloads
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-950 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter and Search Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4 border-b border-emerald-950/60 bg-[#0d1a12]">
          <div className="relative flex-1 min-w-48">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7da186]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search casinos (e.g. ThrillCoins, Pulsz)..."
              className="w-full rounded-xl border border-emerald-900/60 bg-[#0a160f] py-2 pl-9 pr-3 text-xs sm:text-sm text-gray-200 placeholder-[#587560] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-emerald-900/60 bg-[#0a160f] p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode("available")}
              className={`rounded-lg px-2.5 py-1.5 font-bold transition cursor-pointer ${
                filterMode === "available"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-[#85a48c] hover:text-white"
              }`}
            >
              Available
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("added")}
              className={`rounded-lg px-2.5 py-1.5 font-bold transition cursor-pointer ${
                filterMode === "added"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-[#85a48c] hover:text-white"
              }`}
            >
              In Rollcall
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`rounded-lg px-2.5 py-1.5 font-bold transition cursor-pointer ${
                filterMode === "all"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-[#85a48c] hover:text-white"
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Scrollable Casino List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5 divide-y divide-emerald-950/40">
          {filteredCasinos.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldAlert size={36} className="mx-auto text-[#53705b] mb-2" />
              <p className="text-sm font-semibold text-gray-300">No casinos found</p>
              <p className="text-xs text-gray-500 mt-1">
                Try adjusting your search terms or filter selection.
              </p>
            </div>
          ) : (
            filteredCasinos.map((casinoName) => {
              const userCasino = userCasinosByName.get(casinoName.trim().toLowerCase());
              const isAdded = Boolean(userCasino);

              const seed = getCasinoDefaultMetadata(casinoName);
              const siteUrl =
                directoryData?.urls[casinoName] ||
                casinoDirectoryUrls[casinoName] ||
                seed?.siteUrl ||
                `https://www.google.com/search?q=${encodeURIComponent(`${casinoName} casino`)}`;

              const dailyBonus =
                directoryData?.dailyBonuses?.[casinoName] ||
                seed?.dailyBonus ||
                "Free daily";

              const rating =
                directoryData?.ratings?.[casinoName] ??
                userCasino?.trustpilotRating ??
                seed?.trustpilotRating;

              return (
                <article
                  key={casinoName}
                  className="pt-2.5 first:pt-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-950/60 bg-[#0f1d15] p-3 sm:p-3.5 hover:border-emerald-700/60 transition"
                >
                  {/* Left: Logo + Name + Badges */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#182b20] border border-emerald-900/50">
                      <CasinoLogo name={casinoName} siteUrl={siteUrl} width={32} height={32} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/casinos/${encodeURIComponent(casinoName)}`}
                          onClick={onClose}
                          className="font-bold text-white text-sm sm:text-base hover:text-emerald-300 transition truncate"
                        >
                          {casinoName}
                        </Link>
                      </div>

                      {/* Badges: Trustpilot */}
                      {rating !== undefined && rating !== null && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <TrustpilotStars rating={Number(rating)} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    {/* External Link */}
                    <button
                      type="button"
                      onClick={() => openInExternalBrowser(siteUrl)}
                      title={`Visit ${casinoName}`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-[#2f4937] bg-[#111e16] text-[#86a88d] hover:text-white hover:border-emerald-500 transition cursor-pointer"
                    >
                      <ExternalLink size={13} />
                    </button>

                    {/* Add / Claim Actions */}
                    {isAdded ? (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/50 bg-[#14281c] px-2.5 py-1.5 text-xs font-bold text-emerald-400">
                          <Check size={12} strokeWidth={3} />
                          Added
                        </span>

                        {/* Direct Claim Action */}
                        <button
                          type="button"
                          onClick={() => {
                            if (userCasino && onClaimCasino) {
                              onClaimCasino(userCasino);
                            }
                            openInExternalBrowser(siteUrl);
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-[#39ff6a] px-3 py-1.5 text-xs font-extrabold text-[#0d1712] shadow-[0_4px_12px_rgba(57,255,106,0.25)] hover:bg-[#5aff84] transition active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 size={13} strokeWidth={2.5} />
                          <span>Claim {dailyBonus}!</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {/* Secondary: + Add to Rollcall */}
                        <button
                          type="button"
                          onClick={() => onAddCasino(casinoName)}
                          className="flex items-center gap-1 rounded-lg border border-[#395341] bg-[#14241b] px-2.5 py-1.5 text-xs font-bold text-[#b5d6b3] hover:border-emerald-500 hover:text-white transition active:scale-95 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Add</span>
                        </button>

                        {/* Primary: Claim [Daily Bonus]! Initialized to ready */}
                        <button
                          type="button"
                          onClick={() => {
                            onAddCasino(casinoName);
                            openInExternalBrowser(siteUrl);
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-[#39ff6a] px-3 py-1.5 text-xs font-extrabold text-[#0d1712] shadow-[0_4px_12px_rgba(57,255,106,0.3)] hover:bg-[#5aff84] transition active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 size={13} strokeWidth={2.5} />
                          <span>Claim {dailyBonus}!</span>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-emerald-950/80 px-4 py-3 bg-[#0d1a12] text-xs text-[#718d78]">
          <span>Showing {filteredCasinos.length} casinos</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#324b3b] bg-[#122018] px-3 py-1 text-xs font-semibold text-gray-300 hover:text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddCasinosModal;
