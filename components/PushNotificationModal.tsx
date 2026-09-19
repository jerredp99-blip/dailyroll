"use client";

import React from "react";
import { Bell, BellOff, X, ExternalLink, Share, CheckCircle2, AlertTriangle } from "lucide-react";

interface PushNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "denied" | "ios_install" | "general_error" | "info";
  customMessage?: string | null;
  onRetry?: () => void;
}

export function PushNotificationModal({
  isOpen,
  onClose,
  type,
  customMessage,
  onRetry,
}: PushNotificationModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#203728] bg-[#0c1611] p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                type === "denied"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                  : type === "ios_install"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {type === "denied" ? (
                <BellOff size={20} />
              ) : type === "ios_install" ? (
                <Share size={20} />
              ) : (
                <Bell size={20} />
              )}
            </div>
            <div>
              <h3
                id="notification-modal-title"
                className="text-base font-bold text-white leading-tight"
              >
                {type === "denied"
                  ? "Notifications are Blocked"
                  : type === "ios_install"
                  ? "Install to Home Screen First"
                  : "Notification Alert"}
              </h3>
              <p className="text-xs text-[#8ca592] mt-0.5">
                {type === "denied"
                  ? "Browser permission is currently denied"
                  : type === "ios_install"
                  ? "Required for push alerts on iOS"
                  : "Daily Roll push notification service"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800/50 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="text-xs text-zinc-300 space-y-3 pt-2">
          {type === "denied" && (
            <>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-rose-200/90 leading-relaxed">
                Your browser or system settings are blocking notifications for Daily Roll. Cooldown reminders cannot be delivered until permission is granted.
              </div>

              <div className="space-y-2 text-zinc-400">
                <p className="font-semibold text-zinc-200">How to unblock in your browser:</p>
                <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed text-[11px]">
                  <li>
                    Look at the left side of the address bar above and tap the{" "}
                    <strong className="text-zinc-200">Site Settings / Lock / Tune</strong> icon.
                  </li>
                  <li>
                    Find <strong className="text-zinc-200">Notifications</strong> and change the setting to{" "}
                    <strong className="text-emerald-400">Allow</strong>.
                  </li>
                  <li>Refresh this page and tap the bell icon again.</li>
                </ol>
              </div>
            </>
          )}

          {type === "ios_install" && (
            <>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-amber-200/90 leading-relaxed">
                Apple requires Progressive Web Apps on iPhone and iPad to be added to the Home Screen before Web Push Notifications can be enabled.
              </div>

              <div className="space-y-2 text-zinc-400">
                <p className="font-semibold text-zinc-200">Quick 3-step setup:</p>
                <ol className="list-decimal pl-4 space-y-2 leading-relaxed text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <span>1. Tap the</span>
                    <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200 font-mono text-[10px] border border-zinc-700">
                      <Share size={11} /> Share
                    </span>
                    <span>button in Safari toolbar.</span>
                  </li>
                  <li>
                    2. Scroll down and tap{" "}
                    <strong className="text-emerald-400">&ldquo;Add to Home Screen&rdquo;</strong>.
                  </li>
                  <li>
                    3. Open <strong className="text-zinc-100">Daily Roll</strong> from your home screen and tap the bell icon to turn on alerts!
                  </li>
                </ol>
              </div>
            </>
          )}

          {(type === "general_error" || type === "info") && (
            <p className="leading-relaxed text-zinc-300">
              {customMessage || "An error occurred while setting up push notifications."}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition cursor-pointer"
          >
            Got it
          </button>
          {onRetry && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRetry();
              }}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition cursor-pointer"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

