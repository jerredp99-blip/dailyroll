"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Clock, X, CheckCircle2 } from "lucide-react";
import type { Casino } from "@/types/casino";
import { calculateCustomResetTimestamp } from "@/lib/timerUtils";

export interface CustomTimerModalProps {
  isOpen: boolean;
  casino?: Casino | null;
  casinoId?: string;
  casinoName?: string;
  currentRemainingMs?: number;
  onClose: () => void;
  onSave: (target: Casino | string, targetResetTimestamp: number) => void;
}

const PRESET_HOURS = [
  { label: "15m", h: 0, m: 15 },
  { label: "1h", h: 1, m: 0 },
  { label: "4h", h: 4, m: 0 },
  { label: "12h", h: 12, m: 0 },
  { label: "24h", h: 24, m: 0 },
];

export function CustomTimerModal({
  isOpen,
  casino,
  casinoId,
  casinoName,
  currentRemainingMs,
  onClose,
  onSave,
}: CustomTimerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const hoursInputRef = useRef<HTMLInputElement>(null);

  const displayName = casino?.name || casinoName || "Casino";
  const targetIdentifier = casino || casinoId || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize or prefill hours and minutes when modal opens
  useEffect(() => {
    if (!isOpen) return;

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

    // Auto-focus the hours input after modal opens
    const timer = setTimeout(() => {
      hoursInputRef.current?.focus();
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, currentRemainingMs]);

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
    if (isNaN(h) && isNaN(m)) return;

    const finalHours = Math.max(0, isNaN(h) ? 0 : h);
    const finalMinutes = Math.max(0, isNaN(m) ? 0 : m);

    const targetResetTimestamp = calculateCustomResetTimestamp(finalHours, finalMinutes);
    onSave(targetIdentifier, targetResetTimestamp);
    onClose();
  };

  const applyPreset = (h: number, m: number) => {
    setHours(h > 0 ? String(h) : "");
    setMinutes(m > 0 ? String(m) : "");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
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
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
              <Clock size={16} />
            </div>
            <div className="min-w-0">
              <h2 id="custom-timer-title" className="text-sm font-bold text-zinc-100 truncate">
                Set Custom Timer
              </h2>
              <p className="text-xs text-emerald-400 truncate font-medium">
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
            aria-label="Close custom timer modal"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800/80 hover:text-white transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="mt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Exact Cooldown Remaining:
            </label>
            <div className="flex items-center justify-center gap-2 bg-zinc-950/80 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5">
                <input
                  ref={hoursInputRef}
                  type="number"
                  min="0"
                  max="72"
                  placeholder="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-16 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-center text-sm font-mono font-bold text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                />
                <span className="text-xs font-semibold text-zinc-400">hours</span>
              </div>
              <span className="text-zinc-600 font-bold">:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-16 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-center text-sm font-mono font-bold text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                />
                <span className="text-xs font-semibold text-zinc-400">mins</span>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="block text-[11px] font-semibold text-zinc-500 mb-1.5">
              Quick Cooldown Presets:
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_HOURS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.h, preset.m)}
                  className="rounded-lg border border-zinc-800 bg-zinc-800/60 py-1.5 text-xs font-bold text-zinc-300 hover:border-emerald-500 hover:bg-emerald-950/50 hover:text-emerald-300 transition cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-zinc-950 shadow-sm transition hover:bg-emerald-400 active:scale-95 cursor-pointer"
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

