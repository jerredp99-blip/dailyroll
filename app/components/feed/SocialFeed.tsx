"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { PostCard } from "@/app/components/feed/PostCard";
import { PostComposer } from "@/app/components/feed/PostComposer";
import { CompactTrackerSidebar } from "@/app/components/feed/CompactTrackerSidebar";
import { FeedNavRail } from "@/app/components/feed/FeedNavRail";
import { TagBadge } from "@/app/components/feed/TagBadge";
import { Loader2, RefreshCw, X, Radio, Trophy, Gift, MessageSquare, ChevronDown } from "lucide-react";
import type { Post, PostType, Casino } from "@/lib/store";

const DEFAULT_TAGS = [
  "BIG_WIN",
  "BONUS_CODE",
  "STAKE",
  "CROWN",
  "WOW",
  "PULSZ",
  "HIGH5",
  "MCLUCK",
];

export function SocialFeed({
  currentUserEmail,
  currentUserName,
  currentUserAvatar,
  isAdmin,
  casinos,
  onClaimCasino,
  compact = false,
}: {
  currentUserEmail?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  isAdmin?: boolean;
  casinos?: Casino[];
  onClaimCasino?: (casino: Casino) => void;
  compact?: boolean;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentType, setCurrentType] = useState<PostType | "all">("all");
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"newest" | "likes" | "comments">("newest");
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

  const availableTags = useMemo(() => {
    const set = new Set<string>(DEFAULT_TAGS);
    if (casinos) {
      for (const c of casinos) {
        if (c.name) set.add(c.name.replace(/\s+/g, "").toUpperCase());
      }
    }
    for (const p of posts) {
      if (p.casinoTag) set.add(p.casinoTag.replace(/^[$#]+/, "").toUpperCase());
      if (p.tags) {
        for (const t of p.tags) set.add(t.replace(/^[$#]+/, "").toUpperCase());
      }
    }
    if (selectedTag) {
      set.add(selectedTag.replace(/^[$#]+/, "").toUpperCase());
    }
    return Array.from(set);
  }, [casinos, posts, selectedTag]);

  const dropdownValue = useMemo(() => {
    if (selectedTag) {
      return `tag:${selectedTag.replace(/^[$#]+/, "").toUpperCase()}`;
    }
    if (currentType === "drop_code") {
      return "type:drop_code";
    }
    if (currentType === "big_win") {
      return "type:big_win";
    }
    if (currentType === "discussion") {
      return "type:discussion";
    }
    if (currentType === "daily_claim") {
      return "type:daily_claim";
    }
    if (sortBy === "likes") {
      return "sort:likes";
    }
    if (sortBy === "comments") {
      return "sort:comments";
    }
    return "all";
  }, [selectedTag, currentType, sortBy]);

  const handleDropdownChange = (value: string) => {
    if (value === "all") {
      setSelectedTag(undefined);
      setCurrentType("all");
      setSortBy("newest");
    } else if (value === "sort:newest") {
      setSortBy("newest");
    } else if (value === "sort:likes") {
      setSortBy("likes");
    } else if (value === "sort:comments") {
      setSortBy("comments");
    } else if (value.startsWith("type:")) {
      const type = value.replace("type:", "") as PostType;
      setSelectedTag(undefined);
      setCurrentType(type);
    } else if (value.startsWith("tag:")) {
      const tag = value.replace("tag:", "");
      setSelectedTag(tag);
      setCurrentType("all");
    }
  };

  const sortedPosts = useMemo(() => {
    const list = [...posts];
    if (sortBy === "likes") {
      return list.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    }
    if (sortBy === "comments") {
      return list.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
    }
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [posts, sortBy]);

  const feedContent = (
    <main className="space-y-3.5">
      {/* Category Controls: Bonus Codes Quick Button + Sort/Filter Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        {/* Bonus Codes View Button */}
        <button
          type="button"
          onClick={() => {
            if (currentType === "drop_code" && !selectedTag) {
              setCurrentType("all");
              setSelectedTag(undefined);
            } else {
              setCurrentType("drop_code");
              setSelectedTag(undefined);
            }
          }}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm ${
            currentType === "drop_code" && !selectedTag
              ? "bg-teal-600 text-white shadow-[0_4px_14px_rgba(20,184,166,0.35)] ring-1 ring-teal-400"
              : "bg-[#132219] text-teal-300 border border-teal-800/40 hover:bg-[#192c21] hover:text-white"
          }`}
        >
          <Gift size={14} className="text-teal-400" />
          <span>Bonus Codes</span>
          {currentType === "drop_code" && !selectedTag && (
            <span className="ml-0.5 rounded-full bg-teal-400/20 px-1.5 py-0.2 text-[10px] text-teal-200">
              Active
            </span>
          )}
        </button>

        {/* Sort & Filter Dropdown Menu */}
        <div className="relative flex items-center">
          <label htmlFor="feed-sort-filter" className="sr-only">
            Sort and filter posts
          </label>
          <div className="relative">
            <select
              id="feed-sort-filter"
              value={dropdownValue}
              onChange={(e) => handleDropdownChange(e.target.value)}
              className="h-9 rounded-xl border border-[#263e2f] bg-[#111e16] pl-3 pr-8 text-xs font-semibold text-[#d4e4d2] outline-none transition hover:border-[#3d634a] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none"
            >
              <optgroup label="Feed">
                <option value="all">All Posts</option>
                <option value="type:drop_code">🎁 Bonus Codes</option>
                <option value="type:big_win">🏆 Big Wins</option>
                <option value="type:discussion">💬 Discussions</option>
                <option value="type:daily_claim">⚡ Daily Claims</option>
              </optgroup>
              <optgroup label="Sort Order">
                <option value="sort:newest">🕒 Newest First</option>
                <option value="sort:likes">🔥 Most Liked</option>
                <option value="sort:comments">💬 Most Comments</option>
              </optgroup>
              <optgroup label="Tags">
                {availableTags.map((tag) => (
                  <option key={tag} value={`tag:${tag}`}>
                    #{tag}
                  </option>
                ))}
              </optgroup>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-[#738e7a]">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>
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
                      setSortBy("newest");
                    }}
                    className="flex items-center gap-1 rounded-md bg-[#192b20] px-2 py-0.5 text-[11px] text-[#93ab98] hover:text-white"
                  >
                    <X size={12} /> Clear
                  </button>
                </div>
              ) : (
                <span className="font-bold text-emerald-300">
                  {currentType === "all"
                    ? sortBy === "likes"
                      ? "All Posts (Most Liked 🔥)"
                      : sortBy === "comments"
                      ? "All Posts (Most Comments 💬)"
                      : "All Posts"
                    : currentType === "big_win"
                    ? "Big Win Flexes 🏆"
                    : currentType === "drop_code"
                    ? "Bonus Drop Codes 🎁"
                    : currentType === "discussion"
                    ? "Discussions 💬"
                    : "Daily Claims ⚡"}
                </span>
              )}

              {(currentType !== "all" || sortBy !== "newest") && !selectedTag && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTag(undefined);
                    setCurrentType("all");
                    setSortBy("newest");
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
          ) : sortedPosts.length === 0 ? (
            <div className="rounded-2xl border border-[#203728] bg-[#122017] p-8 text-center text-xs text-[#7d9985]">
              <p className="text-sm font-semibold text-white mb-1">No posts found</p>
              <p>Be the first to post a bonus drop, win flex, or discussion!</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {sortedPosts.map((post) => (
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
  );

  if (compact) {
    return feedContent;
  }

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
        {feedContent}

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
