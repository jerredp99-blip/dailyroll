"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, X, Plus, ExternalLink, ShieldAlert, Sparkles } from "lucide-react";
import type { Casino } from "@/types/casino";
import { CasinoLogo } from "@/components/CasinoLogo";
import { TrustpilotStars } from "@/components/TrustpilotStars";
import { getCasinoDefaultMetadata, MASTER_CASINOS_DATA } from "@/lib/casinosData";
import { casinoDirectory, casinoDirectoryUrls } from "@/lib/casino-directory";
import type { DirectoryData } from "@/lib/api-client";

export interface AddCasinosModalProps {
  isOpen: boolean;
  onClose: () => void;
  casinos: Casino[];
  onAddCasino: (casinoName: string) => void;
  onClaimCasino?: (casino: Casino) => void;
  onOpenDetails?: (casinoId: string) => void;
  directoryData?: DirectoryData | null;
  isAdmin?: boolean;
}

export function AddCasinosModal({
  isOpen,
  onClose,
  casinos,
  onAddCasino,
  onClaimCasino,
  onOpenDetails,
  directoryData,
  isAdmin = false,
}: AddCasinosModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"available" | "added" | "all">("available");
  const [showEmailTip, setShowEmailTip] = useState(false);

  useEffect(() => {
    try {
      const hasDismissed = localStorage.getItem("dailyroll_seen_casino_email_tip");
      if (!hasDismissed) {
        setShowEmailTip(true);
      }
    } catch {
      // Fallback if localStorage is unavailable
    }
  }, []);

  const dismissTip = () => {
    setShowEmailTip(false);
    try {
      localStorage.setItem("dailyroll_seen_casino_email_tip", "true");
    } catch {
      // Fallback
    }
  };

  // Compile full directory of names (filtering out pending review casinos for standard users)
  const allNames = useMemo(() => {
    const list = directoryData?.list && directoryData.list.length > 0 ? directoryData.list : casinoDirectory;
    const set = new Set(list);
    for (const item of MASTER_CASINOS_DATA) {
      set.add(item.name);
    }
    return Array.from(set).filter((name) => {
      if (isAdmin) return true;
      const isPending = directoryData?.pendingReview?.[name];
      const isPub = directoryData?.published?.[name];
      if (isPending === true) return false;
      if (isPub === false) return false;
      return true;
    });
  }, [directoryData?.list, directoryData?.pendingReview, directoryData?.published, isAdmin]);

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

        {/* Pro-Tip Email & SSO Banner */}
        {showEmailTip && (
          <div className="relative mx-3 mt-3 sm:mx-4 sm:mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-start gap-3 shadow-md animate-fadeIn">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
              <Sparkles size={16} />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <p className="text-xs font-bold text-emerald-200">
                Pro-Tip: Use a Dedicated Casino Email & Google Single Sign-On
              </p>
              <p className="text-[11px] text-emerald-300/80 mt-0.5 leading-relaxed">
                For smooth verification and account tracking across social casinos, we recommend using a dedicated email address and consistent Google Single Sign-On (SSO) across all platforms.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissTip}
              title="Dismiss tip"
              aria-label="Dismiss tip"
              className="absolute top-2.5 right-2.5 p-1 text-emerald-400/70 hover:text-white hover:bg-emerald-900/60 rounded-lg transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

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

              const affiliateUrl =
                directoryData?.affiliateUrls?.[casinoName] ||
                userCasino?.affiliateUrl;

              const destinationUrl = affiliateUrl?.trim() || siteUrl?.trim() || "#";

              return (
                <article
                  key={casinoName}
                  className="w-full flex flex-nowrap items-center justify-between gap-2 p-3 sm:p-3.5 rounded-xl border border-emerald-950/60 bg-[#0f1d15] hover:border-emerald-700/60 transition-all min-h-[64px]"
                >
                  {/* Left: Identity Section */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#182b20] border border-emerald-900/50">
                      <CasinoLogo name={casinoName} siteUrl={siteUrl} width={32} height={32} />
                    </div>
                    <div className="flex flex-col min-w-0 justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onOpenDetails) {
                            onOpenDetails(casinoName);
                          }
                        }}
                        className="font-bold text-white text-xs sm:text-sm hover:text-emerald-300 transition truncate max-w-full text-left leading-tight cursor-pointer"
                      >
                        {casinoName}
                      </button>

                      {/* Badges: Trustpilot */}
                      {rating !== undefined && rating !== null && (
                        <div className="mt-0.5 flex items-center gap-0.5 text-amber-400 text-[10px]">
                          <TrustpilotStars rating={Number(rating)} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Sign Up Button */}
                  <div className="flex items-center ml-auto shrink-0">
                    <a
                      href={destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (!isAdded) {
                          onAddCasino(casinoName);
                        }
                      }}
                      className="shrink-0 h-9 px-2.5 sm:px-3 rounded-xl inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-white bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 border-t border-emerald-300/40 border-x border-b border-emerald-900 shadow-[0_2px_8px_rgba(16,185,129,0.3)] active:translate-y-0.5 transition-all select-none whitespace-nowrap"
                    >
                      <span>Sign Up &amp; Claim Bonuses</span>
                      <ExternalLink className="w-3 h-3 text-emerald-200 stroke-[2.5] shrink-0" />
                    </a>
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
