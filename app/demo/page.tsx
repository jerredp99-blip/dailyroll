"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Clock,
  Sparkles,
  Zap,
  RotateCcw,
  Plus,
  Search,
  ExternalLink,
  CheckCircle2,
  Bookmark,
  Bell,
  ArrowRight,
  ShieldCheck,
  Flame,
  Check,
  Lock,
} from "lucide-react";
import { DemoAuthModal } from "./DemoAuthModal";

export default function DemoPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "ready" | "cooldown">("all");

  // Live ticking cooldown timer for Card 2 (starting at 4h 12m 30s)
  const [timerSeconds, setTimerSeconds] = useState(4 * 3600 + 12 * 60 + 30);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedCooldown = useMemo(() => {
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    const seconds = timerSeconds % 60;
    return `${String(hours).padStart(2, "0")}h:${String(minutes).padStart(2, "0")}m:${String(seconds).padStart(2, "0")}s`;
  }, [timerSeconds]);

  // Intercept any demo action and launch the auth modal with custom context
  const handleAction = (context: string) => {
    setModalContext(context);
    setAuthModalOpen(true);
  };

  const cardsData = [
    {
      id: "stake",
      name: "Stake.us",
      logoText: "ST",
      logoBg: "from-blue-600 to-indigo-900",
      bonusType: "Daily Reload",
      bonusAmount: "$1.00 SC Daily",
      rating: 4.9,
      status: "ready" as const,
      timerText: "00:00:00",
      statusBadge: "Ready to Claim",
      badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      actionText: "Claim $1.00",
      description: "One-click claim available every 24 hours.",
    },
    {
      id: "mcluck",
      name: "McLuck",
      logoText: "MC",
      logoBg: "from-amber-600 to-red-900",
      bonusType: "Drop Code / Reload",
      bonusAmount: "0.25 SC Exclusive Drop",
      rating: 4.6,
      status: "cooldown" as const,
      timerText: formattedCooldown,
      statusBadge: `Resets in ${formattedCooldown}`,
      badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      actionText: "Reset Timer",
      description: "Active drop timer running. Click to sync reset time.",
    },
    {
      id: "crown-coins",
      name: "Crown Coins",
      logoText: "CC",
      logoBg: "from-amber-500 to-yellow-800",
      bonusType: "Hourly Wheel Spin",
      bonusAmount: "Up to 2.50 SC Bonus",
      rating: 4.8,
      status: "ready" as const,
      timerText: "00:00:00",
      statusBadge: "Wheel Spin Ready",
      badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      actionText: "Spin Wheel",
      description: "Hourly lucky prize wheel ready to spin.",
      isWheel: true,
    },
    {
      id: "high-5",
      name: "High 5 Casino",
      logoText: "H5",
      logoBg: "from-cyan-600 to-blue-900",
      bonusType: "VIP & Speed-Run",
      bonusAmount: "1.00 SC + 2 Diamonds",
      rating: 4.7,
      status: "ready" as const,
      timerText: "00:00:00",
      statusBadge: "⚡ Speed-Run Eligible",
      badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      actionText: "⚡ Speed-Run Claim",
      description: "High-speed auto-launch claim verified.",
      isSpeedRun: true,
    },
  ];

  const filteredCards = cardsData.filter((card) => {
    const matchesSearch =
      card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.bonusAmount.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.bonusType.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterTab === "ready") return card.status === "ready";
    if (filterTab === "cooldown") return card.status === "cooldown";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#060f0b] text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950 flex flex-col font-sans">
      {/* 1. Top Teaser / Preview Mode Banner */}
      <div className="w-full bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/20 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">👀</span>
            <span className="font-semibold">
              Preview Mode: <span className="font-normal text-amber-100/90">You are viewing demo data. Sign up to customize your casino list and save timers.</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleAction("Sign up to customize your casino list and save timers")}
              className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs shadow-sm hover:brightness-110 active:translate-y-0.5 transition-all cursor-pointer"
            >
              Sign Up Free ↗
            </button>
            <Link
              href="/sign-in"
              className="text-xs font-semibold text-zinc-300 hover:text-white underline underline-offset-2"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top Notification / Live Rollcall Banner */}
      <div className="w-full bg-[#081711] border-b border-emerald-950/80 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Live Activity Indicator Pulse */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#39ff6a]" />
            </span>
            <span className="font-bold text-emerald-300 text-[11px] sm:text-xs">
              Live Activity: <span className="font-normal text-zinc-300">1,842 bonuses claimed today across 18 casinos</span>
            </span>
          </div>

          {/* Rollcall Items Ticker */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-none text-[11px] text-zinc-300">
            <span className="flex items-center gap-1.5 shrink-0 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <strong className="text-white font-bold">Stake.us:</strong> $1.00 Daily Available
            </span>
            <span className="flex items-center gap-1.5 shrink-0 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <strong className="text-white font-bold">Chumba:</strong> 1 SC Ready
            </span>
            <span className="flex items-center gap-1.5 shrink-0 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md text-zinc-400">
              <Clock size={10} className="text-zinc-500" />
              <strong className="text-zinc-300 font-bold">Pulsz:</strong> Claimed 2h ago
            </span>
            <span className="hidden md:flex items-center gap-1.5 shrink-0 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              <strong className="text-white font-bold">Crown Coins:</strong> Wheel Spin Ready
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation & Toolbar Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-700 flex items-center justify-center text-zinc-950 font-black text-lg shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              🎲
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Daily Rollcall Dashboard
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Demo Preview
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Track daily rewards, sync cooldowns, and auto-claim bonuses in one dashboard.
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Speed-Run Button */}
            <button
              type="button"
              onClick={() => handleAction("⚡ Speed-Run opens all eligible casinos in rapid succession")}
              className="h-9 px-3.5 rounded-xl bg-gradient-to-b from-amber-400 via-amber-500 to-yellow-600 hover:brightness-110 active:translate-y-0.5 text-zinc-950 text-xs font-black shadow-[0_2px_12px_rgba(245,158,11,0.35)] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Zap size={14} className="fill-zinc-950 stroke-[2.5]" />
              <span>Start Speed-Run</span>
            </button>

            {/* Add Casino Button */}
            <button
              type="button"
              onClick={() => handleAction("Add any of 25+ verified sweepstakes casinos to your list")}
              className="h-9 px-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Casino</span>
            </button>

            {/* Reset All Timers Button */}
            <button
              type="button"
              onClick={() => handleAction("Reset your countdown timers back to ready")}
              className="h-9 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Reset Timers</span>
            </button>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-bold w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterTab === "all"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All (4)
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("ready")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterTab === "ready"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Ready to Claim (3)
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("cooldown")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterTab === "cooldown"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              On Cooldown (1)
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search demo casinos..."
              className="w-full h-9 rounded-xl border border-zinc-800 bg-zinc-900/60 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
        </div>

        {/* 3. Grid with 4 Example Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCards.map((card) => {
            const isReady = card.status === "ready";

            return (
              <div
                key={card.id}
                className={`group relative rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 cursor-pointer select-none ${
                  isReady
                    ? "bg-gradient-to-b from-[#0c2217] to-[#07150e] border border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_8px_24px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.15)]"
                    : "bg-gradient-to-b from-[#181d18] to-[#0d120f] border border-amber-500/30 hover:border-amber-500/50 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                }`}
                onClick={() => handleAction(`Claiming ${card.name} requires a free account`)}
              >
                {/* Card Top Section */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      {/* Logo Avatar */}
                      <div
                        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${card.logoBg} flex items-center justify-center font-black text-sm text-white shadow-inner`}
                      >
                        {card.logoText}
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1">
                          <span>{card.name}</span>
                          <ExternalLink size={12} className="text-zinc-500 group-hover:text-emerald-400" />
                        </h2>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                          <span className="text-amber-400 font-bold">★ {card.rating}</span>
                          <span>•</span>
                          <span>{card.bonusType}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Pin / Reminder Icons */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleAction(`Pinning ${card.name} to your favorites`)}
                        title="Pin to top"
                        className="p-1 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-zinc-800/60 transition cursor-pointer"
                      >
                        <Bookmark size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(`Set custom reminder for ${card.name}`)}
                        title="Set reminder"
                        className="p-1 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800/60 transition cursor-pointer"
                      >
                        <Bell size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Status & Live Timer Box */}
                  <div className="my-3 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Cooldown Status
                      </span>
                      <span
                        className={`font-mono text-sm font-bold tracking-tight ${
                          isReady ? "text-emerald-400" : "text-amber-300"
                        }`}
                      >
                        {card.timerText}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${card.badgeColor}`}
                    >
                      {isReady ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ) : (
                        <Clock size={11} className="text-amber-400" />
                      )}
                      <span>{card.statusBadge}</span>
                    </span>
                  </div>

                  {/* Bonus Details */}
                  <div className="mb-4">
                    <p className="text-xs font-black text-white">{card.bonusAmount}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{card.description}</p>
                  </div>
                </div>

                {/* Card Action Button */}
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleAction(`Claiming ${card.name} daily bonus`)}
                    className={`w-full h-10 rounded-xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5 ${
                      isReady
                        ? "bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 hover:brightness-110 text-white border-t border-emerald-300/40 shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
                        : "bg-gradient-to-b from-zinc-800 to-zinc-900 hover:from-zinc-750 hover:to-zinc-850 text-amber-300 border border-amber-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                    }`}
                  >
                    <span>{card.actionText}</span>
                    {isReady ? (
                      <ArrowRight size={14} className="stroke-[2.5]" />
                    ) : (
                      <RotateCcw size={13} className="text-amber-400" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Teaser Grid / Why Sign Up Section */}
        <div className="mt-10 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 p-6 sm:p-8 backdrop-blur">
          <div className="max-w-2xl mx-auto text-center space-y-2 mb-6">
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Ready to automate your sweepstakes claims?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Daily Roll members save an average of 45 minutes every day while never missing another reset window.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                ⚡
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Speed-Run Multi-Claim</h4>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Launch all your ready casinos in background tabs with a single tap.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 font-bold">
                ⏰
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Cloud Device Sync</h4>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Start a claim on your phone, see exact cooldown countdowns on your desktop.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 font-bold">
                🎁
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Live Drop Code Alerts</h4>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Crowdsourced and verified promo drops updated every 5 minutes by the community.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleAction("Sign up to save all your casino cooldown timers")}
              className="w-full sm:w-auto h-11 px-8 rounded-xl bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 hover:brightness-110 active:translate-y-0.5 text-white text-xs font-black shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Create Free Account in 10 Seconds</span>
              <ArrowRight size={15} />
            </button>
            <span className="text-xs text-zinc-500 font-medium">100% Free • No credit card required</span>
          </div>
        </div>
      </div>

      {/* Auth Gate Modal Interceptor */}
      <DemoAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        triggerContext={modalContext}
      />
    </div>
  );
}
