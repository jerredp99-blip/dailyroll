"use client";

import React from "react";
import { MessageSquare, X } from "lucide-react";
import { SocialFeed } from "@/app/components/feed/SocialFeed";
import type { Casino } from "@/types/casino";

export interface FeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  isAdmin?: boolean;
  casinos?: Casino[];
  onClaimCasino?: (casino: Casino) => void;
}

export function FeedModal({
  isOpen,
  onClose,
  currentUserEmail,
  currentUserName,
  currentUserAvatar,
  isAdmin,
  casinos,
  onClaimCasino,
}: FeedModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feed-modal-title"
    >
      {/* Centered Modal Container */}
      <div
        className="relative w-full max-w-lg max-h-[88vh] bg-zinc-950/95 border border-emerald-500/25 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h3 id="feed-modal-title" className="text-sm font-black text-white tracking-wide">
              Community Feed
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
          <SocialFeed
            compact={true}
            initialType="all"
            currentUserEmail={currentUserEmail}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            isAdmin={isAdmin}
            casinos={casinos}
            onClaimCasino={onClaimCasino}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

export default FeedModal;

