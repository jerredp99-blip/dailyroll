"use client";

import { useEffect, useState } from "react";
import { Clock, ExternalLink, Zap, Flame } from "lucide-react";
import type { Casino } from "@/lib/store";
import { openInExternalBrowser } from "@/lib/openExternalLink";

export function CompactTrackerSidebar({
  casinos: propCasinos,
  onClaimCasino,
  onShareClaim,
  currentUserEmail,
}: {
  casinos?: Casino[];
  onClaimCasino?: (casino: Casino) => void;
  onShareClaim?: (casinoName: string, amount: string) => void;
  currentUserEmail?: string;
}) {
  const [internalCasinos, setInternalCasinos] = useState<Casino[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState<number>(Date.now());

  // Second ticker to keep remaining countdowns live
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch only if propCasinos is not supplied by parent
  useEffect(() => {
    if (propCasinos) return;

    let active = true;
    setLoading(true);
    (async () => {
      try {
        const key = currentUserEmail ? encodeURIComponent(currentUserEmail) : "admin";
        const res = await fetch(`/api/casinos?key=${key}`);
        const data = await res.json();
        if (active && data.casinos) {
          setInternalCasinos(data.casinos);
        }
      } catch (err) {
        console.error("Failed to load casinos", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [propCasinos, currentUserEmail]);

  // Determine the next reset time matching Rollcall logic
  const getNextReset = (casino: Casino) => {
    if (!casino.lastClaimedAt) return 0;
    let nextReset =
      new Date(casino.lastClaimedAt).getTime() +
      (casino.intervalHours || 24) * 60 * 60 * 1000;

    if (casino.resetAtTime) {
      const [hours, minutes] = casino.resetAtTime.split(":").map(Number);
      const reset = new Date(now);
      reset.setHours(hours, minutes, 0, 0);
      if (reset.getTime() <= new Date(casino.lastClaimedAt).getTime()) {
        reset.setDate(reset.getDate() + 1);
      }
      nextReset = reset.getTime();
    }
    return nextReset;
  };

  const isReady = (casino: Casino) => {
    if (!casino.lastClaimedAt) return true;
    const nextReset = getNextReset(casino);
    return now >= nextReset;
  };

  const formatRemainingTime = (casino: Casino) => {
    if (!casino.lastClaimedAt) return "Ready";
    const nextReset = getNextReset(casino);
    const diff = nextReset - now;
    if (diff <= 0) return "Ready";

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  };

  const handleClaim = async (casino: Casino) => {
    if (onClaimCasino) {
      onClaimCasino(casino);
      return;
    }

    // 1. Requirement 3: Ensure user interaction state and timers fire immediately before navigation
    const nowIso = new Date().toISOString();
    const updated = (propCasinos ?? internalCasinos).map((c) =>
      c.id === casino.id ? { ...c, lastClaimedAt: nowIso } : c
    );
    setInternalCasinos(updated);

    try {
      const key = currentUserEmail ? encodeURIComponent(currentUserEmail) : "admin";
      fetch(`/api/casinos?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casinos: updated }),
      }).catch((err) => console.error("Failed to save claim", err));
    } catch (err) {
      console.error("Failed to save claim", err);
    }

    // 2. Open external browser
    const targetUrl =
      casino.claimUrl || casino.siteUrl || casino.url || "https://google.com";
    openInExternalBrowser(targetUrl);
  };

  // Requirement: same list as Rollcall (filter out hidden casinos)
  const activeList = (propCasinos ?? internalCasinos).filter((c) => !c.hidden);

  // Sort ready casinos to top, keeping rollcall prominent
  const sortedCasinos = [...activeList].sort((a, b) => {
    const readyA = isReady(a);
    const readyB = isReady(b);
    if (readyA && !readyB) return -1;
    if (!readyA && readyB) return 1;
    return 0;
  });

  const readyCount = activeList.filter(isReady).length;

  return (
    <div className="rounded-2xl border border-[#223a2b] bg-[#121f17]/95 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between border-b border-[#1c3325] pb-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Zap size={15} className="text-amber-400" />
            Your Rollcall
          </h3>
          <p className="text-[11px] text-[#7d9984]">
            {readyCount} bonus{readyCount === 1 ? "" : "es"} ready to claim
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
          {readyCount}/{activeList.length}
        </span>
      </div>

      {loading && !propCasinos ? (
        <p className="text-center py-6 text-xs text-[#708a77]">Loading rollcall...</p>
      ) : activeList.length === 0 ? (
        <p className="text-center py-6 text-xs text-[#708a77]">
          No casinos in your rollcall yet. Add casinos in the Rollcall tab to track them here!
        </p>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {sortedCasinos.map((casino) => {
            const ready = isReady(casino);
            return (
              <div
                key={casino.id}
                className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 transition ${
                  ready
                    ? "border-emerald-700/40 bg-[#16271e] hover:border-emerald-500/50"
                    : "border-[#1c3023] bg-[#0e1812] opacity-80"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate">{casino.name}</p>
                    {ready && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-emerald-300 truncate">
                    {casino.dailyBonus}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {ready ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleClaim(casino)}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
                      >
                        Claim <ExternalLink size={11} />
                      </button>
                      {onShareClaim && (
                        <button
                          type="button"
                          onClick={() => onShareClaim(casino.name, casino.dailyBonus)}
                          title="Share to Feed"
                          className="rounded-lg bg-emerald-950/60 border border-emerald-700/40 p-1.5 text-emerald-300 transition hover:bg-emerald-900/80"
                        >
                          <Flame size={13} />
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-[#78937f]">
                      <Clock size={11} /> {formatRemainingTime(casino)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
