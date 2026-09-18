"use client";

import { useEffect, useState } from "react";
import { Activity, X, RefreshCw, Award, Zap, Layers, Clock } from "lucide-react";
import type { ActivityEvent } from "@/lib/activity";

interface UserActivityInspectorModalProps {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatRelativeTime(timestamp: number | string | null | undefined): string {
  if (!timestamp) return "Never";
  const ms = typeof timestamp === "string" ? Number(timestamp) : timestamp;
  if (isNaN(ms) || ms <= 0) return "Never";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSeconds < 60) return "Just now";
  const diffMins = Math.floor(diffSeconds / 60);
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function formatClockTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `[${hours}:${minutes}]`;
}

function renderEventLabel(event: ActivityEvent): string {
  const d = event.details || {};
  switch (event.type) {
    case "CLAIM":
      return `Claimed ${d.amount || "bonus"} at ${d.casinoName || d.casinoId || "Casino"}`;
    case "CASINO_ADDED":
      return `Added ${d.name || d.casinoId || "Casino"} to Rollcall`;
    case "CASINO_REMOVED":
      return `Removed ${d.name || d.casinoId || "Casino"} from Rollcall`;
    case "SPEED_RUN_STARTED":
      return `Started Speed Run (${d.queueLength || 0} casinos)`;
    case "SPEED_RUN_COMPLETED":
      return `Completed Speed Run (${d.queueLength || 0} casinos)`;
    case "BALANCE_EDIT":
      return `Updated balance to ${d.newBalance} SC at ${d.casinoId || "Casino"}`;
    case "SIGNUP":
      return `Signed up for DailyRoll`;
    case "LOGIN":
      return `Logged into account`;
    default:
      return `${event.type}`;
  }
}

export function UserActivityInspectorModal({
  user,
  isOpen,
  onClose,
}: UserActivityInspectorModalProps) {
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [log, setLog] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = async () => {
    if (!user?.email) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.email)}/activity`);
      if (!res.ok) {
        if (res.status === 403) {
          setError("403 Forbidden: Admin privileges required.");
        } else {
          setError("Failed to fetch user telemetry.");
        }
        return;
      }
      const data = await res.json();
      setSummary(data.summary || {});
      setLog(data.log || []);
    } catch (err) {
      console.error("Error loading activity:", err);
      setError("Network error loading activity.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.email) {
      fetchActivity();
    } else if (!isOpen) {
      setSummary({});
      setLog([]);
    }
  }, [isOpen, user?.email]);

  if (!isOpen || !user) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="telemetry-modal-title"
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-emerald-500/25 bg-zinc-950 p-6 shadow-2xl space-y-5 text-zinc-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-emerald-950 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h2 id="telemetry-modal-title" className="font-serif text-xl font-bold text-white tracking-tight">
                Activity Telemetry Inspector
              </h2>
            </div>
            <p className="text-xs text-emerald-400/90 font-medium mt-1">{user.email}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400/70" />
              <span>Last Active: </span>
              <strong className="text-zinc-200">{formatRelativeTime(summary.last_active)}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchActivity}
              disabled={isLoading}
              title="Refresh telemetry data"
              className="p-1.5 text-zinc-400 hover:text-emerald-300 rounded-lg hover:bg-zinc-900 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Stat Badges */}
        <div className="grid grid-cols-3 gap-3">
          {/* Total Claims */}
          <div className="p-3 bg-zinc-900/90 border border-emerald-500/20 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/80 flex items-center gap-1">
              <Award className="w-3 h-3 text-emerald-400 shrink-0" />
              Total Claims
            </span>
            <span className="text-lg font-black text-emerald-400 mt-1">
              {summary.total_claims ?? 0}
            </span>
          </div>

          {/* Speed Runs Run */}
          <div className="p-3 bg-zinc-900/90 border border-emerald-500/20 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/80 flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
              Speed Runs
            </span>
            <span className="text-lg font-black text-emerald-400 mt-1">
              {summary.speed_runs ?? 0}
            </span>
          </div>

          {/* Casinos Added */}
          <div className="p-3 bg-zinc-900/90 border border-emerald-500/20 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/80 flex items-center gap-1">
              <Layers className="w-3 h-3 text-emerald-400 shrink-0" />
              Casinos Added
            </span>
            <span className="text-lg font-black text-emerald-400 mt-1">
              {summary.total_casinos_added ?? 0}
            </span>
          </div>
        </div>

        {/* Activity Feed List */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-2.5">
            Telemetry Event Log
          </h3>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-2" />
              Fetching activity telemetry...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-center text-xs text-red-300">
              {error}
            </div>
          ) : log.length === 0 ? (
            <div className="p-6 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl text-center text-xs text-zinc-500">
              No recorded activity events for this user yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {log.map((event, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-zinc-900/80 border border-emerald-500/10 rounded-xl flex items-center justify-between text-xs transition-colors hover:border-emerald-500/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-emerald-400 shrink-0">
                      {formatClockTime(event.timestamp)}
                    </span>
                    <span className="font-medium text-zinc-200 truncate">
                      {renderEventLabel(event)}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 shrink-0 ml-2">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
