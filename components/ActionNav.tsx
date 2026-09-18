import Link from 'next/link';
import { Gift } from 'lucide-react';

interface NavActionsProps {
  unclaimedBonusDropsCount: number;
  onOpenChat?: () => void;
}

export function ActionNav({ unclaimedBonusDropsCount }: NavActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Bonus Drops Button with Notification Badge */}
      <Link
        href="/bonus-drops"
        className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors text-sm font-medium"
      >
        <Gift className="w-4 h-4" />
        <span>Bonus Drops</span>

        {unclaimedBonusDropsCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[1.125rem] h-[1.125rem] px-1 text-[10px] font-bold text-black bg-emerald-400 rounded-full shadow-sm animate-pulse">
            {unclaimedBonusDropsCount > 99 ? '99+' : unclaimedBonusDropsCount}
          </span>
        )}
      </Link>
    </div>
  );
}
