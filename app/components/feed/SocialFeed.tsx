"use client";

import { useEffect, useState, useRef } from "react";
import { PostCard } from "@/app/components/feed/PostCard";
import { PostComposer } from "@/app/components/feed/PostComposer";
import { CompactTrackerSidebar } from "@/app/components/feed/CompactTrackerSidebar";
import { FeedNavRail } from "@/app/components/feed/FeedNavRail";
import { TagBadge } from "@/app/components/feed/TagBadge";
import { Loader2, RefreshCw, X, Radio } from "lucide-react";
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

  const fetchPosts = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (currentType && currentType !== "all") {
        params.set("type", currentType);
      }
      if (selectedTag) {
        params.set("casinoTag", selectedTag);
      }

      const res = await fetch(`/api/posts?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.posts) {
        setPosts(data.posts);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Failed to load posts", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load or filter change
  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [currentType, selectedTag]);

  // Requirement: Auto-refresh posts automatically in background
  useEffect(() => {
    const timer = setInterval(() => {
      fetchPosts(true);
    }, 12000); // 12 seconds auto-refresh

    return () => clearInterval(timer);
  }, [currentType, selectedTag]);

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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr_320px]">
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
        <main className="space-y-4">
          {/* Post Composer */}
          <PostComposer
            currentUserEmail={currentUserEmail}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            onPostCreated={handleNewPost}
          />

          {/* Feed Filter Header / Auto-refresh Indicator */}
          <div className="flex items-center justify-between rounded-xl border border-[#203728] bg-[#111e16] px-4 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Live pulse dot */}
              <div className="flex items-center gap-1.5 rounded-md bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 text-[11px] text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold tracking-wide uppercase text-[10px]">Live</span>
              </div>

              <span className="font-semibold text-[#8ca592]">Showing:</span>
              <span className="font-bold text-emerald-300">
                {selectedTag
                  ? `Cashtag ${selectedTag}`
                  : currentType === "all"
                  ? "All Community Posts"
                  : currentType === "big_win"
                  ? "Big Win Flexes 🏆"
                  : currentType === "drop_code"
                  ? "Bonus Drop Codes 🎁"
                  : currentType === "discussion"
                  ? "Discussions 💬"
                  : "Daily Claims ⚡"}
              </span>
              {selectedTag ? (
                <TagBadge tag={selectedTag} active />
              ) : (
                <span className="font-bold text-emerald-300">
                  {currentType === "all"
                    ? "All Community Posts"
                    : currentType === "big_win"
                    ? "Big Win Flexes 🏆"
                    : currentType === "drop_code"
                    ? "Bonus Drop Codes 🎁"
                    : currentType === "discussion"
                    ? "Discussions 💬"
                    : "Daily Claims ⚡"}
                </span>
              )}

              {(selectedTag || currentType !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTag(undefined);
                    setCurrentType("all");
                  }}
                  className="flex items-center gap-1 rounded-md bg-[#192b20] px-2 py-0.5 text-[11px] text-[#93ab98] hover:text-white"
                >
                  <X size={12} /> Clear Filter
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 text-[#8ca592] hover:text-emerald-300 transition"
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
