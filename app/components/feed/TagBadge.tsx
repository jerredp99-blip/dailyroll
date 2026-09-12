"use client";

import { useState } from "react";
import { resolveTagDetails } from "@/lib/casino-tags";

export function TagBadge({
  tag,
  onClick,
  active,
  size = "md",
}: {
  tag: string;
  onClick?: () => void;
  active?: boolean;
  size?: "sm" | "md";
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const tagDetails = resolveTagDetails(tag);

  if (!tagDetails) return null;

  const isSmall = size === "sm";

  // Category Tag Styles
  if (tagDetails.category === "category") {
    let colorClasses = "";
    if (tagDetails.id === "BIG_WIN") {
      colorClasses = active
        ? "bg-amber-600 text-white border-amber-400 shadow-md"
        : "bg-amber-950/50 text-amber-300 border-amber-600/40 hover:bg-amber-900/60";
    } else if (tagDetails.id === "BONUS_CODE") {
      colorClasses = active
        ? "bg-teal-600 text-white border-teal-400 shadow-md"
        : "bg-teal-950/50 text-teal-300 border-teal-600/40 hover:bg-teal-900/60";
    } else {
      colorClasses = active
        ? "bg-blue-600 text-white border-blue-400 shadow-md"
        : "bg-blue-950/50 text-blue-300 border-blue-600/40 hover:bg-blue-900/60";
    }

    const content = (
      <>
        <span>{tagDetails.emoji}</span>
        <span>{tagDetails.name}</span>
      </>
    );

    const baseClasses = `inline-flex items-center gap-1.5 rounded-full border font-bold transition shadow-sm ${
      isSmall ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
    } ${colorClasses}`;

    if (onClick) {
      return (
        <button type="button" onClick={onClick} className={baseClasses}>
          {content}
        </button>
      );
    }
    return <span className={baseClasses}>{content}</span>;
  }

  // Casino Tag Styles (with logo, NO $)
  const casinoClasses = active
    ? "bg-emerald-600 text-white border-emerald-400 shadow-md"
    : "bg-[#13241b] text-[#e3ece4] border-[#254231] hover:border-emerald-500/60 hover:bg-[#193224]";

  const content = (
    <>
      {tagDetails.logoUrl && !logoFailed ? (
        <img
          src={tagDetails.logoUrl}
          alt={tagDetails.name}
          className={`${
            isSmall ? "h-3.5 w-3.5" : "h-4 w-4"
          } rounded-full object-contain bg-white/10 shrink-0 p-0.5`}
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
      )}
      <span className="font-semibold truncate">{tagDetails.name}</span>
    </>
  );

  const baseClasses = `inline-flex items-center gap-1.5 rounded-full border transition shadow-sm ${
    isSmall ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
  } ${casinoClasses}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClasses}>
        {content}
      </button>
    );
  }

  return <span className={baseClasses}>{content}</span>;
}

