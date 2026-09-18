"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink, Gift, Sparkles, Pin } from "lucide-react";
import type { Post } from "@/lib/store";
import type { Casino } from "@/types/casino";
import { openInExternalBrowser } from "@/lib/openExternalLink";

import { notifyDropClaimed } from "@/lib/dropsStore";

const CLAIMED_DROPS_STORAGE_KEY = "dailyroll_claimed_drop_ids";

export function CasinoDropsFeed({ casino }: { casino: Casino }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimedDropIds, setClaimedDropIds] = useState<string[]>([]);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CLAIMED_DROPS_STORAGE_KEY);
      if (saved) {
        setClaimedDropIds(JSON.parse(saved));
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, []);

  const markDropClaimed = (postId: string) => {
    notifyDropClaimed(postId);
    setClaimedDropIds((prev) => {
      if (prev.includes(postId)) return prev;
      const next = [...prev, postId];
      return next;
    });
  };

  useEffect(() => {
    async function loadDrops() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/posts?type=drop_code");
        if (res.ok) {
          const data = await res.json();
          const allDrops = (data.posts || []) as Post[];

          const casinoNameLower = casino.name.toLowerCase();
          const casinoIdLower = casino.id.toLowerCase();

          const matched = allDrops.filter((p) => {
            const matchId = p.casinoId && p.casinoId.toLowerCase() === casinoIdLower;
            const matchName = p.casinoName && p.casinoName.toLowerCase() === casinoNameLower;
            const matchTag = p.casinoTag && p.casinoTag.toLowerCase() === casinoNameLower;
            const matchInTags = p.tags?.some((t) => t.toLowerCase() === casinoNameLower);
            return matchId || matchName || matchTag || matchInTags;
          });

          setPosts(matched);
        }
      } catch (err) {
        console.error("Failed to load casino drops:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDrops();
  }, [casino.id, casino.name]);

  const handleCopyCode = (postId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(postId);
    markDropClaimed(postId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleClaimDrop = (postId: string) => {
    markDropClaimed(postId);
  };

  const handleClaimLink = (postId: string, url: string) => {
    markDropClaimed(postId);
    openInExternalBrowser(url);
  };

  // Split into unclaimed (pinned to top) and claimed
  const claimed = claimedDropIds ?? [];
  const drops = posts ?? [];
  const unclaimedDrops = drops.filter((p) => p && !claimed.includes(p.id));
  const claimedDrops = drops.filter((p) => p && claimed.includes(p.id));
  const sortedDrops = [...unclaimedDrops, ...claimedDrops];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-2 text-emerald-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs text-zinc-400 font-medium">Checking for active bonus codes...</span>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-950/80 bg-[#0d1611] p-8 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-950/60 text-emerald-400 mb-3 border border-emerald-800/40">
          <Gift size={24} />
        </div>
        <h3 className="text-base font-bold text-white mb-1">
          No Active Drops for {casino.name}
        </h3>
        <p className="text-xs text-gray-400 max-w-sm mb-4">
          There are no active bonus codes right now. Check back soon or explore drops for other casinos in the community feed!
        </p>
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-700/60 bg-[#16271e] px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-[#1f372a] hover:text-white transition"
        >
          <span>Browse All Bonus Drops</span>
          <ExternalLink size={13} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedDrops.map((drop) => {
        const isClaimed = Boolean(drop?.id && claimed.includes(drop.id));
        const code = drop.dropCode?.trim();
        const claimUrl = drop.claimUrl || drop.targetUrl || drop.linkUrl || casino.claimUrl || casino.siteUrl || "#";

        return (
          <div
            key={drop.id}
            className={`w-full p-2.5 sm:p-3 rounded-xl bg-zinc-900/90 border border-emerald-500/25 hover:border-emerald-500/40 shadow-md transition-all flex flex-col gap-2 ${
              isClaimed ? "opacity-75" : ""
            }`}
          >
            {/* Compact Header: Author & Timestamp */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                  {(drop.authorName || "AD").slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-zinc-300 truncate max-w-[140px] sm:max-w-none">
                  {drop.authorName || "Admin"}
                </span>
                <span className="text-[10px] text-zinc-500 whitespace-nowrap shrink-0">
                  • {drop.createdAt ? new Date(drop.createdAt).toLocaleDateString() : "active"}
                </span>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-300 uppercase tracking-wide whitespace-nowrap shrink-0">
                🎁 BONUS DROP
              </span>
            </div>

            {/* Main Row: Single-line Title & Action Button */}
            <div className="flex items-center justify-between gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-black text-white tracking-wide truncate whitespace-nowrap">
                  {drop.content}
                </h4>
              </div>

              {/* Distinct Button States */}
              {claimUrl && (
                <>
                  {isClaimed ? (
                    <a
                      href={claimUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Revisit bonus drop link"
                      className="h-8 px-3 rounded-lg text-xs font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer select-none"
                    >
                      <span>Claimed</span>
                      <Check className="w-3.5 h-3.5 text-zinc-500" />
                    </a>
                  ) : (
                    <a
                      href={claimUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleClaimDrop(drop.id)}
                      className="h-8 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 hover:brightness-110 active:translate-y-0.5 border-t border-emerald-300/40 shadow-[0_2px_8px_rgba(16,185,129,0.35)] whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all select-none"
                    >
                      <span>Claim Bonus</span>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-200 stroke-[2.5]" />
                    </a>
                  )}
                </>
              )}
            </div>

            {/* Code Box if code exists */}
            {code && (
              <div className="bg-zinc-950/80 border border-dashed border-zinc-700/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">
                    CODE:
                  </span>
                  <code className="font-mono text-xs sm:text-sm font-bold tracking-wider text-emerald-400 select-all truncate">
                    {code}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode(drop.id, code)}
                  className={`border border-zinc-700/80 hover:border-zinc-600 bg-zinc-900 text-zinc-300 hover:text-white px-2 py-0.5 text-[11px] font-semibold rounded-md transition active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer ${
                    copiedCodeId === drop.id ? "border-emerald-500 text-emerald-400" : ""
                  }`}
                >
                  {copiedCodeId === drop.id ? (
                    <>
                      <Check size={11} className="text-emerald-400" strokeWidth={2.5} />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CasinoDropsFeed;

