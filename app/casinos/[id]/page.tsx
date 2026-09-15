"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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
  Sparkles,
  Layers,
} from "lucide-react";
import type { Casino } from "@/types/casino";
import { CasinoDetailHeader } from "@/components/CasinoDetailHeader";
import { AdminCasinoDataForm } from "@/components/AdminCasinoDataForm";
import { CasinoDropsFeed } from "@/components/CasinoDropsFeed";
import { CasinoCommunityChat } from "@/components/CasinoCommunityChat";

export default function CasinoDetailPage() {
  const params = useParams();
  const rawId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [casino, setCasino] = useState<Casino | null>(null);
  const [isTracked, setIsTracked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"drops" | "chat">("drops");

  const loadCasinoData = useCallback(async () => {
    if (!rawId) return;
    try {
      const res = await fetch(`/api/casinos/${encodeURIComponent(rawId)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setErrorMsg("Casino not found in the directory or rollcall.");
        } else {
          setErrorMsg("Unable to load casino details. Please try again.");
        }
        return;
      }
      const data = await res.json();
      setCasino(data.casino);
      setIsTracked(Boolean(data.isTracked));
      setIsAdmin(Boolean(data.isAdmin));
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  }, [rawId]);

  useEffect(() => {
    loadCasinoData();
  }, [loadCasinoData]);


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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#080f0b] py-12 px-4">
        <div className="mx-auto max-w-4xl flex flex-col items-center justify-center py-20 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent mb-3" />
          <p className="text-sm font-semibold text-gray-300">Loading casino details...</p>
        </div>
      </main>
    );
  }

  if (errorMsg || !casino) {
    return (
      <main className="min-h-screen bg-[#080f0b] py-12 px-4">
        <div className="mx-auto max-w-md rounded-2xl border border-red-500/30 bg-[#140e0e] p-6 text-center">
          <h2 className="text-base font-bold text-red-400 mb-2">Casino Unavailable</h2>
          <p className="text-xs text-gray-400 mb-4">{errorMsg || "Unable to locate casino."}</p>
          <a
            href="/tracker"
            className="inline-block rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400"
          >
            ← Back to Rollcall
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080f0b] text-[#e5eee3] pb-24 pt-4 sm:pt-8 px-3 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* 1. Header Hero Widget */}
        <CasinoDetailHeader
          casino={casino}
          isTracked={isTracked}
          onAddToRollcall={handleAddToRollcall}
        />

        {/* 2. Admin-Editable Operational Cheat Sheet */}
        <section className="rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-[#111f17] to-[#0d1611] p-4 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between gap-3 border-b border-emerald-950 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="text-emerald-400" size={18} />
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-white">
                Operational Cheat Sheet
              </h2>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/50 bg-[#162a1f] px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-[#1f3a2b] hover:text-white transition cursor-pointer shadow-sm"
              >
                <Edit3 size={13} />
                <span>Edit Specs</span>
              </button>
            )}
          </div>

          {/* Metric Grid (4-6 key metrics) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Daily SC Loot */}
            <div className="rounded-xl border border-emerald-800/40 bg-[#14231b] p-3.5 transition hover:border-emerald-600/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                <Coins size={15} className="text-emerald-400" />
                <span>Daily SC Loot</span>
              </div>
              <p className="text-base font-extrabold text-emerald-300">
                {casino.dailyBonusSc || casino.dailyBonus || "1.00 SC"}
              </p>
            </div>

            {/* Daily GC Loot */}
            <div className="rounded-xl border border-emerald-800/40 bg-[#14231b] p-3.5 transition hover:border-emerald-600/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                <Sparkles size={15} className="text-amber-400" />
                <span>Daily GC Loot</span>
              </div>
              <p className="text-base font-extrabold text-amber-200">
                {casino.dailyBonusGc || "10,000 GC"}
              </p>
            </div>

            {/* Minimum Redemption */}
            <div className="rounded-xl border border-emerald-800/40 bg-[#14231b] p-3.5 transition hover:border-emerald-600/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                <CreditCard size={15} className="text-emerald-400" />
                <span>Min Redemption</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-gray-100">
                {casino.minRedemption || "$50 (Gift Cards) / $100 (Bank)"}
              </p>
            </div>

            {/* Payout Speed */}
            <div className="rounded-xl border border-emerald-800/40 bg-[#14231b] p-3.5 transition hover:border-emerald-600/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                <Zap size={15} className="text-emerald-400" />
                <span>Payout Speed</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-gray-100">
                {casino.payoutSpeed || "24-48 Hours"}
              </p>
            </div>

            {/* Payout Methods */}
            <div className="rounded-xl border border-emerald-800/40 bg-[#14231b] p-3.5 transition hover:border-emerald-600/60 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                <CreditCard size={15} className="text-emerald-400" />
                <span>Payout Methods</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-gray-200">
                {casino.payoutMethods || "Online Banking, Skrill, Prizeout Gift Cards"}
              </p>
            </div>

            {/* Reset Rule */}
            <div className="rounded-xl border border-emerald-800/40 bg-[#14231b] p-3.5 transition hover:border-emerald-600/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                <Clock size={15} className="text-emerald-400" />
                <span>Reset Rule</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-gray-200">
                {casino.resetRule || (casino.resetAtTime ? `Fixed at ${casino.resetAtTime}` : "Rolling 24 Hours")}
              </p>
            </div>

            {/* Restricted States */}
            <div className="rounded-xl border border-emerald-800/40 bg-[#14231b] p-3.5 transition hover:border-emerald-600/60 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                <ShieldAlert size={15} className="text-amber-400" />
                <span>Restricted States</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-gray-300">
                {casino.restrictedStates || "WA, ID, NV, MI, KY"}
              </p>
            </div>
          </div>

          {/* Micro-Instructions tip if present */}
          {casino.details && (
            <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-emerald-800/30 bg-[#0d1a13] p-3 text-xs text-gray-300">
              <Info size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-300">Claim Micro-Tip: </span>
                <span>{casino.details}</span>
              </div>
            </div>
          )}
        </section>

        {/* 3. Dual Tabs: Casino Bonus Drops & Community Chat */}
        <section className="space-y-4">
          {/* Tabs navigation */}
          <div className="flex items-center gap-2 border-b border-emerald-950 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("drops")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === "drops"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                  : "text-gray-400 hover:text-gray-200 hover:bg-[#122319]"
              }`}
            >
              <Gift size={16} />
              <span>🎁 Bonus Drops</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === "chat"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                  : "text-gray-400 hover:text-gray-200 hover:bg-[#122319]"
              }`}
            >
              <MessageSquare size={16} />
              <span>💬 Community Chat</span>
            </button>
          </div>

          {/* Tab 1: Bonus Drops Feed */}
          {activeTab === "drops" && <CasinoDropsFeed casino={casino} />}

          {/* Tab 2: Community Chat */}
          {activeTab === "chat" && <CasinoCommunityChat casino={casino} />}
        </section>
      </div>

      {/* Admin Edit Modal */}
      {isAdmin && (
        <AdminCasinoDataForm
          casino={casino}
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          onSaved={(updated) => setCasino(updated)}
        />
      )}
    </main>
  );
}

