"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  X,
  MessageSquare,
  Gift,
  Compass,
  Loader2,
  Zap,
  RotateCcw,
  Flame,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SocialFeed } from "@/app/components/feed/SocialFeed";
import { RollcallCard } from "@/app/components/RollcallCard";
import { calculateCasinoStatus, resetCasinoTimers, useCurrentTime, SNOOZE_PRESETS, type CasinoStatus } from "@/lib/timerUtils";
import { getCasinoDeepLink } from "@/lib/casinoLinks";
import { openInExternalBrowser } from "@/lib/openExternalLink";
import { SpeedRunModal } from "@/app/components/SpeedRunModal";
import { SpeedRunErrorBoundary } from "@/components/SpeedRunErrorBoundary";
import { AddCasinosModal } from "@/components/AddCasinosModal";
import { CustomTimerModal } from "@/components/CustomTimerModal";
import { getCasinoDefaultMetadata, MASTER_CASINOS_DATA } from "@/lib/casinosData";
// import { BankrollSummary } from "@/app/components/BankrollSummary";
import {
  apiGetCasinos,
  apiGetDirectory,
  apiGetUsers,
  apiSaveCasinos,
  apiSaveDirectory,
  apiUpdateAdminCasino,
  type DirectoryData,
} from "@/lib/api-client";
import { migrateLegacyLocalStorage } from "@/lib/migrate-legacy";
import { casinoDirectory, casinoDirectoryUrls } from "@/lib/casino-directory";
import type { Casino } from "@/types/casino";

export interface CustomCasinoList {
  id: string;
  name: string;
  casinoIds: string[];
}

const DEFAULT_CUSTOM_LISTS: CustomCasinoList[] = [
  { id: "all", name: "All Casinos", casinoIds: [] },
  { id: "priority", name: "Daily Priority", casinoIds: [] },
];

type SignedInUser = {
  name: string;
  email: string;
  avatarUrl?: string | null;
};

const casinoOfficialLogoUrls: Record<string, string> = {
  "Lucky Bunny": "https://service.nyc3.cdn.digitaloceanspaces.com/files/luckybunnycasino.com/img/logo.png",
  "1UP": "https://www.google.com/s2/favicons?domain=play1up.co&sz=128",
  Coinsback: "https://www.google.com/s2/favicons?domain=coinsbackcasino.com&sz=128",
  "High 5 Casino": "https://www.google.com/s2/favicons?domain=high5casino.com&sz=128",
  ReBet: "https://www.google.com/s2/favicons?domain=rebet.app&sz=128",
  Pulsz: "https://www.google.com/s2/favicons?domain=pulsz.com&sz=128",
  Lucklake: "https://www.google.com/s2/favicons?domain=lucklake.com&sz=128",
  SidePot: "https://www.google.com/s2/favicons?domain=sidepotcasino.com&sz=128",
  RealPrize: "https://www.google.com/s2/favicons?domain=realprize.com&sz=128",
  KingPrize: "https://www.google.com/s2/favicons?domain=kingprize.com&sz=128",
  Ace: "https://www.google.com/s2/favicons?domain=ace.bet&sz=128",
  Spree: "https://www.google.com/s2/favicons?domain=spree.com&sz=128",
  "The Win Zone": "https://www.google.com/s2/favicons?domain=thewinzone.com&sz=128",
  "Dogg House": "https://www.google.com/s2/favicons?domain=dogghousecasino.com&sz=128",
  "Lucky Bits Vegas": "https://www.google.com/s2/favicons?domain=luckybitsvegas.com&sz=128",
  "Coin Wizard": "https://www.google.com/s2/favicons?domain=coinwizard.com&sz=128",
  "Golden Hearts Games": "https://www.google.com/s2/favicons?domain=goldenheartsgames.com&sz=128",
  "Rolling Riches": "https://www.google.com/s2/favicons?domain=rollingriches.com&sz=128",
  NewLuck: "https://newluck.com/favicon.ico",
  "Fortune Purple": "https://www.google.com/s2/favicons?domain=fortunepurple.com&sz=128",
  "Fortune Wins": "https://www.google.com/s2/favicons?domain=fortunewins.com&sz=128",
  Pulszbingo: "https://www.google.com/s2/favicons?domain=pulszbingo.com&sz=128",
  Sportzino: "https://www.google.com/s2/favicons?domain=sportzino.com&sz=128",
  "WOW Vegas": "https://cdn4.wowvegas.com/assets/wowvegas-og-open-graph-image-v3.jpg",
};

function CasinoLogo({ name = "", siteUrl }: { name?: string; siteUrl?: string }) {
  const [hasError, setHasError] = useState(false);
  const safeName = name || "Casino";
  let logoUrl = casinoOfficialLogoUrls[safeName] || "";

  if (!logoUrl) {
    const origin = siteUrl && safeOrigin(siteUrl);
    if (origin) {
      try {
        logoUrl = `${origin}/favicon.ico`;
      } catch {
        logoUrl = "";
      }
    }
  }

  if (!logoUrl || hasError) {
    return <span>{(safeName.slice(0, 2) || "CR").toUpperCase()}</span>;
  }

  return (
    <img
      src={logoUrl}
      alt={`${safeName} logo`}
      width={32}
      height={32}
      loading="lazy"
      decoding="async"
      className="h-8 w-8 object-contain"
      onError={() => setHasError(true)}
    />
  );
}

