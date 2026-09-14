"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export type ExpandableSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  expandedWidth?: string;
  autoFocus?: boolean;
};

export function ExpandableSearch({
  value,
  onChange,
  placeholder = "Search casinos...",
  className = "",
  expandedWidth = "w-36 sm:w-64",
  autoFocus = false,
}: ExpandableSearchProps) {
  const [isOpen, setIsOpen] = useState(Boolean(value));
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isExpanded = isOpen || Boolean(value);

  // Sync open state if external value changes
  useEffect(() => {
    if (value && !isOpen) {
      setIsOpen(true);
    }
  }, [value, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleClear();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Only collapse if blur focus moved completely outside container and input is empty
    if (!containerRef.current?.contains(e.relatedTarget as Node) && !value.trim()) {
      setIsOpen(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        title="Search casinos"
        aria-label="Search casinos"
        className={`h-8 w-8 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-emerald-500/50 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer shrink-0 ${className}`}
      >
        <Search className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      onBlur={handleBlur}
      className={`h-8 bg-zinc-950/90 border border-zinc-800 focus-within:border-emerald-500 rounded-xl px-2.5 flex items-center gap-2 text-xs transition-all duration-200 shrink-0 ${expandedWidth} ${className}`}
    >
      <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus || isOpen}
        className="bg-transparent text-white placeholder-zinc-500 text-xs outline-none w-full min-w-0"
      />
      <button
        type="button"
        onClick={handleClear}
        title={value ? "Clear search" : "Close search"}
        aria-label={value ? "Clear search" : "Close search"}
        className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition shrink-0 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
