"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Clock, X, CheckCircle2, Coins } from "lucide-react";
import type { Casino } from "@/types/casino";
import { calculateCustomResetTimestamp } from "@/lib/timerUtils";
import { parseScReward } from "@/lib/speedRunStorage";

export interface CustomTimerModalProps {
  isOpen: boolean;
  casino?: Casino | null;
  casinoId?: string;
  casinoName?: string;
  currentRemainingMs?: number;
  initialSc?: string | number;
  onClose: () => void;
  onSave: (target: Casino | string, targetResetTimestamp: number, customSc?: number) => void;
}

const PRESET_HOURS = [
  { label: "10s (Test)", h: 0, m: 0, s: 10 },
  { label: "15m", h: 0, m: 15, s: 0 },
  { label: "1h", h: 1, m: 0, s: 0 },
  { label: "4h", h: 4, m: 0, s: 0 },
  { label: "12h", h: 12, m: 0, s: 0 },
  { label: "24h", h: 24, m: 0, s: 0 },
];

export function CustomTimerModal({
  isOpen,
  casino,
  casinoId,
  casinoName,
  currentRemainingMs,
  initialSc,
  onClose,
  onSave,
}: CustomTimerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [scAmount, setScAmount] = useState<string>("");
  const modalRef = useRef<HTMLDivElement>(null);
  const hoursInputRef = useRef<HTMLInputElement>(null);

  const displayName = casino?.name || casinoName || "Casino";
  const targetIdentifier = casino || casinoId || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  const lastOpenedKeyRef = useRef<string | null>(null);

  // Initialize or prefill hours, minutes, and SC amount ONLY when modal first opens
  useEffect(() => {
    const currentKey = isOpen ? (casino?.id || casinoId || casinoName || "open") : null;
    if (!isOpen || !currentKey) {
      lastOpenedKeyRef.current = null;
      return;
    }

    // Only populate on fresh modal open, never on ticking background remainingMs
    if (lastOpenedKeyRef.current !== currentKey) {
      lastOpenedKeyRef.current = currentKey;

      if (currentRemainingMs && currentRemainingMs > 0) {
        const totalMinutes = Math.ceil(currentRemainingMs / 60000);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        setHours(h > 0 ? String(h) : "");
        setMinutes(m > 0 ? String(m) : "");
      } else {
        setHours("");
        setMinutes("");
      }

      if (initialSc !== undefined) {
        setScAmount(String(initialSc));
      } else if (casino?.dailyBonusSc) {
        setScAmount(String(casino.dailyBonusSc));
      } else if (casino?.dailyBonus) {
        const parsed = parseScReward(casino.dailyBonus);
        setScAmount(parsed > 0 ? String(parsed) : "");
      } else {
        setScAmount("");
      }

      // Auto-focus and select the hours input after modal opens
      const timer = setTimeout(() => {
        hoursInputRef.current?.focus();
        hoursInputRef.current?.select();
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isOpen, casino?.id, casinoId, casinoName]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSave = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const h = parseInt(hours || "0", 10);
    const m = parseInt(minutes || "0", 10);
    const s = parseInt(seconds || "0", 10);
    if (isNaN(h) && isNaN(m) && isNaN(s)) return;

    const finalHours = Math.max(0, isNaN(h) ? 0 : h);
    const finalMinutes = Math.max(0, isNaN(m) ? 0 : m);
    const finalSeconds = Math.max(0, isNaN(s) ? 0 : s);

    // If all 0, set targetResetTimestamp to Date.now() - 1000 so it immediately becomes "Ready to claim"
    let targetResetTimestamp: number;
    if (finalHours === 0 && finalMinutes === 0 && finalSeconds === 0) {
      targetResetTimestamp = Date.now() - 1000;
    } else if (finalHours === 0 && finalMinutes === 0 && finalSeconds > 0) {
      targetResetTimestamp = Date.now() + finalSeconds * 1000;
    } else {
      targetResetTimestamp = calculateCustomResetTimestamp(finalHours, finalMinutes) + finalSeconds * 1000;
    }

    const parsedSc = scAmount.trim() !== "" ? parseFloat(scAmount) : undefined;
    const finalSc = typeof parsedSc === "number" && !isNaN(parsedSc) ? parsedSc : undefined;
    onSave(targetIdentifier, targetResetTimestamp, finalSc);
    onClose();
  };

  const applyPreset = (h: number, m: number, s: number = 0) => {
    setHours(h > 0 ? String(h) : "");
    setMinutes(m > 0 ? String(m) : "");
    setSeconds(s > 0 ? String(s) : "");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-timer-title"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-[#1b3d2f] bg-[#0c1f17] text-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-emerald-900/60 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
              <Clock size={16} />
            </div>
            <div className="min-w-0">
              <h2 id="custom-timer-title" className="text-sm font-bold text-[#e5eee3] truncate">
                Set Custom Timer
              </h2>
              <p className="text-xs text-emerald-400/90 truncate font-medium">
                {displayName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded-lg p-1 text-gray-400 hover:bg-emerald-900/40 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-4" onClick={(e) => e.stopPropagation()}>
          {/* Hours, Minutes & Seconds Input */}
          <div>
            <label className="block text-xs font-semibold text-[#8ea794] mb-1.5">
              Exact Cooldown Remaining:
            </label>
            <div className="flex items-center justify-center gap-1.5 bg-[#09130e] border border-emerald-900/80 rounded-xl p-3">
              <div className="flex items-center gap-1">
                <input
                  ref={hoursInputRef}
                  type="number"
                  min="0"
                  max="72"
                  placeholder="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-14 rounded-lg border border-[#395040] bg-[#101e16] px-1.5 py-1.5 text-center text-sm font-mono font-bold text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                />
                <span className="text-[11px] font-semibold text-gray-400">h</span>
              </div>
              <span className="text-gray-500 font-bold">:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-14 rounded-lg border border-[#395040] bg-[#101e16] px-1.5 py-1.5 text-center text-sm font-mono font-bold text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                />
                <span className="text-[11px] font-semibold text-gray-400">m</span>
              </div>
              <span className="text-gray-500 font-bold">:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  className="w-14 rounded-lg border border-[#395040] bg-[#101e16] px-1.5 py-1.5 text-center text-sm font-mono font-bold text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                />
                <span className="text-[11px] font-semibold text-gray-400">s</span>
              </div>
            </div>
          </div>

          {/* Sweeps Coins (SC) Claim Value Input */}
          <div>
            <label className="block text-xs font-semibold text-[#8ea794] mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Coins size={13} className="text-emerald-400" />
                Claim / Reward Value (SC):
              </span>
              <span className="text-[10px] text-[#6d8a74] font-normal">Optional cycle reward</span>
            </label>
            <div className="flex items-center gap-2 bg-[#09130e] border border-emerald-900/80 rounded-xl px-3 py-2">
              <span className="text-emerald-400 font-bold text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="1.00"
                value={scAmount}
                onChange={(e) => setScAmount(e.target.value)}
                className="w-full bg-transparent text-sm font-mono font-bold text-white outline-none placeholder-zinc-600 focus:text-emerald-300"
              />
              <span className="text-xs font-semibold text-emerald-400/90 uppercase">SC</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="block text-[11px] font-semibold text-[#6d8a74] mb-1.5">
              Quick Cooldown Presets:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {PRESET_HOURS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.h, preset.m, preset.s)}
                  className="rounded-lg border border-[#2b4433] bg-[#112217] py-1.5 text-xs font-bold text-gray-300 hover:border-emerald-500 hover:bg-emerald-950/70 hover:text-emerald-300 transition cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-900/50">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="rounded-lg border border-[#395040] bg-[#14221a] px-3.5 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#1a2d21] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-[#39ff6a] px-4 py-1.5 text-xs font-extrabold text-[#0d1712] shadow-[0_4px_12px_rgba(57,255,106,0.3)] transition hover:bg-[#5aff84] active:scale-95 cursor-pointer"
            >
              <CheckCircle2 size={14} strokeWidth={2.5} />
              <span>Apply Timer</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default CustomTimerModal;

