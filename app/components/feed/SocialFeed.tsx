"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { PostCard } from "@/app/components/feed/PostCard";
import { PostComposer } from "@/app/components/feed/PostComposer";
import { CompactTrackerSidebar } from "@/app/components/feed/CompactTrackerSidebar";
import { FeedNavRail } from "@/app/components/feed/FeedNavRail";
import { Loader2, RefreshCw, X, Radio, Trophy, Gift, MessageSquare, ChevronDown, ExternalLink, Lock } from "lucide-react";
import type { Post, PostType, Casino } from "@/lib/store";
import { getActiveRollcallCasinoKeys, isDropInUserRollcall } from "@/lib/userCasinos";
import { CasinoLogo } from "@/components/CasinoLogo";
import { getCasinoDeepLink } from "@/lib/casinoLinks";
import { openInExternalBrowser } from "@/lib/openExternalLink";
import { isBonusDrop, isBonusDropActive, notifyDropsUpdated, getUserReportedExpiredDropIds } from "@/lib/dropsStore";

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
  initialType = "all",
  hideComposer = false,
  onClose,
  setIsBonusDropsOpen,
  setIsAddCasinosOpen,
  onOpenAddCasinos,
  showActiveDropsCasinos: controlledShowActiveDropsCasinos,
  setShowActiveDropsCasinos: controlledSetShowActiveDropsCasinos,
  showExploreModal: controlledShowExploreModal,
  setShowExploreModal: controlledSetShowExploreModal,
}: {
  currentUserEmail?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  isAdmin?: boolean;
  casinos?: Casino[];
  onClaimCasino?: (casino: Casino) => void;
  compact?: boolean;
  initialType?: "all" | "discussion" | "drop_code" | "big_win";
  hideComposer?: boolean;
  onClose?: () => void;
  setIsBonusDropsOpen?: (open: boolean) => void;
  setIsAddCasinosOpen?: (open: boolean) => void;
  onOpenAddCasinos?: () => void;
  showActiveDropsCasinos?: boolean;
  setShowActiveDropsCasinos?: (show: boolean) => void;
  showExploreModal?: boolean;
  setShowExploreModal?: (show: boolean) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentType, setCurrentType] = useState<PostType | "all">(initialType);
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialType) {
      setCurrentType(initialType);
    }
  }, [initialType]);
  const [sortBy, setSortBy] = useState<"newest" | "likes" | "comments">("newest");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [claimedDropIds, setClaimedDropIds] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync claimed bonus drops from localStorage and custom events
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("dailyroll_claimed_drops") || "[]");
      if (Array.isArray(stored)) {
        setClaimedDropIds(stored);
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "dailyroll_claimed_drops") {
        try {
          const list = JSON.parse(e.newValue || "[]");
          if (Array.isArray(list)) setClaimedDropIds(list);
        } catch {}
      }
    };

    const handleCustomClaim = (e: Event) => {
      const customEvent = e as CustomEvent<{ postId: string }>;
      const id = customEvent.detail?.postId;
      if (id) {
        setClaimedDropIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("dailyroll_drop_claimed", handleCustomClaim);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("dailyroll_drop_claimed", handleCustomClaim);
    };
  }, []);

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
        const drops = data.posts.filter(isBonusDrop);
        if (drops.length > 0) {
          notifyDropsUpdated(drops);
        }
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

  const handleNewPost = useCallback((newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
  }, []);

  const handlePostUpdated = useCallback((updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  }, []);

  const handlePostDeleted = useCallback((deletedId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
  }, []);

  const handleSelectTag = useCallback((tag: string) => {
    setSelectedTag(tag);
  }, []);

  const handleToggleMenu = useCallback((open: boolean, postId?: string) => {
    setOpenMenuPostId(open && postId ? postId : null);
  }, []);

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

  const isBonusDropPost = useCallback(
    (p: Post) =>
      p.type === "drop_code" ||
      Boolean(p.dropCode) ||
      p.tags?.some((t) =>
        ["BONUS_CODE", "PROMO_CODE", "BONUS_DROP", "DROP_CODE"].includes(t.toUpperCase())
      ),
    []
  );

  const activeRollcallKeys = useMemo(
    () => getActiveRollcallCasinoKeys(casinos),
    [casinos]
  );

  const [internalShowExploreModal, setInternalShowExploreModal] = useState(false);
  const showExploreModal =
    controlledShowExploreModal !== undefined
      ? controlledShowExploreModal
      : controlledShowActiveDropsCasinos !== undefined
      ? controlledShowActiveDropsCasinos
      : internalShowExploreModal;
  const setShowExploreModal =
    controlledSetShowExploreModal ||
    controlledSetShowActiveDropsCasinos ||
    setInternalShowExploreModal;
  const showActiveDropsCasinos = showExploreModal;
  const setShowActiveDropsCasinos = setShowExploreModal;
  const [showActiveCodesModal, setShowActiveCodesModal] = useState(false);
  const [modalTab, setModalTab] = useState<"locked" | "all">("locked");

  const bonusDrops = useMemo(() => {
    const reported = getUserReportedExpiredDropIds() ?? [];
    const claimed = claimedDropIds ?? [];
    const allPosts = posts ?? [];
    return allPosts.filter((p) => isBonusDropActive(p, claimed, reported));
  }, [posts, claimedDropIds]);

  const userCasinoIds = useMemo(() => {
    if (!casinos || !Array.isArray(casinos)) return [];
    return casinos
      .map((c) => (c ? (c as any).casinoId ?? c.id ?? c.name : null))
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  }, [casinos]);

  const activeCasinosWithDrops = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; isEnrolled: boolean; isAdded: boolean }>();
    const drops = bonusDrops ?? [];

    drops.forEach((drop) => {
      if (!drop) return;
      const casinoId =
        drop.casinoId ||
        drop.casinoName ||
        (drop.casinoTag ? drop.casinoTag.replace(/^[$#]+/, "") : null) ||
        drop.id;
      if (!casinoId) return;

      const casinoName =
        drop.casinoName ||
        (drop.casinoTag ? drop.casinoTag.replace(/^[$#]+/, "") : null) ||
        drop.tags?.find(
          (t) =>
            typeof t === "string" &&
            !["BONUS_CODE", "PROMO_CODE", "BONUS_DROP", "DROP_CODE", "DISCUSSION", "BIG_WIN"].includes(
              t.toUpperCase()
            )
        )?.replace(/^[$#]+/, "") ||
        "Unknown Casino";

      const nameLower = (casinoName || "").toLowerCase();
      const isEnrolled =
        userCasinoIds.includes(casinoId) ||
        userCasinoIds.some((id) => typeof id === "string" && id.toLowerCase() === nameLower) ||
        (activeRollcallKeys.size > 0 &&
          Array.from(activeRollcallKeys).some(
            (key) => typeof key === "string" && (key.toLowerCase() === nameLower || nameLower.includes(key.toLowerCase()))
          ));

      const existing = map.get(casinoId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(casinoId, {
          id: casinoId,
          name: casinoName,
          count: 1,
          isEnrolled,
          isAdded: isEnrolled,
        });
      }
    });

    const list = Array.from(map.values());
    if (list.length === 0) {
      const defaultList = ["Stake.us", "Crown Coins", "Pulsz", "High 5 Casino", "McLuck", "ThrillCoins", "Coinsback"];
      return defaultList.map((name) => {
        const nameLower = (name || "").toLowerCase();
        const isEnrolled =
          userCasinoIds.some((id) => typeof id === "string" && id.toLowerCase() === nameLower) ||
          (activeRollcallKeys.size > 0 &&
            Array.from(activeRollcallKeys).some(
              (key) => typeof key === "string" && (key.toLowerCase() === nameLower || nameLower.includes(key.toLowerCase()))
            ));
        return {
          id: (name || "").toLowerCase().replace(/\s+/g, "-"),
          name,
          count: 1,
          isEnrolled,
          isAdded: isEnrolled,
        };
      });
    }

    return list.sort((a, b) => b.count - a.count);
  }, [bonusDrops, userCasinoIds, activeRollcallKeys]);

  const activeCasinosCount = activeCasinosWithDrops.length;

  const casinosWithActiveCodes = useMemo(() => {
    return activeCasinosWithDrops.map((c) => ({
      name: c.name,
      count: c.count,
      isAdded: c.isAdded,
      siteUrl: undefined,
    }));
  }, [activeCasinosWithDrops]);

  const lockedCasinos = useMemo(() => {
    return casinosWithActiveCodes.filter((c) => !c.isAdded);
  }, [casinosWithActiveCodes]);

  const unclaimedDropsCount = useMemo(() => {
    const reported = getUserReportedExpiredDropIds() ?? [];
    const claimed = claimedDropIds ?? [];
    const allPosts = posts ?? [];
    return allPosts.filter((p) => {
      if (!p) return false;
      if (!isBonusDropActive(p, claimed, reported)) return false;
      if (!showAllCasinoDrops && activeRollcallKeys.size > 0) {
        return isDropInUserRollcall(p, activeRollcallKeys);
      }
      return true;
    }).length;
  }, [posts, claimedDropIds, showAllCasinoDrops, activeRollcallKeys]);

  const sortedPosts = useMemo(() => {
    const claimed = claimedDropIds ?? [];
    const allPosts = posts ?? [];
    let list = [...allPosts];

    // Rollcall Filtering: If user has active Rollcall casinos and hasn't toggled "show all",
    // only show drops matching casinos in their Rollcall (or universal drops)
    if (!showAllCasinoDrops && activeRollcallKeys.size > 0) {
      list = list.filter((p) => {
        if (isBonusDropPost(p)) {
          return isDropInUserRollcall(p, activeRollcallKeys);
        }
        return true;
      });
    }

    // Filter by category type if selected
    if (currentType !== "all") {
      list = list.filter((p) => {
        if (currentType === "drop_code") {
          return isBonusDropPost(p);
        }
        return p.type === currentType;
      });
    }

    // Filter by tag if selected
    if (selectedTag) {
      list = list.filter(
        (p) =>
          p.tags?.includes(selectedTag) ||
          p.casinoTag?.toLowerCase() === selectedTag.toLowerCase()
      );
    }

    const sortFn = (a: Post, b: Post) => {
      if (sortBy === "likes") {
        return (b.likes?.length || 0) - (a.likes?.length || 0);
      }
      if (sortBy === "comments") {
        return (b.commentCount || 0) - (a.commentCount || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    };

    // Requirement 1: Pin & Separate Unclaimed Bonus Drops at Top of Feed
    // Active, UNCLAIMED Bonus Drops (where postId is NOT in claimedDropIds) appear pinned at the very top.
    // Once a drop is claimed, it moves down into the standard chronological feed position alongside regular posts.
    const unclaimedDrops: Post[] = [];
    const restOfPosts: Post[] = [];

    for (const post of list) {
      if (isBonusDropActive(post, claimedDropIds, getUserReportedExpiredDropIds())) {
        unclaimedDrops.push(post);
      } else {
        restOfPosts.push(post);
      }
    }

    unclaimedDrops.sort(sortFn);
    restOfPosts.sort(sortFn);

    return [...unclaimedDrops, ...restOfPosts];
  }, [
    posts,
    currentType,
    selectedTag,
    sortBy,
    claimedDropIds,
    isBonusDropPost,
    showAllCasinoDrops,
    activeRollcallKeys,
  ]);

  const feedContent = (
    <main className="space-y-2.5">
      {/* Unified Feed Toolbar: Filter Dropdown (LEFT) + Refresh Icon & Bonus Drops Quick Pill (RIGHT) */}
      <div className="flex items-center justify-between w-full gap-2 pb-1">
        {/* Sort & Filter Dropdown Menu (LEFT) */}
        <div className="relative flex items-center">
          <label htmlFor="feed-sort-filter" className="sr-only">
            Sort and filter posts
          </label>
          <div className="relative">
            <select
              id="feed-sort-filter"
              value={dropdownValue}
              onChange={(e) => handleDropdownChange(e.target.value)}
              className="h-9 rounded-lg border border-zinc-800 bg-zinc-900/60 pl-3 pr-8 text-sm text-zinc-300 outline-none transition hover:border-zinc-700 focus:border-zinc-700 cursor-pointer appearance-none"
            >
              <optgroup label="Feed" className="bg-[#121815] text-emerald-400 font-bold">
                <option value="all" className="bg-[#121815] text-white">All Posts</option>
                <option value="type:drop_code" className="bg-[#121815] text-white">🎁 Bonus Drops</option>
                <option value="type:big_win" className="bg-[#121815] text-white">🏆 Big Wins</option>
                <option value="type:discussion" className="bg-[#121815] text-white">💬 Discussions</option>
                <option value="type:daily_claim" className="bg-[#121815] text-white">⚡ Daily Claims</option>
              </optgroup>
              <optgroup label="Sort Order" className="bg-[#121815] text-emerald-400 font-bold">
                <option value="sort:newest" className="bg-[#121815] text-white">🕒 Newest First</option>
                <option value="sort:likes" className="bg-[#121815] text-white">🔥 Most Liked</option>
                <option value="sort:comments" className="bg-[#121815] text-white">💬 Most Comments</option>
              </optgroup>
              {availableTags.length > 0 && (
                <optgroup label="Tags" className="bg-[#121815] text-emerald-400 font-bold">
                  {availableTags.map((tag) => (
                    <option key={tag} value={`tag:${tag}`} className="bg-[#121815] text-white">
                      #{tag}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-400">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        {/* Right side: Refresh icon button + Bonus Drops quick toggle pill */}
        <div className="flex items-center gap-2">
          {/* Refresh Button Icon */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition cursor-pointer"
            title="Refresh feed"
            aria-label="Refresh feed"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-emerald-400" : ""} />
          </button>

          {/* Bonus Drops Quick-Filter Pill */}
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
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all cursor-pointer ${
              currentType === "drop_code" && !selectedTag
                ? "bg-emerald-500 text-zinc-950 shadow-[0_0_16px_rgba(16,185,129,0.4)] border border-emerald-400 ring-2 ring-emerald-400/40"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.2)] hover:border-emerald-500/50"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#39ff6a]" />
            </span>
            <span>🎁 Bonus Drops</span>
            {unclaimedDropsCount > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  currentType === "drop_code" && !selectedTag
                    ? "bg-zinc-950/20 text-zinc-950"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {unclaimedDropsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Post Composer (Minimized by default, expands on typebox click) */}
      {!hideComposer && (
        <PostComposer
          currentUserEmail={currentUserEmail}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
          isAdmin={isAdmin}
          casinos={casinos}
          onPostCreated={handleNewPost}
        />
      )}

      {/* Always render when drops exist - persistent guidance */}
      {(currentType === "all" || currentType === "drop_code") && activeCasinosWithDrops.length > 0 && (
        <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 mb-3 select-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>🎁 <strong className="text-amber-300 font-bold">{activeCasinosWithDrops.length} casinos</strong> have active bonus drops</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowExploreModal(true);
              }}
              className="text-amber-400 hover:text-amber-300 font-bold underline underline-offset-2 ml-1 cursor-pointer transition-colors"
            >
              Explore ↗
            </button>
          </div>
          <span className="text-[10px] text-amber-400/70 font-mono hidden sm:inline">
            Persistent Tip
          </span>
        </div>
      )}

          {/* Posts Stream */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-emerald-400 space-y-3">
              <Loader2 size={24} className="animate-spin" />
              <p className="text-xs text-[#7d9985]">Loading social feed...</p>
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-8 text-center text-xs text-zinc-400">
              <p className="text-sm font-semibold text-zinc-200 mb-1">No posts found</p>
              <p>Be the first to post a bonus drop, win flex, or discussion!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserEmail={currentUserEmail}
                  isAdmin={isAdmin}
                  casinos={casinos}
                  onSelectTag={handleSelectTag}
                  onPostUpdated={handlePostUpdated}
                  onPostDeleted={handlePostDeleted}
                  isMenuOpen={openMenuPostId === post.id}
                  onToggleMenu={handleToggleMenu}
                />
              ))}
            </div>
          )}
        </main>
  );

  const modalElement = showExploreModal ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setShowExploreModal(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-drops-casinos-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-emerald-500/30 p-5 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-base">🎁</span>
            <h3 id="active-drops-casinos-title" className="text-sm font-black text-white tracking-wide">
              Casinos With Active Drops
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowExploreModal(false)}
            aria-label="Close dialog"
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clear Instructions */}
        <div className="my-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-center">
          <p className="text-xs font-semibold text-emerald-300">
            Add casinos to your rollcall to view and claim bonus codes.
          </p>
        </div>

        {/* Casino List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {activeCasinosWithDrops.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{item.name}</span>
                {(item.isEnrolled || item.isAdded) && (
                  <span className="text-[9px] font-semibold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                    On Rollcall
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                {item.count} {item.count === 1 ? "drop" : "drops"}
              </span>
            </div>
          ))}
        </div>

        {/* Quick Navigation Button */}
        <div className="pt-4 mt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setShowExploreModal(false);
              setIsBonusDropsOpen?.(false);
              setIsAddCasinosOpen?.(true);
              onClose?.();
              onOpenAddCasinos?.();
              window.dispatchEvent(new CustomEvent("dailyroll_open_add_casinos"));
            }}
            className="w-full h-10 rounded-xl bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 hover:brightness-110 text-white text-xs font-bold shadow-[0_2px_10px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>+ Open Add Casinos</span>
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const activeDropsModal = (
    <>
      {modalElement && mounted && typeof document !== "undefined"
        ? createPortal(modalElement, document.body)
        : modalElement}
    </>
  );

  if (compact) {
    return (
      <>
        {feedContent}
        {activeDropsModal}
      </>
    );
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

      {activeDropsModal}
    </div>
  );
}
