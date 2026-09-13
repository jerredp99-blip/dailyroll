"use client";

import { useState } from "react";
import { TrendingUp, DollarSign, Calendar, Target, Award, Sparkles } from "lucide-react";
import type { Casino } from "@/lib/store";

function extractBonusAmount(dailyBonus: string): number {
  if (!dailyBonus) return 0;
  const match = dailyBonus.match(/[0-9]+(?:\.[0-9]+)?/);
  return match ? parseFloat(match[0]) : 0;
}

export function BankrollSummary({
  casinos,
  claimedToday = 0,
}: {
  casinos: Casino[];
  claimedToday?: number;
}) {
  const [cashoutTarget, setCashoutTarget] = useState<50 | 100>(50);

  // Active casinos (excluding hidden)
  const activeCasinos = casinos.filter((c) => !c.hidden);

  // Calculate daily passive potential
  const dailyYield = activeCasinos.reduce((sum, casino) => {
    return sum + extractBonusAmount(casino.dailyBonus);
  }, 0);

  const monthlyYield = dailyYield * 30;
  const yearlyYield = dailyYield * 365;

  // Days to reach target threshold
  const daysToTarget = dailyYield > 0 ? Math.ceil(cashoutTarget / dailyYield) : 0;
  
  // Progress towards 30-day target or claimed today progress
  const targetMonthlyProgress = Math.min(100, Math.round((monthlyYield / cashoutTarget) * 100));

  return (
    <section
      aria-label="Bankroll and Yield Analytics"
      className="rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-[#122219] via-[#0d1813] to-[#101914] p-4 sm:p-5 shadow-[0_12px_32px_rgba(0,0,0,0.35)] relative overflow-hidden"
    >
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-[#39ff6a]/5 blur-3xl" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#213829]/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#254231] text-emerald-300 shadow-inner">
            <TrendingUp size={16} />
          </div>
          <div>
            <h3 className="text-xs font-mono uppercase tracking-[0.16em] text-[#8ca592]">
              Value Analytics
            </h3>
            <p className="text-sm font-semibold text-[#e5eee3]">
              Bankroll & Projected Yield
            </p>
          </div>
        </div>

        {/* Active casinos badge */}
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-800/40 bg-[#14261d] px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
          <Sparkles size={12} className="text-[#39ff6a]" />
          {activeCasinos.length} Active Rolls
        </span>
      </div>

      {/* Primary Stats Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* Daily Passive Yield */}
        <div className="rounded-xl border border-[#263e2f] bg-[#111e17]/80 p-3 shadow-inner">
          <p className="flex items-center gap-1 text-[11px] font-medium text-[#8ea394]">
            <DollarSign size={13} className="text-[#39ff6a]" />
            Daily Passive Yield
          </p>
          <p className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-[#39ff6a]">
            ${dailyYield.toFixed(2)}{" "}
            <span className="text-xs font-normal text-[#8ea394]">SC / day</span>
          </p>
        </div>

        {/* 30-Day Projection */}
        <div className="rounded-xl border border-[#263e2f] bg-[#111e17]/80 p-3 shadow-inner">
          <p className="flex items-center gap-1 text-[11px] font-medium text-[#8ea394]">
            <Calendar size={13} className="text-teal-400" />
            30-Day Projection
          </p>
          <p className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-[#9bcf9c]">
            ${monthlyYield.toFixed(2)}{" "}
            <span className="text-xs font-normal text-[#8ea394]">/ mo</span>
          </p>
        </div>

        {/* Claimed Today / Annual */}
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#263e2f] bg-[#111e17]/80 p-3 shadow-inner">
          <p className="flex items-center gap-1 text-[11px] font-medium text-[#8ea394]">
            <Award size={13} className="text-amber-400" />
            Annual Potential
          </p>
          <p className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-[#e6c179]">
            ${yearlyYield.toFixed(2)}{" "}
            <span className="text-xs font-normal text-[#8ea394]">/ yr</span>
          </p>
        </div>
      </div>

      {/* Cashout Goal Target Tracker */}
      <div className="mt-4 rounded-xl border border-[#23382a] bg-[#0d1712] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-[#39ff6a]" />
            <span className="text-xs font-semibold text-[#d4e2d4]">
              Redemption Milestone
            </span>
          </div>

          {/* $50 vs $100 Segmented Switcher */}
          <div className="flex rounded-lg bg-[#16271e] p-0.5 border border-[#2d4936]">
            <button
              type="button"
              onClick={() => setCashoutTarget(50)}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                cashoutTarget === 50
                  ? "bg-[#254231] text-white shadow-sm ring-1 ring-emerald-500/50"
                  : "text-[#85a08b] hover:text-white"
              }`}
            >
              $50 Goal
            </button>
            <button
              type="button"
              onClick={() => setCashoutTarget(100)}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                cashoutTarget === 100
                  ? "bg-[#254231] text-white shadow-sm ring-1 ring-emerald-500/50"
                  : "text-[#85a08b] hover:text-white"
              }`}
            >
              $100 Goal
            </button>
          </div>
        </div>

        {/* Progress Bar & Pace Estimation */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-[#8ca892] mb-1.5 font-mono">
            <span>
              Pace:{" "}
              <strong className="text-emerald-300">
                {targetMonthlyProgress}% of ${cashoutTarget} / mo
              </strong>
            </span>
            <span>
              {daysToTarget > 0 ? (
                <span className="text-[#e5eee3]">
                  ~<strong className="text-[#39ff6a]">{daysToTarget} days</strong> to cashout
                </span>
              ) : (
                "Add rolls to project"
              )}
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-[#1b2d22]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-[#39ff6a] to-teal-400 transition-all duration-500 shadow-[0_0_12px_rgba(57,255,106,0.6)]"
              style={{ width: `${Math.max(4, Math.min(100, targetMonthlyProgress))}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
