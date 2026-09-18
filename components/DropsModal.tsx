"use client";

import React, { useState } from "react";
import { Gift, X } from "lucide-react";
import { SocialFeed } from "@/app/components/feed/SocialFeed";
import type { Casino } from "@/types/casino";

export interface DropsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  isAdmin?: boolean;
  casinos?: Casino[];
  onClaimCasino?: (casino: Casino) => void;
  isBonusDropsOpen?: boolean;
  setIsBonusDropsOpen?: (open: boolean) => void;
  isAddCasinosOpen?: boolean;
  setIsAddCasinosOpen?: (open: boolean) => void;
  onOpenAddCasinos?: () => void;
}

export function DropsModal({
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
  const [showActiveDropsCasinos, setShowActiveDropsCasinos] = useState(false);
  const effectiveIsOpen = isOpen ?? isBonusDropsOpen ?? false;
  if (!effectiveIsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drops-modal-title"
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
            <h3 id="drops-modal-title" className="text-sm font-black text-white tracking-wide">
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
          <SocialFeed
            compact={true}
            initialType="drop_code"
            hideComposer={true}
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
            showActiveDropsCasinos={showActiveDropsCasinos}
            setShowActiveDropsCasinos={setShowActiveDropsCasinos}
          />
        </div>
      </div>
    </div>
  );
}

export default DropsModal;

