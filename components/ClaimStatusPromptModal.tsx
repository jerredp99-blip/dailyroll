import React from 'react';
import { Gift } from 'lucide-react';

interface ClaimStatusPromptModalProps {
  isOpen: boolean;
  casinoName: string;
  onConfirmClaimed: () => void;
  onConfirmReady: () => void;
}

export function ClaimStatusPromptModal({
  isOpen,
  casinoName,
  onConfirmClaimed,
  onConfirmReady,
}: ClaimStatusPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-emerald-500/30 p-5 shadow-2xl flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-3">
          <Gift className="w-6 h-6 text-emerald-400" />
        </div>

        <h3 className="text-base font-black text-white mb-1">
          Added {casinoName}!
        </h3>
        <p className="text-xs text-zinc-300 mb-5">
          Did you already claim today&apos;s bonus for {casinoName}?
        </p>

        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            type="button"
            onClick={onConfirmReady}
            className="h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors cursor-pointer"
          >
            No, Ready Now
          </button>
          <button
            type="button"
            onClick={onConfirmClaimed}
            className="h-10 rounded-xl bg-gradient-to-b from-emerald-500 to-teal-700 hover:brightness-110 text-white text-xs font-bold shadow-[0_2px_10px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
          >
            Yes, Claimed!
          </button>
        </div>
      </div>
    </div>
  );
}
