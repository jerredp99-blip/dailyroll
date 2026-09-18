interface ActiveBadgeProps {
  lastActiveAt?: string | number | Date;
  /** Active threshold in minutes (defaults to 5) */
  thresholdMinutes?: number;
}

export function ActiveBadge({ lastActiveAt, thresholdMinutes = 5 }: ActiveBadgeProps) {
  if (!lastActiveAt) return null;

  const isOnline =
    Date.now() - new Date(lastActiveAt).getTime() < thresholdMinutes * 60 * 1000;

  if (!isOnline) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-neutral-500 font-medium"
        title="Offline"
      >
        <span className="w-2 h-2 rounded-full bg-neutral-600" />
        Offline
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400"
      title="Currently active"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      Active
    </span>
  );
}

