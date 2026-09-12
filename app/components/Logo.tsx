import { Dices } from "lucide-react";
import Link from "next/link";

const SIZE_STYLES = {
  sm: { badge: "h-9 w-9 rounded-lg", icon: 17, text: "text-base" },
  md: { badge: "h-12 w-12 rounded-xl", icon: 24, text: "text-4xl" },
} as const;

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
      className={`flex items-center gap-2.5 ${className}`}
      aria-label="dailyroll home"
    >
      <span
        className={`grid shrink-0 place-items-center bg-gradient-to-br from-[#a9dba9] to-[#4f8f5b] text-[#0e1f14] shadow-[0_8px_20px_rgba(83,151,96,0.28)] ${styles.badge}`}
      >
        <Dices size={styles.icon} strokeWidth={2.3} />
      </span>
      <span className={`font-bold tracking-[-0.06em] text-[#e1ece0] ${styles.text}`}>
        daily<span className="text-[#9bcf9c]">roll</span>
      </span>
    </Link>
  );
}
