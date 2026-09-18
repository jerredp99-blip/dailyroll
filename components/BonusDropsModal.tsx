"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Gift, X, Plus, Loader2 } from "lucide-react";
import { SocialFeed } from "@/app/components/feed/SocialFeed";
import type { Casino } from "@/types/casino";
import { DropsModalProps } from "./DropsModal";
import { getCachedDrops } from "@/lib/dropsStore";

export type { DropsModalProps, DropsModalProps as BonusDropsModalProps };

export function BonusDropsModal({
  isOpen,
  onClose,
  currentUserEmail,
  currentUserName,
  currentUserAvatar,
  isAdmin,
  casinos,
  onClaimCasino,
  isBonusDropsOpen,
  setIsBonusDropsOpen,
  isAddCasinosOpen,
  setIsAddCasinosOpen,
  onOpenAddCasinos,
}: DropsModalProps) {
  const [showActiveCasinosModal, setShowActiveCasinosModal] = useState(false);
  const [bonusDrops, setBonusDrops] = useState<any[]>(() => {
    return getCachedDrops();
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let active = true;
    fetch("/api/posts?type=drop_code", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data.posts || [];
        if (list.length > 0) setBonusDrops(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const activeCasinosWithDrops = useMemo(() => {
    const casinoMap = new Map<string, { name: string; count: number; id: string }>();

    (bonusDrops || []).forEach((drop: any) => {
      const name = drop.casinoName || drop.casino?.name || drop.title?.split(" - ")[0] || "Unknown";
      const existing = casinoMap.get(name) || { name, count: 0, id: name.toLowerCase().replace(/\s+/g, "-") };
      existing.count += 1;
      casinoMap.set(name, existing);
    });

    const list = Array.from(casinoMap.values()).sort((a, b) => b.count - a.count);
    if (list.length > 0) return list;

    // Default list if no active drops loaded yet
    return [
      { name: "Stake.us", count: 3, id: "stake-us" },
      { name: "Crown Coins", count: 2, id: "crown-coins" },
      { name: "Pulsz", count: 2, id: "pulsz" },
      { name: "High 5 Casino", count: 1, id: "high-5-casino" },
      { name: "McLuck", count: 1, id: "mcluck" },
      { name: "ThrillCoins", count: 1, id: "thrillcoins" },
      { name: "Coinsback", count: 1, id: "coinsback" },
    ];
  }, [bonusDrops]);

  const effectiveIsOpen = isOpen ?? isBonusDropsOpen ?? false;
  if (!effectiveIsOpen) return null;

  const explorePopup = showActiveCasinosModal ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setShowActiveCasinosModal(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-drops-casinos-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-emerald-500/30 p-5 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-base">🎁</span>
            <h3 id="active-drops-casinos-title" className="text-sm font-black text-white tracking-wide">
              Casinos With Active Drops
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowActiveCasinosModal(false)}
            aria-label="Close dialog"
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clear Instructions */}
        <div className="my-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-center">
          <p className="text-xs font-semibold text-emerald-300">
            Add casinos to your Rollcall to view and claim bonus codes.
          </p>
        </div>

        {/* Casino List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {activeCasinosWithDrops.map((item) => (
            <div
              key={item.id || item.name}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{item.name}</span>
              </div>
              <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                {item.count} {item.count === 1 ? "drop" : "drops"}
              </span>
            </div>
          ))}
        </div>

        {/* Quick Navigation Button */}
        <div className="pt-4 mt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setShowActiveCasinosModal(false);
              setIsBonusDropsOpen?.(false);
              setIsAddCasinosOpen?.(true);
              onClose?.();
              onOpenAddCasinos?.();
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("dailyroll_open_add_casinos"));
              }
            }}
            className="w-full h-10 rounded-xl bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 hover:brightness-110 text-white text-xs font-bold shadow-[0_2px_10px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} className="text-white stroke-[2.5]" />
            <span>+ Open Add Casinos</span>
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bonus-drops-modal-title"
      >
        {/* Centered Modal Container */}
        <div
          className="relative w-full max-w-lg max-h-[88vh] bg-zinc-950/95 border border-emerald-500/25 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-400" />
              <h3 id="bonus-drops-modal-title" className="text-sm font-black text-white tracking-wide">
                🎁 Active Bonus Drops
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Active bonus codes banner */}
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 select-none">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>🎁 {activeCasinosWithDrops.length} casinos with active bonus codes</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowActiveCasinosModal(true);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold underline underline-offset-2 ml-1 cursor-pointer transition-colors"
                >
                  Explore ↗
                </button>
              </div>
            </div>

            <SocialFeed
              compact={true}
              initialType="drop_code"
              hideComposer={true}
              hideBanner={true}
              currentUserEmail={currentUserEmail}
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
              isAdmin={isAdmin}
              casinos={casinos}
              onClaimCasino={onClaimCasino}
              onClose={onClose}
              setIsBonusDropsOpen={setIsBonusDropsOpen || ((open) => { if (!open) onClose(); })}
              setIsAddCasinosOpen={setIsAddCasinosOpen}
              onOpenAddCasinos={onOpenAddCasinos}
              showActiveCasinosModal={showActiveCasinosModal}
              setShowActiveCasinosModal={setShowActiveCasinosModal}
              showActiveDropsCasinos={showActiveCasinosModal}
              setShowActiveDropsCasinos={setShowActiveCasinosModal}
            />
          </div>
        </div>
      </div>

      {explorePopup && mounted && typeof document !== "undefined"
        ? createPortal(explorePopup, document.body)
        : explorePopup}
    </>
  );
}

export default BonusDropsModal;
