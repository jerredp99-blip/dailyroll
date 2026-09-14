"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink, Gift, Sparkles, Pin } from "lucide-react";
import type { Post } from "@/lib/store";
import type { Casino } from "@/types/casino";
import { openInExternalBrowser } from "@/lib/openExternalLink";

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
    setClaimedDropIds((prev) => {
      if (prev.includes(postId)) return prev;
      const next = [...prev, postId];
      try {
        localStorage.setItem(CLAIMED_DROPS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
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

  const handleClaimLink = (postId: string, url: string) => {
    markDropClaimed(postId);
    openInExternalBrowser(url);
  };

  // Split into unclaimed (pinned to top) and claimed
  const unclaimedDrops = posts.filter((p) => !claimedDropIds.includes(p.id));
  const claimedDrops = posts.filter((p) => claimedDropIds.includes(p.id));
  const sortedDrops = [...unclaimedDrops, ...claimedDrops];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-3" />
        <p className="text-xs text-gray-400">Loading bonus drops for {casino.name}...</p>
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
        const isClaimed = claimedDropIds.includes(drop.id);
        const code = drop.dropCode?.trim();
        const claimUrl = drop.targetUrl || drop.linkUrl || casino.claimUrl || casino.siteUrl;

        return (
          <div
            key={drop.id}
            className={`relative rounded-xl border p-3.5 transition ${
              isClaimed
                ? "border-emerald-950/60 bg-[#0c1410] opacity-75"
                : "border-emerald-700/60 bg-[#112117] shadow-[0_4px_16px_rgba(0,0,0,0.25)] ring-1 ring-emerald-500/20"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {/* Title and Pin status */}
                <div className="flex items-center gap-2 mb-1">
                  {!isClaimed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-300 border border-emerald-500/40">
                      <Pin size={10} />
                      Active Drop
                    </span>
                  )}
                  {isClaimed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-800/80 px-2 py-0.5 text-[10px] font-semibold text-gray-400 border border-gray-700/50">
                      Claimed / Visited
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400">
                    by {drop.authorName || "Admin"}
                  </span>
                </div>

                <p className="text-sm font-semibold text-gray-200 break-words mb-2.5">
                  {drop.content}
                </p>

                {/* Drop code box if present */}
                {code && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Code:
                    </span>
                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-[#172c1f] px-2.5 py-1 font-mono text-xs font-bold text-emerald-200">
                      <span>{code}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(drop.id, code)}
                        className="ml-1 text-emerald-400 hover:text-white transition cursor-pointer"
                        title="Copy code"
                      >
                        {copiedCodeId === drop.id ? (
                          <Check size={13} className="text-emerald-300" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action button */}
              {claimUrl && (
                <button
                  type="button"
                  onClick={() => handleClaimLink(drop.id, claimUrl)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    isClaimed
                      ? "border border-gray-700/60 bg-gray-800/60 text-gray-300 hover:bg-gray-700 hover:text-white"
                      : "bg-[#39ff6a] text-black hover:bg-[#5aff84] shadow-[0_4px_12px_rgba(57,255,106,0.3)]"
                  }`}
                >
                  <span>{isClaimed ? "Reopen" : "Claim"}</span>
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CasinoDropsFeed;

