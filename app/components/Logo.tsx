import Link from "next/link";

const SIZE_STYLES = {
  sm: { badge: "h-9 w-9 rounded-xl", text: "text-base sm:text-lg" },
  md: { badge: "h-10 w-10 sm:h-12 sm:w-12 rounded-2xl", text: "text-2xl sm:text-3xl" },
  lg: { badge: "h-16 w-16 sm:h-20 sm:w-20 rounded-3xl", text: "text-3xl sm:text-5xl" },
} as const;

export function DailyRollIcon({ className = "w-full h-full" }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="Daily Roll Logo"
      className={`object-cover w-full h-full ${className}`}
    />
  );
}

export function Logo({
  size = "md",
  className = "",
  href = "/",
}: {
  size?: keyof typeof SIZE_STYLES;
  className?: string;
  href?: string;
}) {
  const styles = SIZE_STYLES[size];
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 sm:gap-2.5 ${className}`}
      aria-label="dailyroll home"
    >
      <span
        className={`shrink-0 overflow-hidden grid place-items-center ${styles.badge} shadow-[0_4px_20px_rgba(16,185,129,0.25)] transition-transform hover:scale-105`}
      >
        <DailyRollIcon />
      </span>
      <span className={`font-black tracking-[-0.05em] text-[#e1ece0] ${styles.text}`}>
        daily<span className="text-[#34d399] drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]">roll</span>
      </span>
    </Link>
  );
}
