"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Coins,
  CreditCard,
  Zap,
  Clock,
  ShieldAlert,
  Info,
  Edit3,
  Gift,
  MessageSquare,
  Layers,
  X,
  Wallet,
  Lightbulb,
  Search,
} from "lucide-react";
import type { Casino } from "@/types/casino";
import { CasinoDetailHeader } from "@/components/CasinoDetailHeader";
import { AdminCasinoDataForm } from "@/components/AdminCasinoDataForm";
import { CasinoDropsFeed } from "@/components/CasinoDropsFeed";
import { CasinoCommunityChat } from "@/components/CasinoCommunityChat";

export interface CasinoDetailsModalProps {
  casinoId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectCasino?: (id: string) => void;
}

export function CasinoDetailsModal({
  casinoId,
  isOpen,
  onClose,
  onSelectCasino,
}: CasinoDetailsModalProps) {
  const [activeId, setActiveId] = useState<string | null>(casinoId);
  const [casino, setCasino] = useState<Casino | null>(null);
  const [allCasinos, setAllCasinos] = useState<Casino[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTracked, setIsTracked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"drops" | "chat">("drops");

  useEffect(() => {
    setActiveId(casinoId);
  }, [casinoId]);

  const loadCasinoData = useCallback(async (targetId: string | null) => {
    if (!targetId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/casinos/${encodeURIComponent(targetId)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setErrorMsg("Casino not found in directory.");
        } else {
          setErrorMsg("Unable to load casino details.");
        }
        return;
      }
      const data = await res.json();
      setCasino(data.casino);
      setIsTracked(Boolean(data.isTracked));
      setIsAdmin(Boolean(data.isAdmin));
    } catch (err) {
      console.error("Error loading casino details modal:", err);
      setErrorMsg("Failed to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeId) {
      loadCasinoData(activeId);
    } else if (!isOpen) {
      setCasino(null);
      setSearchQuery("");
    }
  }, [isOpen, activeId, loadCasinoData]);

  // Load directory list for search switcher
  useEffect(() => {
    if (!isOpen) return;
    async function fetchAll() {
      try {
        const res = await fetch("/api/directory");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.casinos) && data.casinos.length > 0) {
            setAllCasinos(data.casinos);
            return;
          }
        }
        const res2 = await fetch("/api/casinos");
        if (res2.ok) {
          const data2 = await res2.json();
          if (Array.isArray(data2.casinos)) {
            setAllCasinos(data2.casinos);
          }
        }
      } catch (err) {
        console.error("Failed to fetch casinos for switcher:", err);
      }
    }
    fetchAll();
  }, [isOpen]);

  const filteredCasinos = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return allCasinos.filter((c) => c.name.toLowerCase().includes(q));
  }, [allCasinos, searchQuery]);

  const handleSelectCasino = (id: string) => {
    setActiveId(id);
    setSearchQuery("");
    if (onSelectCasino) {
      onSelectCasino(id);
    }
  };

  // Esc key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleAddToRollcall = async () => {
    if (!casino) return;
    try {
      const res = await fetch("/api/casinos");
      if (res.ok) {
        const data = await res.json();
        const currentList = (data.casinos || []) as Casino[];
        if (!currentList.some((c) => c.name.toLowerCase() === casino.name.toLowerCase())) {
          const updatedList = [...currentList, casino];
          await fetch("/api/casinos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ casinos: updatedList }),
          });
          setIsTracked(true);
        }
      }
    } catch (err) {
      console.error("Failed to add casino to rollcall:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={casino?.name ? `${casino.name} Details` : "Casino Details"}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3.5 sm:p-5 transition-opacity duration-150 ease-out animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 text-[#e5eee3] transform transition-all duration-150 ease-out will-change-transform animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header & Title */}
        <div className="flex items-center justify-between pb-2 border-b border-emerald-500/10">
          <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400">
            Casino Cheat Sheet
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close casino details"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Switcher Bar */}
        <div className="relative w-full my-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or switch casino..."
              className="w-full h-9 pl-9 pr-8 bg-zinc-950/90 border border-emerald-500/25 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Results Dropdown */}
          {searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 max-h-48 overflow-y-auto bg-zinc-950 border border-emerald-500/30 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.8)] z-50 divide-y divide-zinc-800/60">
              {filteredCasinos.length > 0 ? (
                filteredCasinos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectCasino(item.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-900 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {item.logo ? (
                        <img src={item.logo} alt={item.name} className="w-5 h-5 rounded object-contain" />
                      ) : (
                        <div className="w-5 h-5 rounded bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                          {item.name[0]}
                        </div>
                      )}
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400">
                        {item.name}
                      </span>
                    </div>
                    {(item.dailySc || item.dailyBonusSc || item.dailyBonus) && (
                      <span className="text-[11px] font-bold text-emerald-400">
                        {item.dailySc
                          ? item.dailySc.endsWith("SC") ? item.dailySc : `${item.dailySc} SC`
                          : item.dailyBonusSc
                          ? item.dailyBonusSc.endsWith("SC") ? item.dailyBonusSc : `${item.dailyBonusSc} SC`
                          : item.dailyBonus.endsWith("SC") ? item.dailyBonus : `${item.dailyBonus} SC`}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2.5 text-center text-xs text-zinc-500">
                  No casinos found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="py-16 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-3" />
            <p className="text-xs font-semibold text-zinc-400">Loading casino details...</p>
          </div>
        )}

        {/* Error state */}
        {!isLoading && errorMsg && (
          <div className="rounded-xl border border-red-500/30 bg-[#170c0c] p-6 text-center">
            <h3 className="text-sm font-bold text-red-400 mb-1">Unable to Load Casino</h3>
            <p className="text-xs text-zinc-400">{errorMsg}</p>
          </div>
        )}

        {/* Casino Content */}
        {!isLoading && !errorMsg && casino && (
          <div className="space-y-5">
            {/* 1. Header Hero Widget */}
            <CasinoDetailHeader
              casino={casino}
              isTracked={isTracked}
              onAddToRollcall={handleAddToRollcall}
              onUpdateCasino={(updatedCasino, updates) => {
                setCasino((prev) => (prev ? { ...prev, ...updates } : null));
              }}
            />

            {/* 2. Operational Cheat Sheet Grid */}
            <section className="rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-[#111f17] to-[#0d1611] p-4 sm:p-5 shadow-inner">
              <div className="flex items-center justify-between gap-3 border-b border-emerald-950 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="text-emerald-400" size={18} />
                  <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                    Operational Cheat Sheet
                  </h2>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsAdminModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/50 bg-[#162a1f] px-2.5 py-1 text-xs font-bold text-emerald-300 hover:bg-[#1f3a2b] hover:text-white transition cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Edit Specs</span>
                  </button>
                )}
              </div>

              {/* 2-Column Locked Spec Grid */}
              <div className="grid grid-cols-2 gap-2 w-full">
                {/* 1. Daily SC Bonus */}
                <div className="p-2.5 bg-zinc-900/80 border border-emerald-500/15 rounded-xl flex flex-col justify-between min-h-[64px]">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400/80 flex items-center gap-1">
                    <Coins className="w-3 h-3 text-emerald-400 shrink-0" />
                    Daily SC Bonus
                  </span>
                  <span className="text-sm font-black text-emerald-400 mt-1">
                    {casino.dailySc
                      ? casino.dailySc.endsWith("SC") ? casino.dailySc : `${casino.dailySc} SC`
                      : casino.dailyBonusSc
                      ? casino.dailyBonusSc.endsWith("SC") ? casino.dailyBonusSc : `${casino.dailyBonusSc} SC`
                      : casino.dailyBonus
                      ? casino.dailyBonus.endsWith("SC") ? casino.dailyBonus : `${casino.dailyBonus} SC`
                      : "Varies"}
                  </span>
                </div>

                {/* 2. Min Cashout */}
                <div className="p-2.5 bg-zinc-900/80 border border-emerald-500/15 rounded-xl flex flex-col justify-between min-h-[64px]">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-emerald-400 shrink-0" />
                    Min Cashout
                  </span>
                  <span className="text-xs font-semibold text-zinc-200 mt-1 line-clamp-2">
                    {casino.minRedemption || "$50 (Gift) / $100 (Bank)"}
                  </span>
                </div>

                {/* 3. Payout Speed */}
                <div className="p-2.5 bg-zinc-900/80 border border-emerald-500/15 rounded-xl flex flex-col justify-between min-h-[64px]">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
                    Payout Speed
                  </span>
                  <span className="text-xs font-semibold text-zinc-200 mt-1">
                    {casino.payoutSpeed || "24-48 Hours"}
                  </span>
                </div>

                {/* 4. Reset Rule */}
                <div className="p-2.5 bg-zinc-900/80 border border-emerald-500/15 rounded-xl flex flex-col justify-between min-h-[64px]">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                    Reset Rule
                  </span>
                  <span className="text-xs font-semibold text-zinc-200 mt-1">
                    {casino.resetRule || (casino.resetAtTime ? `Fixed at ${casino.resetAtTime}` : "Rolling 24h")}
                  </span>
                </div>

                {/* 5. Payout Methods (Span full 2 columns) */}
                <div className="col-span-2 p-2.5 bg-zinc-900/80 border border-emerald-500/15 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-emerald-400 shrink-0" />
                    Payout Methods
                  </span>
                  <span className="text-xs font-medium text-zinc-300 mt-1">
                    {casino.payoutMethods || "Online Banking, Skrill, Prizeout Gift Cards"}
                  </span>
                </div>

                {/* 6. Restricted States (Span full 2 columns) */}
                <div className="col-span-2 p-2.5 bg-zinc-900/80 border border-emerald-500/15 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                    Restricted States
                  </span>
                  <span className="text-xs font-semibold text-zinc-300 mt-1">
                    {casino.restrictedStates || "WA, ID, NV, MI, KY"}
                  </span>
                </div>
              </div>

              {/* Claim Instruction card if present */}
              {(casino.claimTip || casino.claimInstructions || casino.details) && (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2.5">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Claim Instruction
                    </span>
                    <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
                      {casino.claimTip || casino.claimInstructions || casino.details}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* 3. Dual Tabs: Casino Bonus Drops & Community Chat */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("drops")}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                    activeTab === "drops"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#122319]"
                  }`}
                >
                  <Gift size={15} />
                  <span>🎁 Bonus Drops</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                    activeTab === "chat"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#122319]"
                  }`}
                >
                  <MessageSquare size={15} />
                  <span>💬 Community Chat</span>
                </button>
              </div>

              {/* Tab 1: Bonus Drops Feed */}
              {activeTab === "drops" && <CasinoDropsFeed casino={casino} />}

              {/* Tab 2: Community Chat */}
              {activeTab === "chat" && <CasinoCommunityChat casino={casino} />}
            </section>
          </div>
        )}

        {/* Admin Edit Modal */}
        {isAdmin && casino && (
          <AdminCasinoDataForm
            casino={casino}
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
            onSaved={(updated) => setCasino(updated)}
          />
        )}
      </div>
    </div>
  );
}

