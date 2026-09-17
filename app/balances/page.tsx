"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Check,
  X,
  Search,
  ArrowUpDown,
  Coins,
  Sparkles,
} from "lucide-react";
import type { Casino } from "@/types/casino";
import { apiGetCasinos, apiSaveCasinos, apiGetDirectory } from "@/lib/api-client";
import { openInExternalBrowser } from "@/lib/openExternalLink";
import { getCasinoDeepLink } from "@/lib/casinoLinks";
import { getCasinoProvider, parseScReward } from "@/lib/speedRunStorage";
import { CasinoLogo } from "@/components/CasinoLogo";
import { MASTER_CASINOS_DATA } from "@/lib/casinosData";
import { formatSC } from "@/lib/formatters";
import { CasinoDetailsModal } from "@/components/CasinoDetailsModal";

function parseMinRedemption(minRedemptionStr?: string | null): number {
  if (!minRedemptionStr) return 50;
  const cleaned = minRedemptionStr.replace(/[^0-9.]/g, "");
  const val = parseFloat(cleaned);
  return !isNaN(val) && val > 0 ? val : 50;
}

type SortType = "highest-balance" | "closest-percent" | "name-asc";

export default function BalancesPage() {
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [directoryProviders, setDirectoryProviders] = useState<Record<string, string>>({});
  const [directoryMinRedemptions, setDirectoryMinRedemptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState<SortType>("highest-balance");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedCasinoId, setSelectedCasinoId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  function handleOpenDetails(casinoId: string) {
    setSelectedCasinoId(casinoId);
    setIsDetailsModalOpen(true);
  }

  // Load casinos & directory metadata
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [casinosData, directoryData] = await Promise.all([
          apiGetCasinos(),
          apiGetDirectory(),
        ]);
        if (cancelled) return;

        if (directoryData) {
          if (directoryData.providers) setDirectoryProviders(directoryData.providers);
          if (directoryData.minRedemption) setDirectoryMinRedemptions(directoryData.minRedemption);
        }

        if (Array.isArray(casinosData) && casinosData.length > 0) {
          setCasinos(casinosData);
        } else {
          try {
            const guestRaw = localStorage.getItem("dailyroll_guest_casinos");
            if (guestRaw) {
              const parsed = JSON.parse(guestRaw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setCasinos(parsed);
                setLoading(false);
                return;
              }
            }
          } catch {}
          setCasinos(MASTER_CASINOS_DATA as Casino[]);
        }
      } catch (err) {
        console.error("Failed to load casinos for balances page:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save balance update
  async function handleSaveBalance(casino: Casino, newValueStr: string) {
    const trimmed = newValueStr.trim();
    const parsed = parseFloat(trimmed);
    const validBalance = trimmed !== "" && !isNaN(parsed) && parsed >= 0 ? parsed : null;

    setEditingId(null);

    const updated = casinos.map((c) =>
      c.id === casino.id || c.name.toLowerCase() === casino.name.toLowerCase()
        ? { ...c, currentBalance: validBalance }
        : c
    );

    setCasinos(updated);

    try {
      await apiSaveCasinos(undefined, updated);
      localStorage.setItem("dailyroll_guest_casinos", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save updated balance:", err);
    }
  }

  // Helper to open casino external link
  function handleOpenCasino(casino: Casino) {
    const target =
      getCasinoDeepLink(casino) || casino.claimUrl || casino.siteUrl || casino.url || "";
    if (target) {
      openInExternalBrowser(target);
    }
  }

  // Active casinos
  const activeCasinos = useMemo(() => {
    return casinos.filter((c) => !c.hidden);
  }, [casinos]);

  // Financial Hero Metrics
  const metrics = useMemo(() => {
    let totalPortfolioSc = 0;
    let redeemableSc = 0;
    let readyCount = 0;
    let dailyHarvestSc = 0;

    activeCasinos.forEach((c) => {
      const bal = typeof c.currentBalance === "number" ? c.currentBalance : 0;
      const minRed = parseMinRedemption(
        c.minRedemption || directoryMinRedemptions[c.name]
      );
      totalPortfolioSc += bal;

      if (bal >= minRed) {
        redeemableSc += bal;
        readyCount += 1;
      }
      const dailyBonusStr = c.dailyBonusSc || c.dailyBonus || "";
      dailyHarvestSc += parseScReward(dailyBonusStr);
    });

    return {
      totalPortfolioSc,
      redeemableSc,
      readyCount,
      dailyHarvestSc,
      totalCount: activeCasinos.length,
    };
  }, [activeCasinos]);

  // Processed & Filtered Grid Items
  const processedCasinos = useMemo(() => {
    return activeCasinos
      .filter((c) => {
        // Search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const nameMatch = c.name.toLowerCase().includes(query);
          const providerMatch = (c.provider || directoryProviders[c.name] || "")
            .toLowerCase()
            .includes(query);
          if (!nameMatch && !providerMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const balA = typeof a.currentBalance === "number" ? a.currentBalance : 0;
        const balB = typeof b.currentBalance === "number" ? b.currentBalance : 0;

        if (sortType === "highest-balance") {
          return balB - balA;
        }

        if (sortType === "closest-percent") {
          const minA = parseMinRedemption(a.minRedemption || directoryMinRedemptions[a.name]);
          const minB = parseMinRedemption(b.minRedemption || directoryMinRedemptions[b.name]);
          const pctA = Math.min(100, (balA / minA) * 100);
          const pctB = Math.min(100, (balB / minB) * 100);
          return pctB - pctA;
        }

        if (sortType === "name-asc") {
          return a.name.localeCompare(b.name);
        }

        return 0;
      });
  }, [activeCasinos, searchQuery, sortType, directoryProviders, directoryMinRedemptions]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070d0a] text-[#e6eee5] grid place-items-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <p className="text-sm font-semibold text-emerald-300">Loading Casino Balances...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070d0a] px-4 pt-8 pb-28 sm:pb-20 text-[#e6eee5] sm:px-8 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header Title */}
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-1">
            <Wallet size={16} />
            <span>Bankroll & Cashout Manager</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Casino Balances & Redemption Tracker
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Audit live Sweeps Coins balances across all platforms, track progress toward minimum cashout thresholds, and redeem ready funds.
          </p>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* HERO FINANCIAL METRICS HEADER (Total Portfolio SC + Daily Free Harvest) */}
        {/* ------------------------------------------------------------- */}
        <section
          aria-label="Financial Portfolio Metrics"
          className="grid grid-cols-2 gap-3 w-full mb-4"
        >
          {/* Card 1: Total Portfolio SC */}
          <div className="rounded-2xl border border-emerald-800/40 bg-gradient-to-b from-[#12241b] to-[#0b1711] p-4 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <Coins size={15} className="text-emerald-400 shrink-0" />
                <span>Total Portfolio SC</span>
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {formatSC(metrics.totalPortfolioSc)}
              </p>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">Across {metrics.totalCount} active casinos</p>
          </div>

          {/* Card 2: Daily Free Harvest */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-[#11241f] to-[#0a1814] p-4 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <Sparkles size={15} className="text-emerald-400 shrink-0" />
                <span>Daily Free Harvest</span>
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                +{metrics.dailyHarvestSc.toFixed(2)} SC/day
              </p>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">Daily login bonus potential</p>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* CONTROLS: SEARCH & SORTING */}
        {/* ------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-[#0c1611]/90 p-3.5 backdrop-blur-md shadow-md">
          {/* Search Box */}
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search casino or provider..."
              className="w-full rounded-xl border border-zinc-700/60 bg-[#07100b] py-2 pl-9 pr-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1 sm:hidden">
              <ArrowUpDown size={14} />
              Sort:
            </span>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-zinc-400 hidden sm:block" />
              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value as SortType)}
                aria-label="Sort casinos"
                className="rounded-xl border border-zinc-700/60 bg-[#07100b] px-3 py-2 text-xs font-bold text-emerald-300 outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value="highest-balance">Highest Balance</option>
                <option value="closest-percent">Closest to Cashout (%)</option>
                <option value="name-asc">A-Z Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* INTERACTIVE BALANCE GRID */}
        {/* ------------------------------------------------------------- */}
        {processedCasinos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-400">
            <Coins size={36} className="mx-auto text-zinc-600 mb-2" />
            <h3 className="text-base font-bold text-white">No casinos match your current filter</h3>
            <p className="text-xs mt-1">Try adjusting your search query or filter options above.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {processedCasinos.map((casino) => {
              const currentBal =
                typeof casino.currentBalance === "number" ? casino.currentBalance : 0;
              const minRed = parseMinRedemption(
                casino.minRedemption || directoryMinRedemptions[casino.name]
              );
              const isReadyToCashout = currentBal >= minRed;
              const progressPct = Math.min(100, Math.round((currentBal / minRed) * 100));
              const remainingToCashout = Math.max(0, minRed - currentBal);
              const provider = casino.provider || directoryProviders[casino.name] || "";
              const isEditing = editingId === casino.id;

              return (
                <div
                  key={casino.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
                    isReadyToCashout
                      ? "border-emerald-500/60 bg-gradient-to-b from-[#132a1e] to-[#0c1b13] shadow-[0_4px_20px_rgba(16,185,129,0.15)]"
                      : "border-zinc-800/80 bg-[#0a1510] hover:border-zinc-700"
                  }`}
                >
                  {/* Top Row: Identity & Status Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      {/* Clickable Header Identity Block to trigger Cheat Sheet Modal */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleOpenDetails(casino.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleOpenDetails(casino.id);
                          }
                        }}
                        className="flex items-center gap-2.5 cursor-pointer group select-none min-w-0"
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-900/60 bg-[#050e0a] overflow-hidden text-emerald-400 font-bold group-hover:scale-105 transition-transform">
                          <CasinoLogo name={casino.name} siteUrl={casino.siteUrl || casino.url} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors truncate leading-tight">
                              {casino.name}
                            </h3>
                          </div>
                          {provider && (
                            <span className="text-[10px] font-semibold text-zinc-400 block truncate mt-0.5">
                              {provider}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cashout Status Badge */}
                      {isReadyToCashout ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-950/90 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-300 shadow-sm shrink-0">
                          <CheckCircle2 size={12} className="text-emerald-400" />
                          Ready to Redeem
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-900/40 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300 shrink-0">
                          {formatSC(remainingToCashout)} to go
                        </span>
                      )}
                    </div>

                    {/* SC Balance & Edit Section */}
                    <div
                      className="mt-4 rounded-xl border border-emerald-950/80 bg-[#06110c] p-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Tracked SC Balance
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Min Cashout: {formatSC(minRed)}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Enter") handleSaveBalance(casino, editValue);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              autoFocus
                              className="w-full rounded-lg border border-emerald-500 bg-[#091811] px-2 py-1 text-sm font-bold font-mono text-white outline-none"
                              placeholder="0.00"
                            />
                            <span className="text-xs font-semibold text-emerald-400 font-mono shrink-0">SC</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveBalance(casino, editValue);
                              }}
                              className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition shrink-0"
                              title="Save"
                            >
                              <Check size={14} strokeWidth={3} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(null);
                              }}
                              className="grid h-7 w-7 place-items-center rounded-lg border border-zinc-700 text-zinc-400 hover:text-white shrink-0"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-2xl font-black text-white font-mono tracking-tight">
                              {formatSC(currentBal)}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(casino.id);
                                setEditValue(currentBal ? currentBal.toString() : "");
                              }}
                              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-[#0d1c15] px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-300 transition cursor-pointer"
                            >
                              <Pencil size={12} />
                              <span>Edit</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Cashout Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                        <span>Progress to Cashout</span>
                        <span className={isReadyToCashout ? "text-emerald-400 font-bold" : "text-zinc-300"}>
                          {progressPct}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#12221a]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isReadyToCashout
                              ? "bg-gradient-to-r from-emerald-500 to-[#39ff6a] shadow-[0_0_10px_rgba(57,255,106,0.5)]"
                              : "bg-gradient-to-r from-amber-600 to-emerald-500"
                          }`}
                          style={{ width: `${Math.max(3, progressPct)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cheat Sheet Details Modal */}
        <CasinoDetailsModal
          casinoId={selectedCasinoId}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedCasinoId(null);
          }}
        />
      </div>
    </main>
  );
}