function safeOrigin(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/** True when `iso` falls on the same local calendar day as `referenceMs`. */
function isSameLocalDay(iso: string, referenceMs: number) {
  const date = new Date(iso);
  const reference = new Date(referenceMs);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function TrustpilotStars({ rating }: { rating?: number | null }) {
  const numericRating = Number(rating);
  if (!Number.isFinite(numericRating)) {
    return <span className="text-[#718275]">☆☆☆☆☆</span>;
  }

  const clampedRating = Math.max(0, Math.min(5, numericRating));
  return (
    <span aria-label={`${clampedRating.toFixed(1)} out of 5 stars`} className="tracking-[0.08em]">
      {Array.from({ length: 5 }, (_, index) => {
        const fillPercent = Math.max(0, Math.min(1, clampedRating - index)) * 100;
        return (
          <span
            key={index}
            aria-hidden="true"
            className="inline-block"
            style={{
              color: fillPercent === 100 ? "#e5b85d" : "transparent",
              backgroundImage: fillPercent > 0 && fillPercent < 100
                ? "linear-gradient(90deg, #e5b85d 50%, #536359 50%)"
                : undefined,
              WebkitBackgroundClip: fillPercent > 0 && fillPercent < 100 ? "text" : undefined,
            }}
          >
            {fillPercent === 0 ? "☆" : "★"}
          </span>
        );
      })}
    </span>
  );
}

const DEFAULT_CASINOS: Casino[] = [
  {
    id: "1",
    name: "Crown Coins",
    dailyBonus: "1.00 SC",
    url: "https://crowncoinscasino.com",
    lastClaimedAt: null,
    intervalHours: 24,
  },
  {
    id: "2",
    name: "Stake.us",
    dailyBonus: "1.00 Stake Cash",
    url: "https://stake.us",
    lastClaimedAt: null,
    intervalHours: 24,
  },
  {
    id: "3",
    name: "Pulsz",
    dailyBonus: "0.30 SC",
    url: "https://pulsz.com",
    lastClaimedAt: null,
    intervalHours: 24,
  },
  {
    id: "4",
    name: "McLuck",
    dailyBonus: "0.25 SC",
    url: "https://mcluck.com",
    lastClaimedAt: null,
    intervalHours: 24,
  },
];

type StatusState = "ready" | "pending" | "claimed";

// Instant, colour-coded status styling: vibrant green = ready, yellow = pending
// (reset within the hour), dimmed grey = claimed.
const STATUS_STYLES: Record<
  StatusState,
  { card: string; dot: string; label: string }
> = {
  ready: {
    card: "border-[#3f7a4d] bg-[#192a20] hover:border-[#6f9d73] hover:bg-[#203524]",
    dot: "bg-[#39ff6a] shadow-[0_0_10px_rgba(57,255,106,0.85)]",
    label: "text-[#9bcf9c]",
  },
  pending: {
    card: "border-[#6b552a] bg-[#241f14] hover:border-[#8a6f36] hover:bg-[#2b2416]",
    dot: "bg-[#f4b548] shadow-[0_0_10px_rgba(244,181,72,0.75)]",
    label: "text-[#e6c179]",
  },
  claimed: {
    card: "border-[#293a30] bg-[#17211c] opacity-80 hover:border-[#3d5142] hover:bg-[#1d2a22]",
    dot: "bg-[#5b6b60]",
    label: "text-[#819487]",
  },
};

export default function TrackerPage() {
  const router = useRouter();
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [signedInUser, setSignedInUser] = useState<SignedInUser | null>(null);
  const signedInUserRef = useRef<SignedInUser | null>(null);
  useEffect(() => {
    signedInUserRef.current = signedInUser;
  }, [signedInUser]);
  const now = useCurrentTime();
  const [pendingClaims, setPendingClaims] = useState<Record<string, { expiresAt: number; isDefocused?: boolean }>>({});
  const [activeDropsCount, setActiveDropsCount] = useState<number>(0);
  const [feedUnreadCount, setFeedUnreadCount] = useState<number>(0);

  // Poll / fetch active bonus drop count and feed unread count for dynamic navigation indicator
  useEffect(() => {
    let mounted = true;
    async function fetchCounts() {
      try {
        const [dropsRes, feedRes] = await Promise.all([
          fetch("/api/posts?type=drop_code", { cache: "no-store" }),
          fetch("/api/posts", { cache: "no-store" }),
        ]);

        if (dropsRes.ok) {
          const data = await dropsRes.json();
          const posts = Array.isArray(data) ? data : data.posts || [];
          if (mounted) {
            const active = posts.filter((p: any) => !p.expired && !p.isExpired);
            setActiveDropsCount(active.length);
          }
        }

        if (feedRes.ok) {
          const data = await feedRes.json();
          const posts = Array.isArray(data) ? data : data.posts || [];
          if (mounted) {
            const lastSeenStr = localStorage.getItem("dailyroll_feed_last_seen");
            const lastSeenTime = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
            const unreadPosts = posts.filter((p: any) => {
              const postTime = new Date(p.createdAt || 0).getTime();
              return postTime > lastSeenTime;
            });
            setFeedUnreadCount(unreadPosts.length);
          }
        }
      } catch (err) {
        // silent
      }
    }
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
  const [name, setName] = useState("");
  const [bonus, setBonus] = useState("");
  const [url, setUrl] = useState("");
  const [newClaimUrl, setNewClaimUrl] = useState("");
  const [newProvider, setNewProvider] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [use24HourReset, setUse24HourReset] = useState(true);
  const [useSpecificReset, setUseSpecificReset] = useState(false);
  const [resetTime, setResetTime] = useState("00:00");
  const [isAddCasinosPage, setIsAddCasinosPage] = useState(false);
  const [showAlreadyAdded, setShowAlreadyAdded] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [directoryFilter, setDirectoryFilter] = useState<"available" | "added" | "all">("available");
  const [directorySort, setDirectorySort] = useState<"name-asc" | "name-desc" | "f2p" | "trustpilot">("name-asc");
  const [isAdmin, setIsAdmin] = useState(false);
  const [directory, setDirectory] = useState(casinoDirectory);
  const [directoryUrls, setDirectoryUrls] = useState<Record<string, string>>(casinoDirectoryUrls);
  const [directoryAffiliateUrls, setDirectoryAffiliateUrls] = useState<Record<string, string>>({});
  const [directoryClaimUrls, setDirectoryClaimUrls] = useState<Record<string, string>>({});
  const [directoryBonusUrls, setDirectoryBonusUrls] = useState<Record<string, string>>({});
  const [directoryBonusTitles, setDirectoryBonusTitles] = useState<Record<string, string>>({});
  const [directoryRatings, setDirectoryRatings] = useState<Record<string, number>>({});
  const [directoryProviders, setDirectoryProviders] = useState<Record<string, string>>({});
  const [directoryDailyBonuses, setDirectoryDailyBonuses] = useState<Record<string, string>>({});
  const [directoryDailyBonusSc, setDirectoryDailyBonusSc] = useState<Record<string, string>>({});
  const [directoryMinRedemption, setDirectoryMinRedemption] = useState<Record<string, string>>({});
  const [directoryResetRules, setDirectoryResetRules] = useState<Record<string, string>>({});
  const [directoryHasStreak, setDirectoryHasStreak] = useState<Record<string, boolean>>({});
  const [isAddCasinosModalOpen, setIsAddCasinosModalOpen] = useState(false);
  const [directorySnapshot, setDirectorySnapshot] = useState<DirectoryData | null>(null);
  const [editingCasino, setEditingCasino] = useState<Casino | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editProvider, setEditProvider] = useState("");
  const [editAffiliateUrl, setEditAffiliateUrl] = useState("");
  const [editClaimUrl, setEditClaimUrl] = useState("");
  const [editBonusUrl, setEditBonusUrl] = useState("");
  const [editBonusTitle, setEditBonusTitle] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editBonus, setEditBonus] = useState("");
  const [editTrustpilotRating, setEditTrustpilotRating] = useState("");
  const [editUseSpecificReset, setEditUseSpecificReset] = useState(false);
  const [editResetTime, setEditResetTime] = useState("00:00");
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [customTimerCasino, setCustomTimerCasino] = useState<Casino | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [casinoFilter, setCasinoFilter] = useState<"all" | "ready" | "claimed">("all");
  const [casinoSort, setCasinoSort] = useState<
    "status" | "next-available" | "provider" | "f2p" | "trustpilot" | "name-asc" | "name-desc"
  >(() => {
    if (typeof window === "undefined") return "next-available";
    try {
      const migrated = localStorage.getItem("dailyroll_sort_migrated_v2");
      if (!migrated) {
        localStorage.setItem("dailyroll_sort_migrated_v2", "true");
        localStorage.setItem("dailyroll_casino_sort", "next-available");
        try {
          const stored = localStorage.getItem("dailyroll_profile_prefs");
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.sortOrder = "next-available";
            localStorage.setItem("dailyroll_profile_prefs", JSON.stringify(parsed));
          }
        } catch {}
        return "next-available";
      }
      const stored = localStorage.getItem("dailyroll_casino_sort");
      if (!stored || stored === "status") {
        return "next-available";
      }
      return stored as any;
    } catch {
      return "next-available";
    }
  });
  const [customLists, setCustomLists] = useState<CustomCasinoList[]>(() => {
    if (typeof window === "undefined") return DEFAULT_CUSTOM_LISTS;
    try {
      const stored = localStorage.getItem("dailyroll_custom_lists");
      return stored ? JSON.parse(stored) : DEFAULT_CUSTOM_LISTS;
    } catch {
      return DEFAULT_CUSTOM_LISTS;
    }
  });
  const [activeListId, setActiveListId] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    try {
      return localStorage.getItem("dailyroll_active_list_id") || "all";
    } catch {
      return "all";
    }
  });
  const [isManageListModalOpen, setIsManageListModalOpen] = useState(false);
  const [isNewListModalOpen, setIsNewListModalOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [activeDrawer, setActiveDrawer] = useState<"feed" | "drops" | null>(null);

  // When feed drawer is opened, mark feed as read
  useEffect(() => {
    if (activeDrawer === "feed") {
      setFeedUnreadCount(0);
      try {
        localStorage.setItem("dailyroll_feed_last_seen", new Date().toISOString());
      } catch {}
    }
  }, [activeDrawer]);

  const saveCustomLists = (lists: CustomCasinoList[]) => {
    setCustomLists(lists);
    try {
      localStorage.setItem("dailyroll_custom_lists", JSON.stringify(lists));
    } catch {}
  };

  const handleSelectActiveList = (id: string) => {
    setActiveListId(id);
    try {
      localStorage.setItem("dailyroll_active_list_id", id);
    } catch {}
  };

  const handleCreateList = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newList: CustomCasinoList = {
      id: `list-${Date.now()}`,
      name: trimmed,
      casinoIds: [],
    };
    const updated = [...customLists, newList];
    saveCustomLists(updated);
    handleSelectActiveList(newList.id);
    setNewListName("");
    setIsNewListModalOpen(false);
  };

  const handleDeleteList = (id: string) => {
    if (id === "all") return;
    if (!window.confirm("Are you sure you want to delete this list?")) return;
    const updated = customLists.filter((l) => l.id !== id);
    saveCustomLists(updated);
    if (activeListId === id) {
      handleSelectActiveList("all");
    }
  };

  const handleToggleCasinoInActiveList = (casinoId: string) => {
    if (activeListId === "all") return;
    const updated = customLists.map((list) => {
      if (list.id !== activeListId) return list;
      const exists = list.casinoIds.includes(casinoId);
      return {
        ...list,
        casinoIds: exists
          ? list.casinoIds.filter((id) => id !== casinoId)
          : [...list.casinoIds, casinoId],
      };
    });
    saveCustomLists(updated);
  };

  const [viewMode, setViewMode] = useState<"social" | "rollcall">("social");
  const [isSpeedRunOpen, setIsSpeedRunOpen] = useState(false);
  const [isStaggering, setIsStaggering] = useState(false);
  const [staggerStatus, setStaggerStatus] = useState<string | null>(null);
  const abortStaggerRef = useRef(false);
  const editScrollPosition = useRef<number | null>(null);
  const rollcallScrollPosition = useRef<number | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);

  function showAddCasinosPage(show: boolean) {
    if (show) {
      if (typeof window !== "undefined") {
        rollcallScrollPosition.current = window.scrollY;
      }
      setIsAddCasinosPage(true);
      localStorage.setItem("dailyroll_tracker_view", "add-casinos");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    } else {
      setIsAddCasinosPage(false);
      localStorage.setItem("dailyroll_tracker_view", "dashboard");
      if (typeof window !== "undefined" && rollcallScrollPosition.current !== null) {
        const targetScroll = rollcallScrollPosition.current;
        rollcallScrollPosition.current = null;
        requestAnimationFrame(() => {
          window.scrollTo({ top: targetScroll, behavior: "auto" });
        });
      }
    }
  }

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the server call fails, clear local state.
    }
    setSignedInUser(null);
    setIsAdmin(false);
    setIsProfileMenuOpen(false);
    router.replace("/sign-in");
  }

  useEffect(() => {
    if (!isProfileMenuOpen) return;
    function closeMenu(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [isProfileMenuOpen]);

  // Close sidebar when clicking outside or pressing Escape
  useEffect(() => {
    if (!isSidebarOpen) return;
    function handleOutsideClick(event: MouseEvent) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        sidebarToggleRef.current &&
        !sidebarToggleRef.current.contains(event.target as Node)
      ) {
        setIsSidebarOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user: SignedInUser | null = null;
      let admin = false;

      const [authData, saved, directoryData] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" })
          .then((res) => (res.ok ? (res.json() as Promise<{ user: SignedInUser | null; isAdmin: boolean }>) : null))
          .catch(() => null),
        apiGetCasinos(),
        apiGetDirectory(),
        migrateLegacyLocalStorage(),
      ]);
      if (cancelled) return;

      if (authData) {
        user = authData.user;
        admin = authData.isAdmin;
      }

      const sharedUrls = directoryData.urls;
      const sharedUrlsByName = Object.fromEntries(
        Object.entries(sharedUrls).map(([name, url]) => [name.toLowerCase(), url]),
      );
      const sharedAffiliateUrls = directoryData.affiliateUrls;
      const sharedAffiliateUrlsByName = Object.fromEntries(
        Object.entries(sharedAffiliateUrls).map(([name, url]) => [name.toLowerCase(), url]),
      );
      const sharedClaimUrls = directoryData.claimUrls;
      const sharedClaimUrlsByName = Object.fromEntries(
        Object.entries(sharedClaimUrls).map(([name, url]) => [name.toLowerCase(), url]),
      );
      const sharedBonusUrls = directoryData.bonusUrls;
      const sharedBonusUrlsByName = Object.fromEntries(
        Object.entries(sharedBonusUrls).map(([name, url]) => [name.toLowerCase(), url]),
      );
      const sharedBonusTitles = directoryData.bonusTitles;
      const sharedBonusTitlesByName = Object.fromEntries(
        Object.entries(sharedBonusTitles).map(([name, title]) => [name.toLowerCase(), title]),
      );
      const sharedRatings = directoryData.ratings;
      const sharedRatingsByName = Object.fromEntries(
        Object.entries(sharedRatings).map(([name, rating]) => [name.toLowerCase(), rating]),
      );
      const sharedDailyBonuses = directoryData.dailyBonuses || {};
      const sharedDailyBonusesByName = Object.fromEntries(
        Object.entries(sharedDailyBonuses).map(([name, val]) => [name.toLowerCase(), val]),
      );
      const sharedResetTimes = directoryData.resetTimes || {};
      const sharedResetTimesByName = Object.fromEntries(
        Object.entries(sharedResetTimes).map(([name, val]) => [name.toLowerCase(), val]),
      );
      const sharedDetails = directoryData.details || {};
      const sharedDetailsByName = Object.fromEntries(
        Object.entries(sharedDetails).map(([name, val]) => [name.toLowerCase(), val]),
      );
      const sharedProviders = directoryData.providers || {};
      const sharedProvidersByName = Object.fromEntries(
        Object.entries(sharedProviders).map(([name, val]) => [name.toLowerCase(), val]),
      );

      const loadedCasinos = saved ?? DEFAULT_CASINOS;
      const currentRatings = { ...sharedRatings };
      if (admin) {
        let hasNewRatings = false;
        loadedCasinos.forEach((casino) => {
          if (
            typeof casino.trustpilotRating === "number" &&
            sharedRatingsByName[casino.name.toLowerCase()] === undefined
          ) {
            currentRatings[casino.name] = casino.trustpilotRating;
            hasNewRatings = true;
          }
        });
        if (hasNewRatings) {
          await apiSaveDirectory({ ratings: currentRatings });
        }
      }
      const defaultUrlByName = Object.fromEntries(
        DEFAULT_CASINOS.map((casino) => [casino.name.toLowerCase(), casino.url]),
      );
      let localClaimedTimes: Record<string, string> = {};
      try {
        localClaimedTimes = JSON.parse(localStorage.getItem("dailyroll_claimed_times") || "{}");
      } catch {
        // Ignore malformed localStorage
      }
      const hydratedCasinos = loadedCasinos.map((casino) => {
        const lowerName = casino.name.trim().toLowerCase();

        // Authoritative Casino Metadata (Decoupled from user personal state):
        // Remote shared directory is always authoritative for links, titles, ratings, reset times, and bonuses.
        const siteUrl =
          sharedUrlsByName[lowerName] ||
          casino.siteUrl ||
          (casino.url && casino.url !== defaultUrlByName[lowerName] ? casino.url : undefined) ||
          defaultUrlByName[lowerName];

        const claimUrl =
          sharedClaimUrlsByName[lowerName] ?? casino.claimUrl;

        const affiliateUrl =
          sharedAffiliateUrlsByName[lowerName] ?? casino.affiliateUrl;

        const bonusUrl =
          sharedBonusUrlsByName[lowerName] ?? casino.bonusUrl;

        const bonusTitle =
          sharedBonusTitlesByName[lowerName] ?? casino.bonusTitle;

        const trustpilotRating =
          sharedRatingsByName[lowerName] ?? casino.trustpilotRating;

        const dailyBonus =
          sharedDailyBonusesByName[lowerName] || casino.dailyBonus;

        const resetAtTime =
          sharedResetTimesByName[lowerName] !== undefined
            ? sharedResetTimesByName[lowerName]
            : casino.resetAtTime;

        const details =
          sharedDetailsByName[lowerName] || casino.details;

        const provider =
          sharedProvidersByName[lowerName] || casino.provider;

        // User Claim & Display State (Personal to this user, decoupled from static metadata):
        const lastClaimedAt = casino.lastClaimedAt || localClaimedTimes[casino.id] || null;

        const seed = getCasinoDefaultMetadata(casino.name);
        const dailyBonusSc =
          directoryData.dailyBonusSc?.[casino.name] ?? casino.dailyBonusSc ?? seed?.dailyBonusSc;
        const dailyBonusGc =
          directoryData.dailyBonusGc?.[casino.name] ?? casino.dailyBonusGc ?? seed?.dailyBonusGc;
        const minRedemption =
          directoryData.minRedemption?.[casino.name] ?? casino.minRedemption ?? seed?.minRedemption;
        const resetRule =
          directoryData.resetRules?.[casino.name] ?? casino.resetRule ?? seed?.resetRule;
        const hasStreak =
          directoryData.hasStreak?.[casino.name] ?? casino.hasStreak ?? seed?.hasStreak ?? false;

        return {
          ...casino,
          siteUrl,
          url: siteUrl,
          claimUrl,
          affiliateUrl,
          bonusUrl,
          bonusTitle,
          trustpilotRating,
          dailyBonus,
          resetAtTime,
          details,
          provider,
          dailyBonusSc,
          dailyBonusGc,
          minRedemption,
          resetRule,
          hasStreak,
          lastClaimedAt,
        };
      });
      if (cancelled) return;
      setCasinos(hydratedCasinos);
      if (user && saved === null) {
        await apiSaveCasinos(user.email, hydratedCasinos);
      }
      if (user) setSignedInUser(user);
      setIsAdmin(admin);
      setIsAddCasinosPage(localStorage.getItem("dailyroll_tracker_view") === "add-casinos");
      const storedPreferences = localStorage.getItem("dailyroll_profile_prefs");
      if (storedPreferences) {
        try {
          const parsedPreferences = JSON.parse(storedPreferences) as {
            sortOrder?: typeof casinoSort;
          };
          if (parsedPreferences.sortOrder === ("status" as any) || (!localStorage.getItem("dailyroll_sort_migrated_v2") && parsedPreferences.sortOrder === "f2p")) {
            parsedPreferences.sortOrder = "next-available";
            localStorage.setItem("dailyroll_profile_prefs", JSON.stringify(parsedPreferences));
          }
          const explicitSort = localStorage.getItem("dailyroll_casino_sort");
          if (!explicitSort && parsedPreferences.sortOrder) {
            setCasinoSort(parsedPreferences.sortOrder);
          }
        } catch {
          // Ignore malformed saved preferences.
        }
      }
      setDirectorySnapshot(directoryData);
      if (directoryData.list) setDirectory(directoryData.list);
      setDirectoryUrls({
        ...casinoDirectoryUrls,
        ...sharedUrls,
      });
      setDirectoryAffiliateUrls({
        ...sharedAffiliateUrls,
      });
      setDirectoryClaimUrls({
        ...sharedClaimUrls,
      });
      setDirectoryBonusUrls({
        ...sharedBonusUrls,
      });
      setDirectoryBonusTitles({
        ...sharedBonusTitles,
      });
      setDirectoryProviders(sharedProviders);
      setDirectoryRatings(currentRatings);
      setDirectoryDailyBonuses(directoryData.dailyBonuses || {});
      setDirectoryDailyBonusSc(directoryData.dailyBonusSc || {});
      setDirectoryMinRedemption(directoryData.minRedemption || {});
      setDirectoryResetRules(directoryData.resetRules || {});
      setDirectoryHasStreak(directoryData.hasStreak || {});

      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("speedrun") === "true") {
          setIsSpeedRunOpen(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveCasinos = useCallback((updated: Casino[]) => {
    setCasinos(updated);
    apiSaveCasinos(signedInUserRef.current?.email, updated);
  }, []);

  const statusFor = useCallback((casino: Casino): CasinoStatus => {
    return calculateCasinoStatus(casino, now);
  }, [now]);

  const siteUrlFor = useCallback((casino?: Casino | null): string | undefined => {
    if (!casino) return undefined;
    return (casino.siteUrl ?? casino.url) || undefined;
  }, []);

  const handleClaimSuccess = useCallback(
    (casinoId: string, updatedData?: Partial<Casino>) => {
      const nowIso = new Date().toISOString();
      setCasinos((prev) => {
        const updated = prev.map((item) =>
          item.id === casinoId
            ? {
                ...item,
                lastClaimedAt: nowIso,
                snoozedUntil: null,
                targetResetTimestamp: null,
                ...updatedData,
              }
            : item,
        );
        apiSaveCasinos(signedInUserRef.current?.email, updated);
        return updated;
      });

      try {
        const storedTimes = JSON.parse(localStorage.getItem("dailyroll_claimed_times") || "{}");
        storedTimes[casinoId] = nowIso;
        localStorage.setItem("dailyroll_claimed_times", JSON.stringify(storedTimes));
      } catch {
        // ignore
      }
    },
    [],
  );

  const markClaimed = useCallback((casino: Casino) => {
    handleClaimSuccess(casino.id);
  }, [handleClaimSuccess]);

  // Auto-Commit Pending Claims at 0s (expiresAt <= now)
  useEffect(() => {
    const expiredIds: string[] = [];
    for (const [id, claim] of Object.entries(pendingClaims)) {
      if (now >= claim.expiresAt) {
        expiredIds.push(id);
      }
    }
    if (expiredIds.length > 0) {
      setPendingClaims((prev) => {
        const next = { ...prev };
        for (const id of expiredIds) {
          delete next[id];
        }
        return next;
      });
      for (const id of expiredIds) {
        const targetCasino = casinos.find((c) => c.id === id);
        if (targetCasino) {
          markClaimed(targetCasino);
        }
      }
    }
  }, [now, pendingClaims, casinos, markClaimed]);

  const handleInitiateClaim = useCallback((casino: Casino) => {
    const target = casino.claimUrl ?? siteUrlFor(casino);
    if (target) {
      openInExternalBrowser(target);
    }
    setPendingClaims((prev) => ({
      ...prev,
      [casino.id]: {
        expiresAt: Date.now() + 90000,
        isDefocused: false,
      },
    }));
  }, [siteUrlFor]);

  const handleConfirmClaim = useCallback((casino: Casino) => {
    setPendingClaims((prev) => {
      if (!prev[casino.id]) return prev;
      const next = { ...prev };
      delete next[casino.id];
      return next;
    });
    markClaimed(casino);
  }, [markClaimed]);

  const handleUndoClaim = useCallback((casino: Casino) => {
    setPendingClaims((prev) => {
      if (!prev[casino.id]) return prev;
      const next = { ...prev };
      delete next[casino.id];
      return next;
    });
  }, []);

  const handleUpdateCasino = useCallback((targetCasino: Casino, updates: Partial<Casino>) => {
    const nowIso = new Date().toISOString();
    const normalizedUpdates: Partial<Casino> = { ...updates };
    if (
      (updates.targetResetTimestamp !== undefined || updates.snoozedUntil !== undefined) &&
      !updates.lastClaimedAt
    ) {
      normalizedUpdates.lastClaimedAt = nowIso;
    }
    setCasinos((prev) => {
      const updated = prev.map((item) =>
        item.id === targetCasino.id ? { ...item, ...normalizedUpdates } : item,
      );
      apiSaveCasinos(signedInUserRef.current?.email, updated);
      return updated;
    });
  }, []);

  const handleSnoozeCasino = useCallback((targetCasino: Casino, snoozedUntil: string) => {
    setPendingClaims((prev) => {
      if (!prev[targetCasino.id]) return prev;
      const next = { ...prev };
      delete next[targetCasino.id];
      return next;
    });
    const newResetTimestamp = new Date(snoozedUntil).getTime();
    const nowIso = new Date().toISOString();

    setCasinos((prev) => {
      const updated = prev.map((item) =>
        item.id === targetCasino.id
          ? {
              ...item,
              snoozedUntil,
              targetResetTimestamp: !isNaN(newResetTimestamp) ? newResetTimestamp : null,
              lastClaimedAt: nowIso,
            }
          : item,
      );
      apiSaveCasinos(signedInUserRef.current?.email, updated);
      return updated;
    });
  }, []);

  const handleSnoozeDuration = useCallback((targetCasino: Casino, durationMs: number) => {
    setPendingClaims((prev) => {
      if (!prev[targetCasino.id]) return prev;
      const next = { ...prev };
      delete next[targetCasino.id];
      return next;
    });
    const snoozedUntil = new Date(Date.now() + durationMs).toISOString();
    handleSnoozeCasino(targetCasino, snoozedUntil);
  }, [handleSnoozeCasino]);

  const handleSetCustomTimer = useCallback((targetCasino: Casino, targetResetTimestamp: number, customSc?: number) => {
    setPendingClaims((prev) => {
      if (!prev[targetCasino.id]) return prev;
      const next = { ...prev };
      delete next[targetCasino.id];
      return next;
    });
    const nowIso = new Date().toISOString();
    setCasinos((prev) => {
      const updated = prev.map((item) =>
        item.id === targetCasino.id
          ? {
              ...item,
              targetResetTimestamp,
              lastClaimedAt: nowIso,
              snoozedUntil: null,
              ...(customSc !== undefined
                ? { dailyBonusSc: String(customSc), dailyBonus: `${customSc} SC` }
                : {}),
            }
          : item,
      );
      apiSaveCasinos(signedInUserRef.current?.email, updated);
      return updated;
    });
  }, []);

  const handleResetToReady = useCallback((targetCasino: Casino) => {
    setPendingClaims((prev) => {
      if (!prev[targetCasino.id]) return prev;
      const next = { ...prev };
      delete next[targetCasino.id];
      return next;
    });
    setCasinos((prev) => {
      const updated = prev.map((item) =>
        item.id === targetCasino.id
          ? {
              ...item,
              ...resetCasinoTimers(),
            }
          : item,
      );
      apiSaveCasinos(signedInUserRef.current?.email, updated);
      return updated;
    });

    try {
      const storedTimes = JSON.parse(localStorage.getItem("dailyroll_claimed_times") || "{}");
      delete storedTimes[targetCasino.id];
      localStorage.setItem("dailyroll_claimed_times", JSON.stringify(storedTimes));
    } catch {
      // ignore
    }
  }, []);

  const handleCancelSnooze = useCallback((targetCasino: Casino) => {
    setPendingClaims((prev) => {
      if (!prev[targetCasino.id]) return prev;
      const next = { ...prev };
      delete next[targetCasino.id];
      return next;
    });
    setCasinos((prev) => {
      const updated = prev.map((item) =>
        item.id === targetCasino.id
          ? {
              ...item,
              snoozedUntil: null,
            }
          : item,
      );
      apiSaveCasinos(signedInUserRef.current?.email, updated);
      return updated;
    });
  }, []);

  function handleOpenAllReady() {
    const readyList = casinos.filter((c) => !c.hidden && statusFor(c).ready);
    if (readyList.length === 0) return;

    const nowIso = new Date().toISOString();

    // 1. Requirement 3: Ensure user interaction state and countdown timers fire immediately before navigation
    const readyIds = new Set(readyList.map((c) => c.id));
    const updatedCasinos = casinos.map((item) =>
      readyIds.has(item.id)
        ? { ...item, lastClaimedAt: nowIso }
        : item,
    );
    saveCasinos(updatedCasinos);

    try {
      const storedTimes = JSON.parse(localStorage.getItem("dailyroll_claimed_times") || "{}");
      readyList.forEach((c) => {
        storedTimes[c.id] = nowIso;
      });
      localStorage.setItem("dailyroll_claimed_times", JSON.stringify(storedTimes));
    } catch {
      // ignore
    }

    // 2. Open external browser for each ready casino
    readyList.forEach((casino) => {
      const target = casino.claimUrl ?? siteUrlFor(casino);
      if (target) {
        openInExternalBrowser(target);
      }
    });
  }

  async function handleLaunchAllStaggered() {
    const readyList = casinos.filter((c) => !c.hidden && statusFor(c).ready);
    if (readyList.length === 0 || isStaggering) return;

    setIsStaggering(true);
    abortStaggerRef.current = false;

    let currentCasinos = [...casinos];

    for (let i = 0; i < readyList.length; i++) {
      if (abortStaggerRef.current) break;

      const casino = readyList[i];
      setStaggerStatus(`Launching ${i + 1} of ${readyList.length}: ${casino.name}...`);

      // 1. Requirement 3: Ensure user interaction state fires immediately before navigation
      const nowIso = new Date().toISOString();
      currentCasinos = currentCasinos.map((item) =>
        item.id === casino.id ? { ...item, lastClaimedAt: nowIso } : item
      );
      saveCasinos(currentCasinos);

      try {
        const storedTimes = JSON.parse(localStorage.getItem("dailyroll_claimed_times") || "{}");
        storedTimes[casino.id] = nowIso;
        localStorage.setItem("dailyroll_claimed_times", JSON.stringify(storedTimes));
      } catch {
        // ignore
      }

      // 2. Open external browser via deep link
      const deepLink = getCasinoDeepLink(casino);
      if (deepLink) {
        openInExternalBrowser(deepLink);
      }

      // 1.5s interval to avoid browser pop-up suppression
      if (i < readyList.length - 1 && !abortStaggerRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setIsStaggering(false);
    setStaggerStatus(null);
  }

  function handleCancelStagger() {
    abortStaggerRef.current = true;
    setIsStaggering(false);
    setStaggerStatus(null);
  }

  const openCasino = useCallback((casino: Casino) => {
    const target = siteUrlFor(casino);
    if (target) openInExternalBrowser(target);
  }, [siteUrlFor]);

  const handleClaimFromFeed = useCallback((casino: Casino) => {
    // 1. Requirement 3: Ensure user interaction state fires immediately before navigation
    markClaimed(casino);
    const target = casino.claimUrl || siteUrlFor(casino) || "https://google.com";
    openInExternalBrowser(target);
  }, [markClaimed, siteUrlFor]);

  const openBonus = useCallback((casino: Casino) => {
    if (casino.bonusUrl) openInExternalBrowser(casino.bonusUrl);
  }, []);

  const unclaim = useCallback((casino: Casino) => {
    handleResetToReady(casino);
  }, [handleResetToReady]);

  const toggleHiddenCasino = useCallback((casino: Casino) => {
    setCasinos((prev) => {
      const updated = prev.map((item) =>
        item.id === casino.id ? { ...item, hidden: !item.hidden } : item,
      );
      apiSaveCasinos(signedInUserRef.current?.email, updated);
      return updated;
    });
  }, []);

  const handleToggleActionMenu = useCallback((id: string) => {
    setOpenActionMenu((open) => (open === id ? null : id));
  }, []);

  const profileInitial = isAdmin ? "A" : signedInUser?.name.trim().charAt(0).toUpperCase() ?? "";

  function addCasino(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !url.trim()) return;
    if (isAddCasinosPage && isAdmin) {
      const trimmedName = name.trim();
      const normalizedUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
      const dailyBonus = bonus.trim() || "Free daily";
      const updatedDirectory = directory.includes(trimmedName) ? directory : [...directory, trimmedName];
      setDirectory(updatedDirectory);
      setDirectoryUrls((prev) => ({ ...prev, [trimmedName]: normalizedUrl }));
      if (newProvider.trim()) {
        setDirectoryProviders((prev) => ({ ...prev, [trimmedName]: newProvider.trim() }));
      }
      apiUpdateAdminCasino({
        name: trimmedName,
        siteUrl: normalizedUrl,
        dailyBonus,
        provider: newProvider.trim() || undefined,
      }).catch((err) => console.error("Failed to add admin casino:", err));
      setName("");
      setUrl("");
      setBonus("");
      setNewProvider("");
      setIsAddOpen(false);
      return;
    }
    const entry: Casino = {
      id: Date.now().toString(),
      name: name.trim(),
      dailyBonus: bonus.trim() || "Free daily",
      siteUrl: url.startsWith("http") ? url : `https://${url}`,
      claimUrl: newClaimUrl.trim()
        ? newClaimUrl.trim().startsWith("http")
          ? newClaimUrl.trim()
          : `https://${newClaimUrl.trim()}`
        : undefined,
      lastClaimedAt: null,
      intervalHours: 24,
      resetAtTime: useSpecificReset ? resetTime : null,
      provider: newProvider.trim() || undefined,
    };
    saveCasinos([...casinos, entry]);
    setName("");
    setBonus("");
    setUrl("");
    setNewClaimUrl("");
    setNewProvider("");
    setUse24HourReset(true);
    setUseSpecificReset(false);
    setResetTime("00:00");
    setIsAddOpen(false);
  }

  function addDirectoryCasino(casinoName: string, stayOnList = false) {
    if (
      casinos.some(
        (casino) => casino.name.toLowerCase() === casinoName.toLowerCase(),
      )
    ) {
      if (!stayOnList) showAddCasinosPage(false);
      return;
    }
    const seed = getCasinoDefaultMetadata(casinoName);
    const siteUrl =
      directoryUrls[casinoName] ||
      seed?.siteUrl ||
      `https://www.google.com/search?q=${encodeURIComponent(`${casinoName} casino`)}`;
    const entry: Casino = {
      id: Date.now().toString(),
      name: casinoName,
      dailyBonus: directoryDailyBonuses[casinoName] || seed?.dailyBonus || "Free daily",
      dailyBonusSc: directoryDailyBonusSc[casinoName] || seed?.dailyBonusSc,
      dailyBonusGc: seed?.dailyBonusGc,
      minRedemption: directoryMinRedemption[casinoName] || seed?.minRedemption,
      resetRule: directoryResetRules[casinoName] || seed?.resetRule || "24h cooldown",
      hasStreak: directoryHasStreak[casinoName] ?? seed?.hasStreak ?? false,
      siteUrl,
      affiliateUrl: directoryAffiliateUrls[casinoName],
      claimUrl: directoryClaimUrls[casinoName],
      bonusUrl: directoryBonusUrls[casinoName],
      lastClaimedAt: null,
      intervalHours: seed?.intervalHours || 24,
      trustpilotRating: directoryRatings[casinoName] ?? seed?.trustpilotRating,
    };
    saveCasinos([...casinos, entry]);
    if (!stayOnList) showAddCasinosPage(false);
  }

  function signUpForCasino(casinoName: string) {
    const casinoUrl =
      directoryAffiliateUrls[casinoName] ??
      directoryUrls[casinoName] ??
      `https://www.google.com/search?q=${encodeURIComponent(`${casinoName} casino`)}`;
    addDirectoryCasino(casinoName, true);
    openInExternalBrowser(casinoUrl);
  }

  function restoreDefaultCasinos() {
    const restoredDirectory = Array.from(new Set([...directory, ...casinoDirectory]));
    setDirectory(restoredDirectory);
    apiSaveDirectory({ list: restoredDirectory });
  }

  function openCasinoEditor(casino: Casino) {
    editScrollPosition.current = window.scrollY;
    setEditingCasino(casino);
    setEditUrl(casino.siteUrl ?? casino.url ?? "");
    setEditProvider(casino.provider || directoryProviders[casino.name] || "");
    setEditDetails(casino.details || "Daily bonus available");
    setEditBonus(casino.dailyBonus);
    setEditTrustpilotRating(casino.trustpilotRating?.toString() || "");
    setEditUseSpecificReset(Boolean(casino.resetAtTime));
    setEditResetTime(casino.resetAtTime || "00:00");
    setEditAffiliateUrl(casino.affiliateUrl ?? "");
    setEditClaimUrl(casino.claimUrl ?? "");
    setEditBonusUrl(casino.bonusUrl ?? "");
    setEditBonusTitle(casino.bonusTitle ?? "");
  }

  function openDirectoryEditor(casinoName: string) {
    openCasinoEditor({
      id: `directory:${casinoName}`,
      name: casinoName,
      dailyBonus: "Free daily",
      siteUrl: directoryUrls[casinoName] || undefined,
      affiliateUrl: directoryAffiliateUrls[casinoName] || undefined,
      claimUrl: directoryClaimUrls[casinoName] || undefined,
      bonusUrl: directoryBonusUrls[casinoName] || undefined,
      lastClaimedAt: null,
      intervalHours: 24,
      trustpilotRating: directoryRatings[casinoName],
      bonusTitle: directoryBonusTitles[casinoName] || undefined,
      provider: directoryProviders[casinoName] || undefined,
    });
  }

  async function saveCasinoEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCasino) return;
    const normalizedSiteUrl = editUrl.trim()
      ? editUrl.trim().startsWith("http")
        ? editUrl.trim()
        : `https://${editUrl.trim()}`
      : null;
    const affiliateUrl = editAffiliateUrl.trim().startsWith("http") ? editAffiliateUrl.trim() : (editAffiliateUrl.trim() ? `https://${editAffiliateUrl.trim()}` : null);
    const claimUrl = editClaimUrl.trim().startsWith("http") ? editClaimUrl.trim() : (editClaimUrl.trim() ? `https://${editClaimUrl.trim()}` : null);
    const bonusUrl = editBonusUrl.trim().startsWith("http") ? editBonusUrl.trim() : (editBonusUrl.trim() ? `https://${editBonusUrl.trim()}` : null);
    const bonusTitle = editBonusTitle.trim() || null;
    const rating = editTrustpilotRating.trim() !== ""
      ? Number(editTrustpilotRating)
      : null;
    const resetTime = editUseSpecificReset ? editResetTime : null;
    const dailyBonus = editBonus.trim() || "Free daily";
    const details = editDetails.trim() || null;
    const provider = editProvider.trim() || null;

    if (isAdmin) {
      // 1. Authoritative global update for admin: writes to Upstash Redis master directory AND all user lists atomically
      try {
        const response = await apiUpdateAdminCasino({
          name: editingCasino.name,
          siteUrl: normalizedSiteUrl,
          affiliateUrl,
          claimUrl,
          bonusUrl,
          bonusTitle,
          trustpilotRating: rating,
          dailyBonus,
          details,
          resetAtTime: resetTime,
          provider,
        });

        if (response.ok && response.directory) {
          setDirectoryUrls({ ...casinoDirectoryUrls, ...response.directory.urls });
          setDirectoryAffiliateUrls(response.directory.affiliateUrls || {});
          setDirectoryClaimUrls(response.directory.claimUrls || {});
          setDirectoryBonusUrls(response.directory.bonusUrls || {});
          setDirectoryBonusTitles(response.directory.bonusTitles || {});
          setDirectoryRatings(response.directory.ratings || {});
          if (response.directory.providers) {
            setDirectoryProviders(response.directory.providers);
          }
        }
      } catch (saveErr) {
        console.error("Failed to update admin casino metadata:", saveErr);
      }

      // Update local casino list immediately without triggering a racing personal save
      setCasinos((prev) =>
        prev.map((c) =>
          c.name.toLowerCase() === editingCasino.name.toLowerCase()
            ? {
                ...c,
                siteUrl: normalizedSiteUrl,
                url: normalizedSiteUrl,
                affiliateUrl,
                claimUrl,
                bonusUrl,
                bonusTitle,
                trustpilotRating: rating,
                dailyBonus,
                details,
                resetAtTime: resetTime,
                provider,
              }
            : c,
        ),
      );
    } else {
      // Regular non-admin user personal settings save
      if (!editingCasino.id.startsWith("directory:")) {
        saveCasinos(
          casinos.map((casino) =>
            casino.id === editingCasino.id
              ? {
                  ...casino,
                  siteUrl: normalizedSiteUrl,
                  affiliateUrl,
                  claimUrl,
                  bonusUrl,
                  bonusTitle,
                  resetAtTime: resetTime,
                  details,
                  dailyBonus,
                }
              : casino,
          ),
        );
      }
    }

    setEditingCasino(null);
    if (editScrollPosition.current !== null) {
      const scrollPosition = editScrollPosition.current;
      requestAnimationFrame(() => window.scrollTo({ top: scrollPosition, behavior: "instant" }));
      editScrollPosition.current = null;
    }
  }

  const bonusAmount = (casino: Casino) => {
    const match = casino.dailyBonus.match(/[0-9]+(?:\.[0-9]+)?/);
    return match ? Number(match[0]) : 0;
  };

  const ratingForCasino = useCallback((casinoName: string, recordRating?: number | null) => {
    const matchingName = Object.keys(directoryRatings).find(
      (name) => name.toLowerCase() === casinoName.toLowerCase(),
    );
    if (matchingName) {
      const numericDirectoryRating = Number(directoryRatings[matchingName]);
      if (Number.isFinite(numericDirectoryRating)) return numericDirectoryRating;
    }
    const numericRecordRating = Number(recordRating);
    return Number.isFinite(numericRecordRating) ? numericRecordRating : undefined;
  }, [directoryRatings]);

  const sortedCasinos = casinos
    .filter((casino) => {
      if (!showHidden && casino.hidden) return false;
      const isPending = Boolean(pendingClaims[casino.id]);
      const isReady = statusFor(casino).ready;
      if (casinoFilter === "ready") return isReady || isPending;
      if (casinoFilter === "claimed") return !isReady && !isPending;

      // Custom list filter
      const currentList = customLists.find((l) => l.id === activeListId) || customLists[0];
      if (currentList && currentList.id !== "all") {
        if (!currentList.casinoIds.includes(casino.id)) return false;
      }

      return true;
    })
    .sort((firstCasino, secondCasino) => {
      const firstPending = pendingClaims[firstCasino.id];
      const secondPending = pendingClaims[secondCasino.id];

      // 3-tier ranking:
      // Rank 0: Pending claim (always pinned at top until timer runs out)
      // Rank 1: Ready cards
      // Rank 2: Cooldown/Claimed cards
      const getRank = (casino: Casino, pending?: { expiresAt: number; isDefocused?: boolean }) => {
        if (pending) {
          return 0; // Permanently pinned at top until timer runs out
        }
        return statusFor(casino).ready ? 1 : 2;
      };

      const rank1 = getRank(firstCasino, firstPending);
      const rank2 = getRank(secondCasino, secondPending);

      if (rank1 !== rank2) {
        return rank1 - rank2;
      }

      // If both are in pending tier (0), sort by expiresAt (soonest to expire first)
      if (rank1 === 0) {
        return (firstPending?.expiresAt ?? 0) - (secondPending?.expiresAt ?? 0);
      }

      if (casinoSort === "next-available") {
        const status1 = statusFor(firstCasino);
        const status2 = statusFor(secondCasino);
        if (status1.ready !== status2.ready) {
          return Number(status2.ready) - Number(status1.ready);
        }
        if (!status1.ready && !status2.ready) {
          return status1.remainingMs - status2.remainingMs;
        }
        return firstCasino.name.localeCompare(secondCasino.name);
      }
      if (casinoSort === "provider") {
        const p1 = (firstCasino.provider || directoryProviders[firstCasino.name] || "").toLowerCase();
        const p2 = (secondCasino.provider || directoryProviders[secondCasino.name] || "").toLowerCase();
        if (!p1 && p2) return 1;
        if (p1 && !p2) return -1;
        const comp = p1.localeCompare(p2);
        return comp !== 0 ? comp : firstCasino.name.localeCompare(secondCasino.name);
      }
      if (casinoSort === "name-asc") {
        return firstCasino.name.localeCompare(secondCasino.name);
      }
      if (casinoSort === "name-desc") {
        return secondCasino.name.localeCompare(firstCasino.name);
      }
      if (casinoSort === "f2p") {
        const readyDifference = Number(statusFor(secondCasino).ready) - Number(statusFor(firstCasino).ready);
        return readyDifference || bonusAmount(secondCasino) - bonusAmount(firstCasino);
      }
      if (casinoSort === "trustpilot") {
        const firstRating = firstCasino.trustpilotRating ?? -1;
        const secondRating = secondCasino.trustpilotRating ?? -1;
        return secondRating - firstRating;
      }
      return Number(statusFor(secondCasino).ready) - Number(statusFor(firstCasino).ready);
    });

  const visibleDirectory = [...directory]
    .filter((casinoName) => {
      const isAdded = casinos.some(
        (casino) =>
          casino.hidden !== true &&
          casino.name.toLowerCase() === casinoName.toLowerCase(),
      );
      if (directoryFilter === "added") return isAdded;
      if (directoryFilter === "all" || showAlreadyAdded) return true;
      return !isAdded;
    })
    .sort((firstName, secondName) => {
      if (directorySort === "name-asc") return firstName.localeCompare(secondName);
      if (directorySort === "name-desc") return secondName.localeCompare(firstName);
      const firstCasino = casinos.find((casino) => casino.name.toLowerCase() === firstName.toLowerCase());
      const secondCasino = casinos.find((casino) => casino.name.toLowerCase() === secondName.toLowerCase());
      if (directorySort === "trustpilot") {
        return (secondCasino?.trustpilotRating ?? -1) - (firstCasino?.trustpilotRating ?? -1);
      }
      return bonusAmount(secondCasino || { dailyBonus: "", name: secondName } as Casino) - bonusAmount(firstCasino || { dailyBonus: "", name: firstName } as Casino);
    });

  const actionCasino = openActionMenu
    ? casinos.find((casino) => casino.id === openActionMenu) || null
    : null;

  const dailyTotals = casinos.reduce(
    (totals, casino) => {
      if (casino.hidden) return totals;
      const value = bonusAmount(casino);
      if (statusFor(casino).ready) {
        totals.available += value;
      } else if (casino.lastClaimedAt && isSameLocalDay(casino.lastClaimedAt, now)) {
        totals.claimedToday += value;
      }
      return totals;
    },
    { available: 0, claimedToday: 0 },
  );

  // Broadcast live SC available and claimed totals to TopBar
  useEffect(() => {
    try {
      localStorage.setItem("dailyroll_sc_totals", JSON.stringify(dailyTotals));
      window.dispatchEvent(new CustomEvent("dailyroll_sc_totals", { detail: dailyTotals }));
    } catch {
      // ignore
    }
  }, [dailyTotals.available, dailyTotals.claimedToday]);

  const readyCasinos = casinos.filter((c) => !c.hidden && statusFor(c).ready);
  // User's active Rollcall casinos (filtered strictly by non-hidden and active custom list)
  const activeCustomList = customLists.find((l) => l.id === activeListId) || customLists[0];
  const userRollcallCasinos = casinos.filter((c) => {
    if (c.hidden) return false;
    if (activeCustomList && activeCustomList.id !== "all") {
      return activeCustomList.casinoIds.includes(c.id);
    }
    return true;
  });

  const readyRollcallCasinos = userRollcallCasinos.filter((c) => statusFor(c).ready);
  const readyCount = readyRollcallCasinos.length;

  const handleOpenSpeedRun = () => {
    const readyList = casinos.filter((c) => !c.hidden && statusFor(c).ready);
    if (!readyList || readyList.length === 0) return;
    if (readyCount === 0 || readyRollcallCasinos.length === 0) return;
    setIsSpeedRunOpen(true);
  };

  return (
    <main className="min-h-screen bg-[#090b0a] text-[#e6eee5]">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] cursor-pointer transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}
      <aside
        ref={sidebarRef}
        className={`fixed right-0 top-0 z-50 flex h-screen w-64 flex-col justify-between border-l border-emerald-900/30 bg-[#0a1410] px-5 py-5 shadow-2xl transition-transform duration-200 lg:px-6 lg:py-8 ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div>
          {(signedInUser || isAdmin) && (
            <div ref={profileMenuRef} className="mb-5 border-b border-emerald-900/30 pb-4">
              <div className="relative flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((open) => !open)}
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Open profile menu"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#385e40] bg-[#1b3625] p-0.5 transition hover:border-[#79b77f] overflow-hidden"
                >
                  {signedInUser?.avatarUrl ? (
                    <img
                      src={signedInUser.avatarUrl}
                      alt={signedInUser.name || "Profile"}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#79b77f] text-sm font-bold text-[#122519]">
                      {profileInitial}
                    </span>
                  )}
                </button>
                {isSidebarOpen && (
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#91a595]">
                      {isAdmin ? "Admin" : "Profile"}
                    </p>
                    <p className="truncate text-sm font-semibold text-[#e5eee3]">
                      {isAdmin ? "Administrator" : signedInUser?.name}
                    </p>
                  </div>
                )}
                {isProfileMenuOpen && (
                  <div
                    className={`absolute z-50 w-64 rounded-xl border border-[#38503d] bg-[#19251f] p-3 shadow-2xl ${isSidebarOpen ? "right-0 top-full mt-2" : "right-full top-0 mr-3"}`}
                    role="menu"
                  >
                    <p className="px-3 py-2 text-xs text-[#718275]">
                      {isAdmin ? "Admin profile" : "Signed in as"}
                    </p>
                    <p className="px-3 text-sm font-semibold text-[#e5eee3]">
                      {isAdmin ? "Administrator" : signedInUser?.name}
                    </p>
                    {!isAdmin && (
                      <p className="truncate px-3 pt-1 text-xs text-[#91a595]">
                        {signedInUser?.email}
                      </p>
                    )}
                    <div className="my-3 border-t border-[#304638]" />
                    {isAdmin && (
                      <Link
                        href="/dashboard"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsSidebarOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#b7d5b5] hover:bg-[#2a4230]"
                      >
                        <ShieldCheck size={14} /> Admin workspace
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={signOut}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#e69b91] hover:bg-[#422c2b]"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          <nav
            className="flex flex-col gap-1.5"
            aria-label="Dashboard navigation"
          >
            <button
              type="button"
              onClick={() => {
                setActiveDrawer("feed");
                showAddCasinosPage(false);
                setIsSidebarOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors text-gray-400 hover:bg-emerald-950/30 hover:text-white"
            >
              <MessageSquare size={16} /> Community Feed
            </button>
            <button
              type="button"
              onClick={() => {
                showAddCasinosPage(false);
                setIsSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${!isAddCasinosPage ? "border border-emerald-800/50 bg-emerald-900/40 text-emerald-300" : "text-gray-400 hover:bg-emerald-950/30 hover:text-white"}`}
            >
              <LayoutDashboard size={16} /> My Rollcall
            </button>
            {!signedInUser && (
              <Link
                href="/dashboard"
                onClick={() => setIsSidebarOpen(false)}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-gray-400 transition-colors hover:bg-emerald-950/30 hover:text-white"
              >
                <ShieldCheck size={16} /> Admin workspace
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                showAddCasinosPage(true);
                setIsSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${isAddCasinosPage ? "border border-emerald-800/50 bg-emerald-900/40 text-emerald-300" : "text-gray-400 hover:bg-emerald-950/30 hover:text-white"}`}
            >
              <Compass size={16} /> Explore Casinos
            </button>
            <Link
              href="/profile"
              onClick={() => setIsSidebarOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-gray-400 transition-colors hover:bg-emerald-950/30 hover:text-white"
            >
              <Settings size={16} /> Profile settings
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsSidebarOpen(false);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("dailyroll_open_ai_assistant"));
                }
              }}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-950/30 hover:text-emerald-300 cursor-pointer"
            >
              <Sparkles size={16} /> AI Bonus Assistant
            </button>
            {!signedInUser && (
              <Link
                href="/dashboard#sign-ups"
                onClick={() => setIsSidebarOpen(false)}
                className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-gray-400 transition-colors hover:bg-emerald-950/30 hover:text-white"
              >
                All casinos
              </Link>
            )}
          </nav>
        </div>
        <div className="border-t border-emerald-900/30 pt-5 text-xs text-gray-500">
          <span className="text-emerald-400">{casinos.length}</span> casinos
          tracked
        </div>
      </aside>
      <button
        ref={sidebarToggleRef}
        type="button"
        onClick={() => setIsSidebarOpen((open) => !open)}
        aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
        aria-expanded={isSidebarOpen}
        title={isSidebarOpen ? "Close menu" : signedInUser?.name || "Open menu"}
        className={`fixed right-3.5 top-2.5 z-50 grid h-9 w-9 place-items-center rounded-full border shadow-lg backdrop-blur transition-all duration-150 sm:right-6 sm:top-3.5 lg:right-8 ${
          isSidebarOpen
            ? "border-emerald-500 bg-[#14231b] text-emerald-300 hover:bg-[#1d3327]"
            : "border-[#385e40] bg-[#101815]/90 text-[#b7d5b5] hover:border-[#79b77f] hover:scale-105 active:scale-95 overflow-hidden"
        }`}
      >
        {isSidebarOpen ? (
          <X size={18} />
        ) : signedInUser?.avatarUrl ? (
          <img
            src={signedInUser.avatarUrl}
            alt={signedInUser.name || "Profile"}
            className="h-full w-full object-cover"
          />
        ) : signedInUser || isAdmin ? (
          <span className="grid h-full w-full place-items-center bg-gradient-to-br from-emerald-800 to-teal-900 text-xs font-bold text-emerald-100">
            {profileInitial}
          </span>
        ) : (
          <Menu size={18} />
        )}
      </button>
      <div className="w-full px-2.5 pt-3 pb-24 sm:px-8 sm:py-6 sm:pb-28">
        {/* Header (only on Add Casinos sub-page) */}
        {isAddCasinosPage && (
          <header className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3 border-b border-[#263a2c] pb-3 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => showAddCasinosPage(false)}
                className="rounded-lg border border-[#344d3b] bg-[#111b16] px-2.5 py-1 text-xs text-[#9bcf9c] hover:bg-[#192b20]"
              >
                ← Back to Tracker
              </button>
              <h1
                className="text-lg font-normal uppercase tracking-[0.08em] text-[#f3f8f0] sm:text-2xl"
                style={{ fontFamily: "Rhinos, Impact, sans-serif" }}
              >
                EXPLORE CASINOS
              </h1>
            </div>
          </header>
        )}

        {isAddCasinosPage ? (
          <div className="mx-auto max-w-4xl">
            <section className="mt-4">
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <select
                  value={directoryFilter}
                  onChange={(event) => setDirectoryFilter(event.target.value as typeof directoryFilter)}
                  aria-label="Filter all casinos"
                  className="h-9 rounded-lg border border-[#344d3b] bg-[#111b16] px-2 text-xs text-[#d4e4d2] outline-none focus:border-[#78ae7e]"
                >
                  <option value="available">Available to add</option>
                  <option value="added">Already added</option>
                  <option value="all">All casinos</option>
                </select>
                <select
                  value={directorySort}
                  onChange={(event) => setDirectorySort(event.target.value as typeof directorySort)}
                  aria-label="Sort all casinos"
                  className="h-9 rounded-lg border border-[#344d3b] bg-[#111b16] px-2 text-xs text-[#d4e4d2] outline-none focus:border-[#78ae7e]"
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="f2p">Best F2P / Free to play</option>
                  <option value="trustpilot">Highest Trustpilot rating</option>
                </select>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={restoreDefaultCasinos}
                    className="h-9 rounded-lg border border-[#4c6d50] px-3 text-xs font-semibold text-[#b7d5b5] transition hover:bg-[#2a4230]"
                  >
                    Restore default casinos
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAddOpen(true)}
                  className="ml-auto flex h-9 items-center gap-1.5 rounded-lg bg-[#79b77f] px-3.5 text-sm font-semibold text-[#122519] shadow-[0_6px_16px_rgba(121,183,127,0.22)] transition hover:bg-[#91c991]"
                >
                  <Plus size={15} /> Custom casino
                </button>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3">
                {visibleDirectory.map((casinoName) => {
                  const seed = getCasinoDefaultMetadata(casinoName);
                  const trackedCasino = casinos.find(
                    (c) => c.name.toLowerCase() === casinoName.toLowerCase()
                  );
                  const isAdded = Boolean(trackedCasino);
                  const hasStreak = directoryHasStreak[casinoName] ?? seed?.hasStreak ?? false;
                  const minRedemption = directoryMinRedemption[casinoName] || seed?.minRedemption || (seed ? "$100 Min Cash" : undefined);
                  const dailyBonus = directoryDailyBonuses[casinoName] || seed?.dailyBonus || "Free daily";
                  const siteUrl =
                    directoryUrls[casinoName] ||
                    casinoDirectoryUrls[casinoName] ||
                    seed?.siteUrl ||
                    `https://www.google.com/search?q=${encodeURIComponent(`${casinoName} casino`)}`;

                  return (
                    <article
                      key={casinoName}
                      className="rounded-xl border border-[#293a30] bg-[#17211c] px-4 py-3.5 text-sm font-semibold text-[#d4e4d2] hover:border-[#4c6d50] transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#294631] text-xs font-bold text-[#9bcf9c]">
                            <CasinoLogo
                              name={casinoName}
                              siteUrl={siteUrl}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/casinos/${encodeURIComponent(casinoName)}`}
                                className="truncate hover:text-[#9bcf9c] text-white font-bold"
                              >
                                {casinoName}
                              </Link>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {hasStreak && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-950/40 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                                  <Flame size={10} className="fill-orange-400" />
                                  Streak
                                </span>
                              )}
                              {minRedemption && (
                                <span className="rounded-full border border-[#38503f] bg-[#122218] px-2 py-0.5 text-[10px] font-medium text-[#86a88d]">
                                  {minRedemption}
                                </span>
                              )}
                              <a
                                href={`https://www.trustpilot.com/search?query=${encodeURIComponent(casinoName)}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openInExternalBrowser(`https://www.trustpilot.com/search?query=${encodeURIComponent(casinoName)}`);
                                }}
                                className="inline-flex text-xs font-normal text-[#91bf9b] hover:text-[#c2e4bd]"
                              >
                                <TrustpilotStars
                                  rating={ratingForCasino(casinoName, trackedCasino?.trustpilotRating ?? seed?.trustpilotRating)}
                                />
                              </a>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          {isAdded ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-700/50 bg-[#14281c] px-2.5 text-xs font-bold text-emerald-400">
                                <CheckCircle2 size={13} strokeWidth={2.5} />
                                In Rollcall
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (trackedCasino) markClaimed(trackedCasino);
                                  openInExternalBrowser(siteUrl);
                                }}
                                className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg bg-[#39ff6a] px-3 text-xs font-extrabold text-[#0d1712] shadow-[0_4px_12px_rgba(57,255,106,0.25)] transition hover:bg-[#5aff84]"
                              >
                                <CheckCircle2 size={13} strokeWidth={2.5} />
                                Claim {dailyBonus}!
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => addDirectoryCasino(casinoName, true)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#38503f] bg-[#122218] px-2.5 text-xs font-semibold text-[#9bcf9c] hover:bg-[#1a2f21] transition"
                              >
                                <Plus size={13} />
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  addDirectoryCasino(casinoName, true);
                                  openInExternalBrowser(siteUrl);
                                }}
                                className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg bg-[#39ff6a] px-3 text-xs font-extrabold text-[#0d1712] shadow-[0_4px_12px_rgba(57,255,106,0.25)] transition hover:bg-[#5aff84]"
                              >
                                <CheckCircle2 size={13} strokeWidth={2.5} />
                                Claim {dailyBonus}!
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => signUpForCasino(casinoName)}
                            aria-label={`Sign up for ${casinoName}`}
                            className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-[#3b5240] bg-[#111e16] px-2.5 text-xs font-semibold text-[#86a88d] transition hover:text-white hover:border-emerald-500"
                          >
                            Sign up <ExternalLink size={12} strokeWidth={2.5} />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openDirectoryEditor(casinoName)}
                              className="inline-flex h-8 items-center rounded-lg border border-[#4c6d50] px-3 text-xs font-semibold text-[#b7d5b5] transition hover:bg-[#2a4230]"
                            >
                              Edit
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!window.confirm(`Are you sure you want to remove ${casinoName} from the casino list?`)) return;
                                const updated = directory.filter((item) => item !== casinoName);
                                setDirectory(updated);
                                apiSaveDirectory({ list: updated });
                              }}
                              aria-label={`Remove ${casinoName}`}
                              className="text-[#718275] hover:text-[#e69b91]"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
                {visibleDirectory.length === 0 && (
                  <p className="col-span-full rounded-xl border border-dashed border-[#38503d] px-4 py-6 text-center text-sm text-[#819487]">
                    All listed casinos are already on your dashboard.
                  </p>
                )}
              </div>
              <label className="mt-4 flex w-fit items-center gap-3 text-sm text-[#a9bbaa]">
                <input
                  type="checkbox"
                  checked={showAlreadyAdded}
                  onChange={(event) => setShowAlreadyAdded(event.target.checked)}
                  className="h-4 w-4 accent-[#79b77f]"
                />
                Show already added casinos
              </label>
            </section>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-3 px-1 sm:px-2 pb-24">
            {/* Controls Card: Lists, Filter & Sort Dropdowns */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3 sm:p-3.5 text-xs text-zinc-400 shadow-sm backdrop-blur-sm space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full items-center">
                {/* Group 1: Lists Dropdown */}
                <div className="flex items-center w-full min-w-0">
                  <span className="text-xs font-semibold text-zinc-400 mr-2 shrink-0">List:</span>
                  <select
                    value={activeListId}
                    onChange={(event) => {
                      const val = event.target.value;
                      if (val === "__create_new__") {
                        setIsNewListModalOpen(true);
                      } else if (val) {
                        handleSelectActiveList(val);
                      }
                    }}
                    aria-label="Select casino list"
                    className="h-9 w-full rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-200 text-xs px-3 focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer"
                  >
                    {customLists.map((list) => {
                      const count =
                        list.id === "all"
                          ? casinos.filter((c) => !c.hidden).length
                          : list.casinoIds.filter((id) => casinos.some((c) => c.id === id && !c.hidden)).length;
                      return (
                        <option key={list.id} value={list.id} className="bg-zinc-900 text-zinc-200">
                          {list.name} ({count})
                        </option>
                      );
                    })}
                    <option disabled value="" className="bg-zinc-900 text-zinc-600">
                      ──────────
                    </option>
                    <option value="__create_new__" className="bg-zinc-900 text-emerald-400 font-semibold">
                      + Create New List...
                    </option>
                  </select>
                </div>

                {/* Group 2: Filter Dropdown */}
                <div className="flex items-center w-full min-w-0">
                  <span className="text-xs font-semibold text-zinc-400 mr-2 shrink-0">Filter:</span>
                  <select
                    value={casinoFilter}
                    onChange={(event) => setCasinoFilter(event.target.value as typeof casinoFilter)}
                    aria-label="Filter casinos"
                    className="h-9 w-full rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-200 text-xs px-3 focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="all" className="bg-zinc-900 text-zinc-200">All casinos</option>
                    <option value="ready" className="bg-zinc-900 text-zinc-200">Ready to claim</option>
                    <option value="claimed" className="bg-zinc-900 text-zinc-200">Claimed</option>
                  </select>
                </div>

                {/* Group 3: Sort Dropdown */}
                <div className="flex items-center w-full min-w-0">
                  <span className="text-xs font-semibold text-zinc-400 mr-2 shrink-0">Sort:</span>
                  <select
                    value={casinoSort}
                    onChange={(event) => {
                      const next = event.target.value as typeof casinoSort;
                      setCasinoSort(next);
                      try {
                        localStorage.setItem("dailyroll_casino_sort", next);
                        localStorage.setItem("dailyroll_sort_migrated_v2", "true");
                        const stored = localStorage.getItem("dailyroll_profile_prefs");
                        if (stored) {
                          const parsed = JSON.parse(stored);
                          parsed.sortOrder = next;
                          localStorage.setItem("dailyroll_profile_prefs", JSON.stringify(parsed));
                        }
                      } catch {}
                    }}
                    aria-label="Sort casinos"
                    className="h-9 w-full rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-200 text-xs px-3 focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="next-available" className="bg-zinc-900 text-zinc-200">Next Available</option>
                    <option value="provider" className="bg-zinc-900 text-zinc-200">Provider</option>
                    <option value="f2p" className="bg-zinc-900 text-zinc-200">Best F2P</option>
                    <option value="trustpilot" className="bg-zinc-900 text-zinc-200">Trustpilot</option>
                    <option value="name-asc" className="bg-zinc-900 text-zinc-200">Name A-Z</option>
                    <option value="name-desc" className="bg-zinc-900 text-zinc-200">Name Z-A</option>
                  </select>
                </div>
              </div>

              {/* Auxiliary Controls: Active List Management & Show Hidden */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/40">
                {activeListId !== "all" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500">Custom list:</span>
                    <button
                      type="button"
                      onClick={() => setIsManageListModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                    >
                      <Settings size={12} />
                      <span>Manage casinos</span>
                    </button>
                    <span className="text-zinc-700">•</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteList(activeListId)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 hover:text-rose-300 transition cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>Delete list</span>
                    </button>
                  </div>
                ) : (
                  <div />
                )}

                <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none hover:text-zinc-200 transition shrink-0 ml-auto">
                  <input
                    type="checkbox"
                    checked={showHidden}
                    onChange={(event) => setShowHidden(event.target.checked)}
                    aria-label="Show hidden casinos"
                    className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 accent-emerald-500 cursor-pointer"
                  />
                  <span>Show hidden</span>
                </label>
              </div>
            </div>

            {/* Primary Action Buttons Row (Directly Beneath Filter & Sort Controls) */}
            <div className="grid grid-cols-3 gap-2 w-full mt-3 mb-4">
              {/* 1. Open All (X) */}
              {isStaggering ? (
                <div className="h-9 px-2 sm:px-3 rounded-xl bg-zinc-900/90 border border-amber-500/50 text-amber-300 font-semibold text-xs flex items-center justify-between gap-1 whitespace-nowrap animate-pulse">
                  <div className="flex items-center gap-1 min-w-0">
                    <Loader2 size={13} className="animate-spin text-amber-400 shrink-0" />
                    <span className="truncate text-[11px]">{staggerStatus || "Launching..."}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelStagger}
                    title="Cancel launching remaining casinos"
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition shrink-0 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLaunchAllStaggered}
                  disabled={readyCount === 0}
                  title={
                    readyCount > 0
                      ? `Open all ${readyCount} ready casinos (staggered to prevent popup blocking)`
                      : "No casinos currently ready to claim"
                  }
                  className={`h-9 px-2 sm:px-3 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all whitespace-nowrap ${
                    readyCount > 0
                      ? "cursor-pointer hover:border-zinc-700 hover:text-white shadow-sm"
                      : "opacity-60 cursor-not-allowed"
                  }`}
                >
                  <ExternalLink size={14} className="shrink-0" />
                  <span>Open All ({readyCount})</span>
                </button>
              )}

              {/* 2. Add Casinos */}
              <button
                type="button"
                onClick={() => setIsAddCasinosModalOpen(true)}
                title="Add casinos to your rollcall"
                className="h-9 px-2 sm:px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} className="shrink-0" />
                <span>Add Casinos</span>
              </button>

              {/* 3. Speed Run (X) */}
              <button
                type="button"
                onClick={handleOpenSpeedRun}
                disabled={readyCount === 0}
                title={readyCount > 0 ? `Start Speed Run session (${readyCount} ready)` : "No casinos currently ready to claim"}
                className={`h-9 px-2 sm:px-3 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all whitespace-nowrap ${
                  readyCount > 0
                    ? "cursor-pointer hover:border-zinc-700 hover:text-white shadow-sm"
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                <Zap size={14} className={readyCount > 0 ? "text-amber-400 fill-amber-400 shrink-0" : "text-zinc-500 shrink-0"} />
                <span>Speed Run ({readyCount})</span>
              </button>
            </div>

            {/* Casinos List using RollcallCard */}
            <div className="space-y-2.5 pb-24">
              {sortedCasinos.map((casino) => (
                <RollcallCard
                  key={casino.id}
                  casino={casino}
                  now={now}
                  status={statusFor(casino)}
                  siteUrl={siteUrlFor(casino)}
                  rating={ratingForCasino(casino.name, casino.trustpilotRating)}
                  isActionMenuOpen={openActionMenu === casino.id}
                  onToggleActionMenu={handleToggleActionMenu}
                  onClaim={handleInitiateClaim}
                  onConfirmClaim={handleConfirmClaim}
                  onUndoClaim={handleUndoClaim}
                  onResetToReady={handleResetToReady}
                  onCancelSnooze={handleCancelSnooze}
                  onSnoozeDuration={handleSnoozeDuration}
                  onSetCustomTimer={handleSetCustomTimer}
                  onOpenCasino={openCasino}
                  onOpenBonus={casino.bonusUrl ? openBonus : undefined}
                  pendingInfo={pendingClaims[casino.id]}
                />
              ))}
              {sortedCasinos.length === 0 && (
                <div className="rounded-2xl border border-dashed border-emerald-900/60 bg-[#0c1f17]/40 p-8 text-center text-xs text-[#718275] space-y-3">
                  <p>No casinos found matching the current filter.</p>
                  {activeListId !== "all" && (
                    <button
                      type="button"
                      onClick={() => setIsManageListModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 font-bold text-zinc-950 hover:bg-emerald-400 transition cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Casinos to this List</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
        {actionCasino && (
          <div
            className="fixed inset-0 z-20 grid place-items-center bg-black/65 p-5"
            role="presentation"
            onMouseDown={() => setOpenActionMenu(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-[#38503d] bg-[#19251f] p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="casino-actions-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">
                    Casino actions
                  </p>
                  <h2 id="casino-actions-title" className="mt-2 font-serif text-2xl font-semibold text-[#e5eee3]">
                    {actionCasino.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenActionMenu(null)}
                  aria-label="Close casino actions"
                  className="text-[#91a595] hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-6 grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenu(null);
                    toggleHiddenCasino(actionCasino);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl border border-[#4c6d50] px-4 py-3 text-left text-sm font-semibold text-[#d4e4d2] hover:bg-[#2a4230]"
                >
                  <EyeOff size={16} /> {actionCasino.hidden ? "Unhide casino" : "Hide casino"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenu(null);
                    openCasinoEditor(actionCasino);
                  }}
                  className="w-full rounded-xl border border-[#4c6d50] px-4 py-3 text-left text-sm font-semibold text-[#d4e4d2] hover:bg-[#2a4230]"
                >
                  Edit casino
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenu(null);
                    handleResetToReady(actionCasino);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl border border-[#4c6d50] px-4 py-3 text-left text-sm font-semibold text-emerald-400 hover:bg-[#2a4230]"
                >
                  <RotateCcw size={16} /> Mark as Ready to Claim
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = actionCasino;
                    setOpenActionMenu(null);
                    setCustomTimerCasino(target);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl border border-zinc-700/80 px-4 py-3 text-left text-sm font-semibold text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                >
                  <Clock size={16} className="text-[#f0a03c]" /> Set Custom Timer
                </button>
                <div className="flex items-center gap-2 rounded-xl border border-amber-800/50 bg-amber-950/20 px-4 py-2.5">
                  <span className="text-xs font-semibold text-amber-300 shrink-0">Snooze:</span>
                  <select
                    value=""
                    onChange={(e) => {
                      const ms = Number(e.target.value);
                      if (ms) {
                        setOpenActionMenu(null);
                        handleSnoozeDuration(actionCasino, ms);
                      }
                    }}
                    aria-label="Snooze casino"
                    className="flex-1 rounded-lg border border-amber-700/60 bg-[#16130b] px-2 py-1 text-xs font-medium text-amber-200 outline-none hover:border-amber-500 cursor-pointer"
                  >
                    <option value="">Select duration...</option>
                    {SNOOZE_PRESETS.map((p) => (
                      <option key={p.ms} value={p.ms} className="bg-[#101b15] text-white">
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                {actionCasino.snoozedUntil && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionMenu(null);
                      handleCancelSnooze(actionCasino);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl border border-amber-800/60 px-4 py-3 text-left text-sm font-semibold text-amber-300 hover:bg-amber-950/40 cursor-pointer"
                  >
                    <X size={16} /> Cancel Snooze
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenu(null);
                    saveCasinos(casinos.filter((item) => item.id !== actionCasino.id));
                  }}
                  className="flex w-full items-center gap-2 rounded-xl border border-[#633c3d] px-4 py-3 text-left text-sm font-semibold text-[#e69b91] hover:bg-[#422c2b]"
                >
                  <Trash2 size={16} /> Delete casino
                </button>
              </div>
            </div>
          </div>
        )}
      {customTimerCasino && (
        <CustomTimerModal
          isOpen={Boolean(customTimerCasino)}
          casino={customTimerCasino}
          currentRemainingMs={statusFor(customTimerCasino).remainingMs}
          onClose={() => setCustomTimerCasino(null)}
          onSave={(target, targetResetTimestamp, customSc) => {
            const casinoObj = typeof target === "string" ? customTimerCasino : target;
            handleSetCustomTimer(casinoObj, targetResetTimestamp, customSc);
            setCustomTimerCasino(null);
          }}
        />
      )}
      {editingCasino && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3.5 sm:p-5 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => setEditingCasino(null)}
        >
          <form
            onSubmit={saveCasinoEdits}
            className="flex flex-col max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-2xl border border-[#38503d] bg-[#19251f] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-casino-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* Pinned Header */}
            <div className="shrink-0 p-4 sm:p-5 pb-3 border-b border-[#2d4432] flex items-start justify-between bg-[#19251f]">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">
                  Casino editor
                </p>
                <h2
                  id="edit-casino-title"
                  className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-[#e5eee3]"
                >
                  Edit {editingCasino.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingCasino(null)}
                aria-label="Close edit casino prompt"
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#344d3b] text-[#91a595] hover:border-[#5ca06c] hover:bg-[#14231b] hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5">
              <label className="block text-xs font-semibold text-[#a9bbaa]">
                Casino URL
                <input
                  type="text"
                  required
                  inputMode="url"
                  value={editUrl}
                  onChange={(event) => setEditUrl(event.target.value)}
                  placeholder="https://casino.example"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                />
              </label>
              {isAdmin && (
                <label className="block text-xs font-semibold text-[#a9bbaa]">
                  Provider / Network Group
                  <input
                    type="text"
                    value={editProvider}
                    onChange={(event) => setEditProvider(event.target.value)}
                    placeholder="VGW, Blazesoft, or leave blank if standalone"
                    className="mt-1.5 h-11 w-full rounded-xl border border-emerald-600/50 bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              {isAdmin && (
                <label className="block text-xs font-semibold text-[#a9bbaa]">
                  Trustpilot rating
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={editTrustpilotRating}
                    onChange={(event) => setEditTrustpilotRating(event.target.value)}
                    placeholder="0 to 5"
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              {isAdmin && (
                <label className="block text-xs font-semibold text-[#a9bbaa]">
                  Affiliate URL (Sign up link)
                  <input
                    type="text"
                    inputMode="url"
                    value={editAffiliateUrl}
                    onChange={(event) => setEditAffiliateUrl(event.target.value)}
                    placeholder="https://casino.example?ref=..."
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              {isAdmin && (
                <label className="block text-xs font-semibold text-[#a9bbaa]">
                  Claim URL (Claim Now link)
                  <input
                    type="text"
                    inputMode="url"
                    value={editClaimUrl}
                    onChange={(event) => setEditClaimUrl(event.target.value)}
                    placeholder="https://casino.example"
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              {isAdmin && (
                <label className="block text-xs font-semibold text-[#a9bbaa]">
                  Bonus URL (bonus details link)
                  <input
                    type="text"
                    inputMode="url"
                    value={editBonusUrl}
                    onChange={(event) => setEditBonusUrl(event.target.value)}
                    placeholder="https://casino.example/bonus"
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              {isAdmin && (
                <label className="block text-xs font-semibold text-[#a9bbaa]">
                  Bonus button title
                  <input
                    type="text"
                    value={editBonusTitle}
                    onChange={(event) => setEditBonusTitle(event.target.value)}
                    placeholder="e.g. Daily Bonus, 100% Match"
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              <label className="block text-xs font-semibold text-[#a9bbaa]">
                Bonus label
                <input
                  value={editBonus}
                  onChange={(event) => setEditBonus(event.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                />
              </label>
              <label className="block text-xs font-semibold text-[#a9bbaa]">
                Details
                <textarea
                  value={editDetails}
                  onChange={(event) => setEditDetails(event.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 py-2 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                />
              </label>
              <fieldset className="mt-1 space-y-2.5">
                <legend className="text-xs font-semibold text-[#a9bbaa]">
                  Reset timer
                </legend>
                <p className="text-xs font-normal text-[#8ea394]">
                  Default: reset 24 hours after claiming.
                </p>
                <label className="flex items-center gap-3 text-xs font-normal text-[#a9bbaa] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editUseSpecificReset}
                    onChange={(event) => setEditUseSpecificReset(event.target.checked)}
                    className="h-4 w-4 accent-[#79b77f]"
                  />
                  Reset at a specific time daily
                </label>
                {editUseSpecificReset && (
                  <input
                    type="time"
                    required
                    value={editResetTime}
                    onChange={(event) => setEditResetTime(event.target.value)}
                    aria-label="Casino daily reset time"
                    className="h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                )}
              </fieldset>
            </div>

            {/* Sticky Pinned Footer */}
            <div className="shrink-0 p-4 border-t border-white/10 bg-[#121815] sticky bottom-0 z-10 flex gap-2.5">
              <button
                type="button"
                onClick={() => setEditingCasino(null)}
                className="h-11 flex-1 rounded-xl border border-[#344d3b] bg-[#1a2b21] text-xs sm:text-sm font-semibold text-[#b8d1b9] hover:bg-[#233b2d] hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-11 flex-1 rounded-xl bg-gradient-to-r from-[#79b77f] to-[#39ff6a] text-xs sm:text-sm font-bold text-[#122519] shadow-[0_4px_14px_rgba(57,255,106,0.3)] hover:brightness-105 active:scale-98 transition"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3.5 sm:p-5 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => setIsAddOpen(false)}
        >
          <form
            onSubmit={addCasino}
            className="flex flex-col max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-2xl border border-[#38503d] bg-[#19251f] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-casino-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* Pinned Header */}
            <div className="shrink-0 p-4 sm:p-5 pb-3 border-b border-[#2d4432] flex items-start justify-between bg-[#19251f]">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">
                  Rollcall
                </p>
                <h2
                  id="add-casino-title"
                  className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-[#e5eee3]"
                >
                  Add a casino
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                aria-label="Close add casino prompt"
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#344d3b] text-[#91a595] hover:border-[#5ca06c] hover:bg-[#14231b] hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5">
              <input
                required
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Casino name"
                className="h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm outline-none placeholder:text-[#718275] focus:border-[#78ae7e]"
              />
              <input
                value={newProvider}
                onChange={(event) => setNewProvider(event.target.value)}
                placeholder="Provider / Network Group (e.g. VGW, Blazesoft, or leave blank)"
                className="h-11 w-full rounded-xl border border-emerald-600/50 bg-[#111b16] px-3 text-sm outline-none placeholder:text-[#718275] focus:border-[#78ae7e]"
              />
              <input
                value={bonus}
                onChange={(event) => setBonus(event.target.value)}
                placeholder="Daily bonus (e.g. 1.00 SC)"
                className="h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm outline-none placeholder:text-[#718275] focus:border-[#78ae7e]"
              />
              <input
                required
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="Website URL (e.g. https://stake.us)"
                className="h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm outline-none placeholder:text-[#718275] focus:border-[#78ae7e]"
              />
              <input
                value={newClaimUrl}
                onChange={(event) => setNewClaimUrl(event.target.value)}
                placeholder="Direct claim URL (optional)"
                className="h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm outline-none placeholder:text-[#718275] focus:border-[#78ae7e]"
              />
              <fieldset className="mt-2 space-y-2.5">
                <legend className="mb-2 text-xs font-semibold text-[#d4e4d2]">
                  Reset time
                </legend>
                <label className="flex items-center gap-3 text-xs text-[#a9bbaa] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={use24HourReset}
                    onChange={(event) => {
                      setUse24HourReset(event.target.checked);
                      if (event.target.checked) setUseSpecificReset(false);
                    }}
                    className="h-4 w-4 accent-[#79b77f]"
                  />{" "}
                  Reset 24 hours after claiming
                </label>
                <label className="flex items-center gap-3 text-xs text-[#a9bbaa] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSpecificReset}
                    onChange={(event) => {
                      setUseSpecificReset(event.target.checked);
                      if (event.target.checked) setUse24HourReset(false);
                    }}
                    className="h-4 w-4 accent-[#79b77f]"
                  />{" "}
                  Reset at a specific time daily
                </label>
                {useSpecificReset && (
                  <input
                    type="time"
                    required
                    value={resetTime}
                    onChange={(event) => setResetTime(event.target.value)}
                    aria-label="Daily reset time"
                    className="h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                )}
              </fieldset>
            </div>

            {/* Sticky Pinned Footer */}
            <div className="shrink-0 p-4 border-t border-white/10 bg-[#121815] sticky bottom-0 z-10 flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="h-11 flex-1 rounded-xl border border-[#344d3b] bg-[#1a2b21] text-xs sm:text-sm font-semibold text-[#b8d1b9] hover:bg-[#233b2d] hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-11 flex-1 rounded-xl bg-gradient-to-r from-[#79b77f] to-[#39ff6a] text-xs sm:text-sm font-bold text-[#122519] shadow-[0_4px_14px_rgba(57,255,106,0.3)] hover:brightness-105 active:scale-98 transition flex items-center justify-center gap-1.5"
              >
                <Plus size={15} />
                <span>Add to tracker</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <SpeedRunErrorBoundary onClose={() => setIsSpeedRunOpen(false)}>
        <SpeedRunModal
          isOpen={isSpeedRunOpen}
          onClose={() => setIsSpeedRunOpen(false)}
          readyCasinos={readyRollcallCasinos}
          allCasinos={userRollcallCasinos}
          onClaim={markClaimed}
          onClaimSuccess={handleClaimSuccess}
          onUpdateCasino={handleUpdateCasino}
          onSnooze={handleSnoozeCasino}
          renderLogo={(casino) =>
            casino ? <CasinoLogo name={casino.name} siteUrl={siteUrlFor(casino)} /> : null
          }
        />
      </SpeedRunErrorBoundary>

      <AddCasinosModal
        isOpen={isAddCasinosModalOpen}
        onClose={() => setIsAddCasinosModalOpen(false)}
        casinos={casinos}
        onAddCasino={(name) => addDirectoryCasino(name, true)}
        onClaimCasino={(c) => markClaimed(c)}
        directoryData={directorySnapshot}
        isAdmin={isAdmin}
      />

      {/* Floating Feed & Drops Circular Icon Badges (Docked Top-Right under Header, Stacked Vertically) */}
      <aside
        aria-label="Quick Access Feeds"
        className="fixed top-16 right-3.5 z-40 flex flex-col items-center gap-2.5 sm:right-6 lg:right-8"
      >
        {/* Community Feed Button */}
        <button
          type="button"
          onClick={() => setActiveDrawer((prev) => (prev === "feed" ? null : "feed"))}
          aria-label="Open Community Feed"
          title="Open Community Feed"
          className="group h-10 w-10 rounded-full bg-gradient-to-b from-[#0e241b]/95 via-[#0a1b13]/95 to-[#06110c]/95 border border-emerald-500/50 hover:border-emerald-400 active:scale-95 shadow-lg shadow-black/80 backdrop-blur-md flex items-center justify-center relative transition-all duration-300 cursor-pointer hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
        >
          <span className="absolute inset-0 rounded-full bg-emerald-400/10 animate-pulse pointer-events-none" />
          <MessageSquare className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
          {feedUnreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-emerald-400 to-teal-400 text-zinc-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.7)] ring-2 ring-[#070d0a]">
              {feedUnreadCount}
            </span>
          )}
        </button>

        {/* Bonus Drops Circular Button */}
        <button
          type="button"
          onClick={() => setActiveDrawer((prev) => (prev === "drops" ? null : "drops"))}
          aria-label="Open Bonus Drops"
          title="Open Bonus Drops"
          className="group h-10 w-10 rounded-full bg-gradient-to-b from-[#1f1a0e]/95 via-[#161208]/95 to-[#0e0c05]/95 border border-amber-500/50 hover:border-amber-400 active:scale-95 shadow-lg shadow-black/80 backdrop-blur-md flex items-center justify-center relative transition-all duration-300 cursor-pointer hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
        >
          <span className="absolute inset-0 rounded-full bg-amber-400/10 animate-pulse pointer-events-none" />
          <Gift className="w-5 h-5 text-amber-400 group-hover:text-amber-300 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
          {activeDropsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.7)] ring-2 ring-[#070d0a]">
              {activeDropsCount}
            </span>
          )}
        </button>
      </aside>

      {/* Slide-Over Drawer Overlay for Community Feed & Drops */}
      {activeDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity cursor-pointer"
            onClick={() => setActiveDrawer(null)}
            aria-label="Close drawer"
          />

          {/* Drawer Container */}
          <div className="relative z-50 flex flex-col w-full sm:w-[500px] lg:w-[560px] h-full bg-[#0c1a13] border-l border-emerald-900/60 shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-emerald-950/80 bg-[#0a150f] px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-emerald-900/60 bg-[#07130e] p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveDrawer("feed")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition cursor-pointer ${
                      activeDrawer === "feed"
                        ? "bg-emerald-500 text-zinc-950 font-bold shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <MessageSquare size={13} />
                    <span>Feed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDrawer("drops")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition cursor-pointer ${
                      activeDrawer === "drops"
                        ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Gift size={13} />
                    <span>Drops</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                title="Close"
                className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-900/40 bg-[#07130e] text-zinc-400 hover:text-white hover:border-emerald-500/50 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <SocialFeed
                compact={true}
                initialType={activeDrawer === "drops" ? "drop_code" : "all"}
                currentUserEmail={signedInUser?.email}
                currentUserName={signedInUser?.name}
                currentUserAvatar={signedInUser?.avatarUrl || undefined}
                isAdmin={isAdmin}
                casinos={casinos}
                onClaimCasino={handleClaimFromFeed}
                onClose={() => setActiveDrawer(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* New Custom List Modal */}
      {isNewListModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsNewListModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-emerald-900/70 bg-[#0c1a13] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-white">Create Custom List</h3>
              <button
                type="button"
                onClick={() => setIsNewListModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateList(newListName);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">List Name</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g. Daily Priority, Wheel Spins..."
                  className="w-full h-9 rounded-lg border border-emerald-900/80 bg-[#07130e] px-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewListModalOpen(false)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newListName.trim()}
                  className="rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-3 py-1.5 text-xs font-bold text-zinc-950 transition cursor-pointer"
                >
                  Create List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage List Casinos Modal */}
      {isManageListModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsManageListModalOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl border border-emerald-900/70 bg-[#0c1a13] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-emerald-950/80 px-4 py-3 bg-[#0a150f]">
              <div>
                <h3 className="font-bold text-sm text-white">
                  Manage List: {customLists.find((l) => l.id === activeListId)?.name}
                </h3>
                <p className="text-[11px] text-zinc-400">Check casinos to include in this list</p>
              </div>
              <button
                type="button"
                onClick={() => setIsManageListModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[60vh]">
              {casinos
                .filter((c) => !c.hidden)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((casino) => {
                  const currentList = customLists.find((l) => l.id === activeListId);
                  const isInList = currentList?.casinoIds.includes(casino.id) ?? false;

                  return (
                    <label
                      key={casino.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                        isInList
                          ? "border-emerald-500/50 bg-emerald-950/30 text-white"
                          : "border-zinc-800/80 bg-[#07130e]/80 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 shrink-0 grid place-items-center rounded bg-[#0f1d15] border border-emerald-900/40 text-xs">
                          <CasinoLogo name={casino.name} siteUrl={siteUrlFor(casino)} />
                        </div>
                        <span className="text-xs font-semibold truncate">{casino.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isInList}
                        onChange={() => handleToggleCasinoInActiveList(casino.id)}
                        className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                      />
                    </label>
                  );
                })}
            </div>
            <div className="flex justify-end border-t border-emerald-950/80 px-4 py-3 bg-[#0a150f]">
              <button
                type="button"
                onClick={() => setIsManageListModalOpen(false)}
                className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-1.5 text-xs font-bold text-zinc-950 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
