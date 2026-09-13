"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { PostCard } from "@/app/components/feed/PostCard";
import { PostComposer } from "@/app/components/feed/PostComposer";
import { CompactTrackerSidebar } from "@/app/components/feed/CompactTrackerSidebar";
import { FeedNavRail } from "@/app/components/feed/FeedNavRail";
import { TagBadge } from "@/app/components/feed/TagBadge";
import { Loader2, RefreshCw, X, Radio, Trophy, Gift, MessageSquare } from "lucide-react";
import type { Post, PostType, Casino } from "@/lib/store";

export function SocialFeed({
  currentUserEmail,
  currentUserName,
  currentUserAvatar,
  isAdmin,
  casinos,
  onClaimCasino,
}: {
  currentUserEmail?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  isAdmin?: boolean;
  casinos?: Casino[];
  onClaimCasino?: (casino: Casino) => void;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentType, setCurrentType] = useState<PostType | "all">("all");
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPosts = useCallback(async (silent = false) => {
    // If the browser tab is hidden and this is a background auto-refresh, skip it
    if (silent && typeof document !== "undefined" && document.hidden) {
      return;
    }

    if (!silent) setRefreshing(true);

    // Cancel any previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const params = new URLSearchParams();
      if (currentType && currentType !== "all") {
        params.set("type", currentType);
      }
      if (selectedTag) {
        params.set("casinoTag", selectedTag);
      }

      const res = await fetch(`/api/posts?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) {
        if (!silent) {
          console.warn(`Posts API responded with status ${res.status}`);
        }
        return;
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        setPosts(data.posts);
        setLastUpdated(new Date());
      }
    } catch (err: unknown) {
      // Ignore normal abort errors from cancelled requests
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      // For background auto-polls, fail quietly so dev overlays or brief offline periods don't crash the UI
      if (silent) {
        return;
      }
      console.warn("Failed to load posts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentType, selectedTag]);

  // Initial load or filter change
  useEffect(() => {
    setLoading(true);
    fetchPosts(false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPosts]);

  // Requirement: Auto-refresh posts automatically in background
  useEffect(() => {
    const timer = setInterval(() => {
      fetchPosts(true);
    }, 12000); // 12 seconds auto-refresh

    // Also auto-refresh when user switches back to this tab
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchPosts(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchPosts]);

  const handleManualRefresh = () => {
    fetchPosts(false);
  };

  const handleNewPost = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  };

  const handlePostDeleted = (deletedId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
  };

  const handleShareClaim = async (casinoName: string, amount: string) => {
    const casinoTag = `$${casinoName.replace(/\s+/g, "").toUpperCase()}`;
    const content = `Just checked in and claimed my daily ${amount} at ${casinoName}! ⚡`;

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          casinoTag,
          type: "daily_claim",
          winAmount: amount,
          authorEmail: currentUserEmail,
          authorName: currentUserName,
          authorAvatar: currentUserAvatar,
        }),
      });
      const data = await res.json();
      if (data.success && data.post) {
        handleNewPost(data.post);
      }
    } catch (err) {
      console.error("Failed to share claim", err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr_320px]">
        {/* Left Column: Navigation Rail */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <FeedNavRail
              currentType={currentType}
              selectedTag={selectedTag}
              onSelectType={(type) => {
                setSelectedTag(undefined);
                setCurrentType(type);
              }}
              onSelectTag={(tag) => {
                setSelectedTag(tag);
              }}
              onClearFilter={() => {
                setSelectedTag(undefined);
                setCurrentType("all");
              }}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        {/* Center Column: Social Feed */}
        <main className="space-y-3.5">
          {/* Mobile Category Filters (Horizontally scrollable pill tabs for phones) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none lg:hidden -mx-1 px-1">
            <button
              type="button"
              onClick={() => {
                setSelectedTag(undefined);
                setCurrentType("all");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                currentType === "all" && !selectedTag
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-[#132219] text-[#8ca892] border border-[#223b2c] hover:text-white"
              }`}
            >
              All Posts
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTag(undefined);
                setCurrentType("big_win");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                currentType === "big_win"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-[#132219] text-amber-300 border border-amber-800/40 hover:text-white"
              }`}
            >
              <Trophy size={13} className="text-amber-400" />
              Big Wins
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTag(undefined);
                setCurrentType("drop_code");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                currentType === "drop_code"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-[#132219] text-teal-300 border border-teal-800/40 hover:text-white"
              }`}
            >
              <Gift size={13} className="text-teal-400" />
              Bonus Codes
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTag(undefined);
                setCurrentType("discussion");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                currentType === "discussion"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-[#132219] text-[#9bcf9c] border border-[#223b2c] hover:text-white"
              }`}
            >
              <MessageSquare size={13} />
              Discussions
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTag(undefined);
                setCurrentType("daily_claim");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                currentType === "daily_claim"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-[#132219] text-[#8ca892] border border-[#223b2c] hover:text-white"
              }`}
            >
              ⚡ Claims
            </button>
          </div>

          {/* Post Composer (Minimized by default, expands on typebox click) */}
          <PostComposer
            currentUserEmail={currentUserEmail}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            onPostCreated={handleNewPost}
          />

          {/* Feed Filter Header / Auto-refresh Indicator */}
          <div className="flex items-center justify-between rounded-xl border border-[#203728] bg-[#111e16] px-3.5 py-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Live pulse dot */}
              <div className="flex items-center gap-1.5 rounded-md bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 text-[11px] text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold tracking-wide uppercase text-[10px]">Live</span>
              </div>

              <span className="font-semibold text-[#8ca592] hidden sm:inline">Showing:</span>
              {selectedTag ? (
                <div className="flex items-center gap-1.5">
                  <TagBadge tag={selectedTag} active />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTag(undefined);
                      setCurrentType("all");
                    }}
                    className="flex items-center gap-1 rounded-md bg-[#192b20] px-2 py-0.5 text-[11px] text-[#93ab98] hover:text-white"
                  >
                    <X size={12} /> Clear
                  </button>
                </div>
              ) : (
                <span className="font-bold text-emerald-300">
                  {currentType === "all"
                    ? "All Posts"
                    : currentType === "big_win"
                    ? "Big Win Flexes 🏆"
                    : currentType === "drop_code"
                    ? "Bonus Drop Codes 🎁"
                    : currentType === "discussion"
                    ? "Discussions 💬"
                    : "Daily Claims ⚡"}
                </span>
              )}

              {currentType !== "all" && !selectedTag && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTag(undefined);
                    setCurrentType("all");
                  }}
                  className="flex items-center gap-1 rounded-md bg-[#192b20] px-2 py-0.5 text-[11px] text-[#93ab98] hover:text-white"
                >
                  <X size={12} /> Reset
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 text-[#8ca592] hover:text-emerald-300 transition shrink-0 ml-2"
              title="Refresh feed"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin text-emerald-400" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Posts Stream */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-emerald-400 space-y-3">
              <Loader2 size={24} className="animate-spin" />
              <p className="text-xs text-[#7d9985]">Loading social feed...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-[#203728] bg-[#122017] p-8 text-center text-xs text-[#7d9985]">
              <p className="text-sm font-semibold text-white mb-1">No posts found</p>
              <p>Be the first to post a bonus drop, win flex, or discussion!</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserEmail={currentUserEmail}
                  isAdmin={isAdmin}
                  onSelectTag={(tag) => setSelectedTag(tag)}
                  onPostUpdated={handlePostUpdated}
                  onPostDeleted={handlePostDeleted}
                  isMenuOpen={openMenuPostId === post.id}
                  onToggleMenu={(open) => setOpenMenuPostId(open ? post.id : null)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Right Column: Daily Bonus Roll Tracker Sidebar */}
        <div className="space-y-4">
          <div className="sticky top-24 space-y-4">
            <CompactTrackerSidebar
              casinos={casinos}
              onClaimCasino={onClaimCasino}
              onShareClaim={handleShareClaim}
              currentUserEmail={currentUserEmail}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
