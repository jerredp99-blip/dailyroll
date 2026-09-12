"use client";

import {
  Compass,
  Trophy,
  Gift,
  MessageSquare,
  Zap,
  ListTodo,
  TrendingUp,
  User,
  Shield,
} from "lucide-react";
import { TagBadge } from "@/app/components/feed/TagBadge";
import Link from "next/link";
import type { PostType } from "@/lib/store";

const POPULAR_TAGS = [
  "BIG_WIN",
  "BONUS_CODE",
  "STAKE",
  "CROWN",
  "WOW",
  "PULSZ",
  "HIGH5",
  "MCLUCK",
];

export function FeedNavRail({
  currentType,
  selectedTag,
  onSelectType,
  onSelectTag,
  onClearFilter,
  isAdmin,
}: {
  currentType?: PostType | "all";
  selectedTag?: string;
  onSelectType: (type: PostType | "all") => void;
  onSelectTag: (tag: string) => void;
  onClearFilter: () => void;
  isAdmin?: boolean;
}) {
  const navItems: { label: string; type: PostType | "all"; icon: any; color: string }[] = [
    { label: "For You / All", type: "all", icon: Compass, color: "text-emerald-400" },
    { label: "Big Wins", type: "big_win", icon: Trophy, color: "text-amber-400" },
    { label: "Drop Codes", type: "drop_code", icon: Gift, color: "text-teal-400" },
    { label: "Discussions", type: "discussion", icon: MessageSquare, color: "text-blue-400" },
    { label: "Check-ins", type: "daily_claim", icon: Zap, color: "text-emerald-400" },
  ];

  return (
    <aside className="w-full space-y-6">
      {/* Primary Feed Filters */}
      <div className="rounded-2xl border border-[#22392b] bg-[#121f17]/95 p-3 shadow-sm backdrop-blur">
        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#6e8a76]">
          Feed Channels
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = !selectedTag && (currentType === item.type || (!currentType && item.type === "all"));

            return (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  onClearFilter();
                  onSelectType(item.type);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-[#254231] text-white shadow-sm"
                    : "text-[#87a18d] hover:bg-[#192b20] hover:text-white"
                }`}
              >
                <Icon size={16} className={item.color} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Popular Tags */}
      <div className="rounded-2xl border border-[#22392b] bg-[#121f17]/95 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold uppercase tracking-wider text-[#6e8a76]">
          <TrendingUp size={13} className="text-emerald-400" />
          <span>Popular Tags</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TAGS.map((tag) => (
            <TagBadge
              key={tag}
              tag={tag}
              active={selectedTag?.toUpperCase() === tag.toUpperCase()}
              onClick={() => onSelectTag(tag)}
            />
          ))}
        </div>
      </div>

      {/* Quick Navigation Links */}
      <div className="rounded-2xl border border-[#22392b] bg-[#121f17]/95 p-3 shadow-sm backdrop-blur">
        <nav className="space-y-1">
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-[#87a18d] transition hover:bg-[#192b20] hover:text-white"
          >
            <User size={15} className="text-emerald-400" />
            <span>My Profile & Settings</span>
          </Link>

          {isAdmin && (
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-[#192b20]"
            >
              <Shield size={15} />
              <span>Admin Dashboard</span>
            </Link>
          )}
        </nav>
      </div>
    </aside>
  );
}

