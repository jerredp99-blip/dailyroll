"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  EyeOff,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
  X,
  MessageSquare,
  Gift,
  Loader2,
  Zap,
  RotateCcw,
  Flame,
  Sparkles,
  Pencil,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SocialFeed } from "@/app/components/feed/SocialFeed";
import { RollcallCard } from "@/app/components/RollcallCard";
import { ExpandableSearch } from "@/app/components/ExpandableSearch";
import { useActiveDropsCount, notifyDropsUpdated } from "@/lib/dropsStore";
import { calculateCasinoStatus, resetCasinoTimers, useCurrentTime, SNOOZE_PRESETS, type CasinoStatus } from "@/lib/timerUtils";
import {
  getCasinoNotificationPreferences,
  setCasinoNotificationPreference,
  fetchServerNotificationPreferences,
  requestNotificationPermission,
  getNotificationPermission,
  sendCasinoReadyNotification,
} from "@/lib/notifications";
import { getCasinoDeepLink } from "@/lib/casinoLinks";
import { openInExternalBrowser } from "@/lib/openExternalLink";
import { SpeedRunModal } from "@/app/components/SpeedRunModal";
import { SpeedRunErrorBoundary } from "@/components/SpeedRunErrorBoundary";
import { AddCasinosModal } from "@/components/AddCasinosModal";
import { BalancesIntroTooltip } from "@/components/BalancesIntroTooltip";
import { CustomTimerModal } from "@/components/CustomTimerModal";
import { CasinoDetailsModal } from "@/components/CasinoDetailsModal";
import { Button } from "@/components/ui/Button";
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

function RollcallSkeletonList() {
  return (
    <div className="flex flex-col gap-2.5 w-full pt-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-full h-[66px] rounded-2xl bg-zinc-900/50 border border-emerald-500/10 p-3 flex items-center justify-between animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/80 shrink-0" />
            <div className="flex flex-col gap-1.5">
              <div className="w-28 h-3.5 bg-zinc-800/80 rounded-md" />
              <div className="w-16 h-2.5 bg-zinc-800/60 rounded-md" />
            </div>
          </div>
          <div className="w-24 h-8 rounded-xl bg-zinc-800/80 shrink-0" />
        </div>
      ))}
    </div>
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
  const activeDropsCount = useActiveDropsCount();
  const unclaimedDropsCount = activeDropsCount;
  const [isLoading, setIsLoading] = useState(true);
  const [casinos, setCasinos] = useState<Casino[]>([]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("dailyroll_cached_casinos");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCasinos(parsed);
          setIsLoading(false);
        }
      }
    } catch {}
  }, []);
  const [signedInUser, setSignedInUser] = useState<SignedInUser | null>(null);
  const signedInUserRef = useRef<SignedInUser | null>(null);
  useEffect(() => {
    signedInUserRef.current = signedInUser;
  }, [signedInUser]);

  const [viewingUserEmail, setViewingUserEmail] = useState<string | null>(null);
  const viewingUserEmailRef = useRef<string | null>(null);
  useEffect(() => {
    viewingUserEmailRef.current = viewingUserEmail;
  }, [viewingUserEmail]);
  const now = useCurrentTime();
  const [pendingClaims, setPendingClaims] = useState<Record<string, { expiresAt: number; isDefocused?: boolean }>>({});
  const [feedUnreadCount, setFeedUnreadCount] = useState<number>(0);
  const [lastOpenedCasino, setLastOpenedCasino] = useState<{ name: string; url: string } | null>(null);

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
          if (mounted && posts.length > 0) {
            notifyDropsUpdated(posts);
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
  const [selectedCasinoId, setSelectedCasinoId] = useState<string | null>(null);
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
  const [casinoFilter, setCasinoFilter] = useState<"all" | "ready" | "claimed">("all");
  const [searchQuery, setSearchQuery] = useState("");
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
  const [showAllCasinoDrops, setShowAllCasinoDrops] = useState(false);

  // Casino Timer Notification Preferences & Sync
  const [notificationPreferences, setNotificationPreferences] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const local = getCasinoNotificationPreferences();
    if (local && Object.keys(local).length > 0) {
      setNotificationPreferences(local);
    }
    fetchServerNotificationPreferences()
      .then((serverPrefs) => {
        if (serverPrefs && Object.keys(serverPrefs).length > 0) {
          setNotificationPreferences(serverPrefs);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleNotification = async (casino: Casino) => {
    const currentlyEnabled = Boolean(notificationPreferences[casino.id]);
    if (!currentlyEnabled) {
      const permission = getNotificationPermission();
      if (permission === "unsupported") {
        alert("Browser notifications are not supported in this browser.");
        return;
      }
      if (permission === "denied") {
        alert("Notifications are blocked in your browser settings. Please allow notifications for Daily Roll to receive reset alerts.");
        return;
      }
      if (permission === "default") {
        const granted = await requestNotificationPermission();
        if (granted !== "granted") {
          alert("Notification permission was not granted. Reset alerts cannot be displayed.");
          return;
        }
      }
    }

    const nextState = !currentlyEnabled;
    const updated = await setCasinoNotificationPreference(
      casino.id,
      nextState,
      signedInUser?.email
    );
    setNotificationPreferences(updated);

    // If turned ON, dispatch confirmation alert so user can verify audio, vibration & banner on device
    if (nextState) {
      sendCasinoReadyNotification(
        casino.name,
        "Alerts Active — You'll be notified when reset hits 00:00:00!",
        "/tracker"
      );
    }
  };

  // Monitor countdown timers reaching zero and dispatch browser notifications
  const previousReadinessRef = useRef<Record<string, boolean>>({});
  const lastNotifiedAtRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!casinos || casinos.length === 0) return;
    const nowMs = Date.now();

    casinos.forEach((casino) => {
      if (!casino || !casino.id) return;
      const isNotifEnabled = Boolean(notificationPreferences[casino.id]);
      const status = statusFor(casino);
      const wasReady = previousReadinessRef.current[casino.id];

      // Reset debounce tracking whenever casino is on cooldown/pending
      if (!status.ready) {
        lastNotifiedAtRef.current[casino.id] = 0;
      }

      // If casino was previously on cooldown/pending and is now ready
      if (isNotifEnabled && wasReady === false && status.ready) {
        const lastNotified = lastNotifiedAtRef.current[casino.id] || 0;
        if (nowMs - lastNotified > 30000) {
          lastNotifiedAtRef.current[casino.id] = nowMs;
          sendCasinoReadyNotification(casino.name, casino.dailyBonus, "/tracker");
        }
      }

      // Track current state
      previousReadinessRef.current[casino.id] = status.ready;
    });
  }, [now, casinos, notificationPreferences]);

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
    if (id === "all" || id === "hidden") return;
    if (!window.confirm("Are you sure you want to delete this list?")) return;
    const updated = customLists.filter((l) => l.id !== id);
    saveCustomLists(updated);
    if (activeListId === id) {
      handleSelectActiveList("all");
    }
  };

  const handleToggleCasinoInActiveList = (casinoId: string) => {
    if (activeListId === "all" || activeListId === "hidden") return;
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

  useEffect(() => {
    const handleOpenFeed = () => {
      setActiveDrawer("feed");
    };
    const handleOpenAddCasinos = () => {
      setIsAddCasinosModalOpen(true);
    };
    const handleAddCasinoEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ casinoName: string; affiliateUrl?: string; targetUrl?: string }>;
      if (customEvent.detail?.casinoName) {
        addDirectoryCasino(customEvent.detail.casinoName, true);
      }
    };
    window.addEventListener("dailyroll_open_feed", handleOpenFeed);
    window.addEventListener("dailyroll_open_add_casinos", handleOpenAddCasinos);
    window.addEventListener("dailyroll_add_casino", handleAddCasinoEvent);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("feed") === "open") {
        setActiveDrawer("feed");
      }
    }
    return () => {
      window.removeEventListener("dailyroll_open_feed", handleOpenFeed);
      window.removeEventListener("dailyroll_open_add_casinos", handleOpenAddCasinos);
      window.removeEventListener("dailyroll_add_casino", handleAddCasinoEvent);
    };
  }, [addDirectoryCasino]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user: SignedInUser | null = null;
      let admin = false;

      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const targetUserParam = urlParams?.get("user") || urlParams?.get("key") || null;

      const [authData, directoryData] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" })
          .then((res) => (res.ok ? (res.json() as Promise<{ user: SignedInUser | null; isAdmin: boolean }>) : null))
          .catch(() => null),
        apiGetDirectory(),
        migrateLegacyLocalStorage(),
      ]);
      if (cancelled) return;

      if (authData) {
        user = authData.user;
        admin = authData.isAdmin;
      }

      let effectiveUserKey: string | null = null;
      if (admin && targetUserParam) {
        effectiveUserKey = targetUserParam;
        setViewingUserEmail(targetUserParam);
      }

      const saved = await apiGetCasinos(effectiveUserKey);
      if (cancelled) return;

      const sharedUrls = directoryData?.urls || {};
      const sharedUrlsByName = Object.fromEntries(
        Object.entries(sharedUrls).map(([name, url]) => [(name || "").toLowerCase(), url]),
      );
      const sharedAffiliateUrls = directoryData?.affiliateUrls || {};
      const sharedAffiliateUrlsByName = Object.fromEntries(
        Object.entries(sharedAffiliateUrls).map(([name, url]) => [(name || "").toLowerCase(), url]),
      );
      const sharedClaimUrls = directoryData?.claimUrls || {};
      const sharedClaimUrlsByName = Object.fromEntries(
        Object.entries(sharedClaimUrls).map(([name, url]) => [(name || "").toLowerCase(), url]),
      );
      const sharedBonusUrls = directoryData?.bonusUrls || {};
      const sharedBonusUrlsByName = Object.fromEntries(
        Object.entries(sharedBonusUrls).map(([name, url]) => [(name || "").toLowerCase(), url]),
      );
      const sharedBonusTitles = directoryData?.bonusTitles || {};
      const sharedBonusTitlesByName = Object.fromEntries(
        Object.entries(sharedBonusTitles).map(([name, title]) => [(name || "").toLowerCase(), title]),
      );
      const sharedRatings = directoryData?.ratings || {};
      const sharedRatingsByName = Object.fromEntries(
        Object.entries(sharedRatings).map(([name, rating]) => [(name || "").toLowerCase(), rating]),
      );
      const sharedDailyBonuses = directoryData?.dailyBonuses || {};
      const sharedDailyBonusesByName = Object.fromEntries(
        Object.entries(sharedDailyBonuses).map(([name, val]) => [(name || "").toLowerCase(), val]),
      );
      const sharedResetTimes = directoryData?.resetTimes || {};
      const sharedResetTimesByName = Object.fromEntries(
        Object.entries(sharedResetTimes).map(([name, val]) => [(name || "").toLowerCase(), val]),
      );
      const sharedDetails = directoryData?.details || {};
      const sharedDetailsByName = Object.fromEntries(
        Object.entries(sharedDetails).map(([name, val]) => [(name || "").toLowerCase(), val]),
      );
      const sharedProviders = directoryData?.providers || {};
      const sharedProvidersByName = Object.fromEntries(
        Object.entries(sharedProviders).map(([name, val]) => [(name || "").toLowerCase(), val]),
      );

      let loadedCasinos = saved ?? DEFAULT_CASINOS;
      if (!user && typeof window !== "undefined") {
        try {
          const guestRaw = localStorage.getItem("dailyroll_guest_casinos");
          if (guestRaw) {
            const parsedGuest = JSON.parse(guestRaw);
            if (Array.isArray(parsedGuest) && parsedGuest.length > 0) {
              loadedCasinos = parsedGuest;
            }
          }
        } catch {}
      }
      const currentRatings = { ...sharedRatings };
      if (admin) {
        let hasNewRatings = false;
        (loadedCasinos ?? []).forEach((casino) => {
          if (
            casino &&
            casino.name &&
            typeof casino.name === "string" &&
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
        DEFAULT_CASINOS.filter((c) => Boolean(c?.name)).map((casino) => [(casino.name || "").toLowerCase(), casino.url]),
      );
      let localClaimedTimes: Record<string, string> = {};
      try {
        localClaimedTimes = JSON.parse(localStorage.getItem("dailyroll_claimed_times") || "{}");
      } catch {
        // Ignore malformed localStorage
      }
      const hydratedCasinos = (loadedCasinos ?? [])
        .filter((casino) => Boolean(casino && casino.name && typeof casino.name === "string"))
        .map((casino) => {
          const lowerName = (casino.name || "").trim().toLowerCase();

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
        // Authenticated users strictly use their own server state; guest mode reads unauthenticated localStorage.
        const lastClaimedAt = user ? (casino.lastClaimedAt || null) : (casino.lastClaimedAt || localClaimedTimes[casino.id] || null);

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
      try {
        localStorage.setItem("dailyroll_cached_casinos", JSON.stringify(hydratedCasinos));
      } catch {}
      setIsLoading(false);
      if (user && saved === null) {
        await apiSaveCasinos(user.email, hydratedCasinos);
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("dailyroll_guest_casinos");
          } catch {}
        }
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
    try {
      if (!viewingUserEmailRef.current) {
        localStorage.setItem("dailyroll_cached_casinos", JSON.stringify(updated));
      }
    } catch {}
    const targetKey = viewingUserEmailRef.current || signedInUserRef.current?.email;
    if (targetKey) {
      apiSaveCasinos(targetKey, updated);
    } else if (typeof window !== "undefined") {
      try {
        localStorage.setItem("dailyroll_guest_casinos", JSON.stringify(updated));
      } catch (err) {
        console.warn("Failed to persist guest casinos:", err);
      }
    }
  }, []);

  const statusFor = useCallback((casino?: Casino | null): CasinoStatus => {
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
      setLastOpenedCasino({ name: casino.name, url: target });
      setTimeout(() => setLastOpenedCasino((prev) => (prev?.url === target ? null : prev)), 7000);
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
    // Explicitly track cooldown transition for notification trigger
    previousReadinessRef.current[targetCasino.id] = false;
    lastNotifiedAtRef.current[targetCasino.id] = 0;

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
    if (target) {
      openInExternalBrowser(target);
      setLastOpenedCasino({ name: casino.name, url: target });
      setTimeout(() => setLastOpenedCasino((prev) => (prev?.url === target ? null : prev)), 7000);
    }
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
    if (!casinoName || typeof casinoName !== "string") return;
    if (
      (casinos ?? []).some(
        (casino) =>
          casino?.name &&
          typeof casino.name === "string" &&
          casino.name.toLowerCase() === casinoName.toLowerCase(),
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
          c?.name && editingCasino?.name && c.name.toLowerCase() === editingCasino.name.toLowerCase()
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

  const bonusAmount = (casino?: Casino | null) => {
    if (!casino?.dailyBonus || typeof casino.dailyBonus !== "string") return 0;
    const match = casino.dailyBonus.match(/[0-9]+(?:\.[0-9]+)?/);
    return match ? Number(match[0]) : 0;
  };

  const ratingForCasino = useCallback((casinoName: string, recordRating?: number | null) => {
    if (!casinoName || typeof casinoName !== "string") {
      const numericRecordRating = Number(recordRating);
      return Number.isFinite(numericRecordRating) ? numericRecordRating : undefined;
    }
    const matchingName = Object.keys(directoryRatings || {}).find(
      (name) => name && typeof name === "string" && name.toLowerCase() === casinoName.toLowerCase(),
    );
    if (matchingName) {
      const numericDirectoryRating = Number(directoryRatings[matchingName]);
      if (Number.isFinite(numericDirectoryRating)) return numericDirectoryRating;
    }
    const numericRecordRating = Number(recordRating);
    return Number.isFinite(numericRecordRating) ? numericRecordRating : undefined;
  }, [directoryRatings]);

  const sortedCasinos = (casinos ?? [])
    .filter((casino) => {
      if (!casino || !casino.id) return false;
      if (activeListId === "hidden") {
        if (!casino.hidden) return false;
      } else {
        if (casino.hidden) return false;
      }
      const isPending = Boolean(pendingClaims[casino.id]);
      const isReady = statusFor(casino).ready;
      if (casinoFilter === "ready") return isReady || isPending;
      if (casinoFilter === "claimed") return !isReady && !isPending;

      // Custom list filter
      if (activeListId !== "all" && activeListId !== "hidden") {
        const currentList = (customLists ?? []).find((l) => l?.id === activeListId);
        if (currentList && (!Array.isArray(currentList.casinoIds) || !currentList.casinoIds.includes(casino.id))) return false;
      }

      // Search filter matching casino.name or casino.provider (case-insensitive)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = Boolean(casino.name && typeof casino.name === "string" && casino.name.toLowerCase().includes(q));
        const providerMatch = Boolean(casino.provider && typeof casino.provider === "string" && casino.provider.toLowerCase().includes(q));
        if (!nameMatch && !providerMatch) return false;
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
        return (firstCasino.name || "").localeCompare(secondCasino.name || "");
      }
      if (casinoSort === "provider") {
        const p1 = (firstCasino.provider || (firstCasino.name ? directoryProviders[firstCasino.name] : "") || "").toLowerCase();
        const p2 = (secondCasino.provider || (secondCasino.name ? directoryProviders[secondCasino.name] : "") || "").toLowerCase();
        if (!p1 && p2) return 1;
        if (p1 && !p2) return -1;
        const comp = p1.localeCompare(p2);
        return comp !== 0 ? comp : (firstCasino.name || "").localeCompare(secondCasino.name || "");
      }
      if (casinoSort === "name-asc") {
        return (firstCasino.name || "").localeCompare(secondCasino.name || "");
      }
      if (casinoSort === "name-desc") {
        return (secondCasino.name || "").localeCompare(firstCasino.name || "");
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
      if (!casinoName || typeof casinoName !== "string") return false;
      const isAdded = (casinos ?? []).some(
        (casino) =>
          casino &&
          casino.hidden !== true &&
          casino.name &&
          typeof casino.name === "string" &&
          casino.name.toLowerCase() === casinoName.toLowerCase(),
      );
      if (directoryFilter === "added") return isAdded;
      if (directoryFilter === "all" || showAlreadyAdded) return true;
      return !isAdded;
    })
    .sort((firstName, secondName) => {
      if (directorySort === "name-asc") return (firstName || "").localeCompare(secondName || "");
      if (directorySort === "name-desc") return (secondName || "").localeCompare(firstName || "");
      const firstCasino = (casinos ?? []).find(
        (casino) =>
          casino?.name &&
          typeof casino.name === "string" &&
          casino.name.toLowerCase() === (firstName || "").toLowerCase(),
      );
      const secondCasino = (casinos ?? []).find(
        (casino) =>
          casino?.name &&
          typeof casino.name === "string" &&
          casino.name.toLowerCase() === (secondName || "").toLowerCase(),
      );
      if (directorySort === "trustpilot") {
        return (secondCasino?.trustpilotRating ?? -1) - (firstCasino?.trustpilotRating ?? -1);
      }
      return (
        bonusAmount(secondCasino || ({ dailyBonus: "", name: secondName } as Casino)) -
        bonusAmount(firstCasino || ({ dailyBonus: "", name: firstName } as Casino))
      );
    });

  const actionCasino = openActionMenu
    ? (casinos ?? []).find((casino) => casino && casino.id === openActionMenu) || null
    : null;

  const dailyTotals = (casinos ?? []).reduce(
    (totals, casino) => {
      if (!casino || casino.hidden) return totals;
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

  const totalPortfolioBalance = useMemo(() => {
    return (casinos ?? []).reduce((sum, c) => {
      if (!c || c.hidden) return sum;
      const bal = typeof c.currentBalance === "number" ? c.currentBalance : Number(c.currentBalance);
      return sum + (!isNaN(bal) ? bal : 0);
    }, 0);
  }, [casinos]);

  const [isBalancesTooltipOpen, setIsBalancesTooltipOpen] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("dailyroll_balances_tooltip_dismissed");
      if (dismissed === "true") {
        setIsBalancesTooltipOpen(false);
        return;
      }
      if (totalPortfolioBalance >= 3.0) {
        setIsBalancesTooltipOpen(true);
      }
    } catch {
      // Ignore
    }
  }, [totalPortfolioBalance]);

  const handleDismissBalancesTooltip = useCallback(() => {
    setIsBalancesTooltipOpen(false);
    try {
      localStorage.setItem("dailyroll_balances_tooltip_dismissed", "true");
    } catch {
      // Ignore
    }
  }, []);

  const readyCasinos = (casinos ?? []).filter((c) => c && !c.hidden && statusFor(c).ready);
  // User's active Rollcall casinos (filtered strictly by non-hidden and active custom list)
  const activeCustomList = (customLists ?? []).find((l) => l?.id === activeListId) || (customLists ?? [])[0];
  const userRollcallCasinos = (casinos ?? []).filter((c) => {
    if (!c) return false;
    if (activeListId === "hidden") {
      return Boolean(c.hidden);
    }
    if (c.hidden) return false;
    if (activeCustomList && activeCustomList.id !== "all") {
      return Array.isArray(activeCustomList.casinoIds) && activeCustomList.casinoIds.includes(c.id);
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
                  const trackedCasino = (casinos ?? []).find(
                    (c) => c?.name && typeof c.name === "string" && c.name.toLowerCase() === (casinoName || "").toLowerCase()
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
                              <button
                                type="button"
                                onClick={() => setSelectedCasinoId(casinoName)}
                                className="truncate hover:text-[#9bcf9c] text-white font-bold text-left cursor-pointer"
                              >
                                {casinoName}
                              </button>
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
            {/* Admin Viewing Banner */}
            {viewingUserEmail && isAdmin && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/80 via-emerald-950/80 to-zinc-950/90 p-3.5 sm:px-5 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-amber-200">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>Viewing & Managing Rollcall for <strong className="text-white underline font-extrabold">{viewingUserEmail}</strong> (Admin Mode)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewingUserEmail(null);
                    if (typeof window !== "undefined") {
                      window.location.href = "/tracker";
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-black text-zinc-950 shadow-md transition cursor-pointer"
                >
                  <X size={14} />
                  <span>Exit User View</span>
                </button>
              </div>
            )}

            {/* Controls Card: Lists, Filter & Sort Toolbar + Action Buttons */}
            <div className="w-full bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-2 sm:p-2.5 backdrop-blur-md shadow-sm space-y-2">
              {/* Single Horizontal Row for Dropdowns & Expandable Search */}
              <div className="flex items-center gap-1.5 sm:gap-2 w-full">
                {/* Dropdown 1: Lists */}
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
                  className="h-8 flex-1 min-w-0 bg-zinc-950/80 border border-zinc-800 text-[11px] font-medium text-zinc-200 rounded-xl px-2 py-0 focus:outline-none focus:border-emerald-500 truncate cursor-pointer"
                >
                  {customLists.map((list) => {
                    const count =
                      list.id === "all"
                        ? casinos.filter((c) => !c.hidden).length
                        : list.casinoIds.filter((id) => casinos.some((c) => c.id === id && !c.hidden)).length;
                    return (
                      <option key={list.id} value={list.id} className="bg-zinc-900 text-zinc-200">
                        {list.id === "all" ? `All (${count})` : `${list.name} (${count})`}
                      </option>
                    );
                  })}
                  <option value="hidden" className="bg-zinc-900 text-zinc-400">
                    Hidden ({casinos.filter((c) => Boolean(c.hidden)).length})
                  </option>
                  <option disabled value="" className="bg-zinc-900 text-zinc-600">
                    ──────────
                  </option>
                  <option value="__create_new__" className="bg-zinc-900 text-emerald-400 font-semibold">
                    + New List...
                  </option>
                </select>

                {/* Dropdown 2: Filter */}
                <select
                  value={casinoFilter}
                  onChange={(event) => setCasinoFilter(event.target.value as typeof casinoFilter)}
                  aria-label="Filter casinos"
                  className="h-8 flex-1 min-w-0 bg-zinc-950/80 border border-zinc-800 text-[11px] font-medium text-zinc-200 rounded-xl px-2 py-0 focus:outline-none focus:border-emerald-500 truncate cursor-pointer"
                >
                  <option value="all" className="bg-zinc-900 text-zinc-200">Filter: All</option>
                  <option value="ready" className="bg-zinc-900 text-zinc-200">Ready</option>
                  <option value="claimed" className="bg-zinc-900 text-zinc-200">Claimed</option>
                </select>

                {/* Dropdown 3: Sort */}
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
                  className="h-8 flex-1 min-w-0 bg-zinc-950/80 border border-zinc-800 text-[11px] font-medium text-zinc-200 rounded-xl px-2 py-0 focus:outline-none focus:border-emerald-500 truncate cursor-pointer"
                >
                  <option value="next-available" className="bg-zinc-900 text-zinc-200">Next Avail</option>
                  <option value="provider" className="bg-zinc-900 text-zinc-200">Provider</option>
                  <option value="f2p" className="bg-zinc-900 text-zinc-200">Best F2P</option>
                  <option value="trustpilot" className="bg-zinc-900 text-zinc-200">Trustpilot</option>
                  <option value="name-asc" className="bg-zinc-900 text-zinc-200">Name A-Z</option>
                  <option value="name-desc" className="bg-zinc-900 text-zinc-200">Name Z-A</option>
                </select>

                {/* Collapsible Search Trigger / Inline Input */}
                <ExpandableSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search casinos..."
                  expandedWidth="w-36 sm:w-60"
                />
              </div>

              {/* Auxiliary Controls: Active List Management & Hidden List Indicator */}
              {activeListId !== "all" && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/40">
                  {activeListId === "hidden" ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <EyeOff size={12} className="text-zinc-500 shrink-0" />
                      <span className="font-medium text-zinc-300">
                        Hidden ({casinos.filter((c) => Boolean(c.hidden)).length})
                      </span>
                      <span className="hidden sm:inline text-zinc-600">• Use card menu (•••) to unhide</span>
                    </div>
                  ) : (
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
                  )}
                </div>
              )}

              {/* Primary Action Buttons Row (Embedded Inside Controls Card) */}
              <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 pt-2 border-t border-zinc-800/50 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                  {/* Add Casinos */}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsAddCasinosModalOpen(true)}
                    title="Add casinos to your rollcall"
                    className="flex-1 min-w-0 h-10 px-2.5 sm:px-3 text-xs"
                  >
                    <Plus className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
                    <span className="truncate">Add Casinos</span>
                  </Button>

                  {/* Speed Run Hero (Primary Tactile Anchor) */}
                  <Button
                    type="button"
                    variant={readyCount > 0 ? "primary" : "secondary"}
                    onClick={handleOpenSpeedRun}
                    disabled={readyCount === 0}
                    title={readyCount > 0 ? `Start Speed Run session (${readyCount} ready)` : "No casinos currently ready to claim"}
                    className={`flex-[1.3] min-w-0 h-10 px-2.5 sm:px-3 text-xs uppercase tracking-wider ${
                      readyCount === 0 ? "opacity-50 cursor-not-allowed shadow-none" : ""
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.8)] -rotate-6 shrink-0" />
                    <span className="truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                      Speed Run ({readyCount})
                    </span>
                  </Button>
                </div>

                {/* Tactile Gift Drops Button with Unclaimed Counter Badge */}
                <button
                  type="button"
                  onClick={() => setActiveDrawer((prev) => (prev === "drops" ? null : "drops"))}
                  className="relative h-10 w-10 rounded-2xl bg-zinc-900/90 border border-emerald-500/20 hover:border-emerald-500/40 flex items-center justify-center text-emerald-400 hover:text-emerald-300 transition-all shrink-0 cursor-pointer"
                  title="Bonus Drops"
                  aria-label={`Bonus Drops (${unclaimedDropsCount} unclaimed)`}
                >
                  <Gift className="w-4 h-4 text-emerald-400" />

                  {unclaimedDropsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)] border border-zinc-950 animate-in zoom-in-50 duration-150">
                      {unclaimedDropsCount > 99 ? "99+" : unclaimedDropsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Casinos List using RollcallCard */}
            <div className="space-y-2.5 pb-24">
              {isLoading && casinos.length === 0 ? (
                <RollcallSkeletonList />
              ) : sortedCasinos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-emerald-900/60 bg-[#0c1f17]/40 p-8 text-center text-xs text-[#718275] space-y-3">
                  <p>
                    {searchQuery.trim()
                      ? `No casinos found matching "${searchQuery.trim()}".`
                      : activeListId === "hidden"
                      ? "No hidden casinos found."
                      : "No casinos found matching the current filter."}
                  </p>
                  {searchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-medium text-zinc-300 hover:text-white transition cursor-pointer"
                    >
                      Clear search
                    </button>
                  )}
                  {activeListId !== "all" && activeListId !== "hidden" && !searchQuery.trim() && (
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
              ) : (
                sortedCasinos.map((casino) => (
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
                    onUpdateCasino={handleUpdateCasino}
                    onOpenCasino={openCasino}
                    onOpenBonus={casino.bonusUrl ? openBonus : undefined}
                    onOpenDetails={(id) => setSelectedCasinoId(id)}
                    pendingInfo={pendingClaims[casino.id]}
                    isNotificationEnabled={Boolean(notificationPreferences[casino.id])}
                    onToggleNotification={handleToggleNotification}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
        {actionCasino && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            role="presentation"
            onMouseDown={() => setOpenActionMenu(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-emerald-500/25 bg-zinc-950/95 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-md"
              role="dialog"
              aria-modal="true"
              aria-labelledby="casino-actions-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/80">
                    Casino Actions
                  </p>
                  <h2 id="casino-actions-title" className="text-lg font-black tracking-tight text-white leading-snug">
                    {actionCasino.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenActionMenu(null)}
                  aria-label="Close casino actions"
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800/60 hover:text-white transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {/* Top Action: Mark as Ready */}
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenu(null);
                    handleResetToReady(actionCasino);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-950/40 px-3.5 py-2.5 text-left text-sm font-bold text-emerald-400 hover:bg-emerald-900/40 hover:border-emerald-500/40 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <RotateCcw size={16} className="text-emerald-400" />
                  <span>Mark as Ready to Claim</span>
                </button>

                {/* General Actions */}
                <button
                  type="button"
                  onClick={() => {
                    const current = actionCasino.currentBalance ?? 0;
                    const input = window.prompt(
                      `Enter tracked SC balance for ${actionCasino.name}:`,
                      current > 0 ? current.toFixed(2) : ""
                    );
                    if (input !== null) {
                      const trimmed = input.trim();
                      const val = parseFloat(trimmed);
                      handleUpdateCasino(actionCasino, {
                        currentBalance: trimmed !== "" && !isNaN(val) && val >= 0 ? val : null,
                      });
                    }
                    setOpenActionMenu(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Pencil size={16} className="text-sky-400 shrink-0" />
                  <span>Edit SC Balance</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenu(null);
                    openCasinoEditor(actionCasino);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-zinc-200 hover:bg-zinc-800/60 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Settings size={16} className="text-zinc-400" />
                  <span>Edit casino</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = actionCasino;
                    setOpenActionMenu(null);
                    setCustomTimerCasino(target);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-zinc-200 hover:bg-zinc-800/60 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Clock size={16} className="text-amber-400/80" />
                  <span>Set Custom Timer</span>
                </button>

                {/* Snooze Row */}
                <div className="flex items-center gap-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 px-3.5 py-2.5">
                  <span className="text-xs font-bold text-amber-400 shrink-0">Snooze:</span>
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
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-amber-200 outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">Select duration...</option>
                    {SNOOZE_PRESETS.map((p) => (
                      <option key={p.ms} value={p.ms} className="bg-zinc-900 text-white">
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
                    className="flex w-full items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-950/20 px-3.5 py-2.5 text-left text-sm font-semibold text-amber-300 hover:bg-amber-900/30 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <X size={16} className="text-amber-400" />
                    <span>Cancel Snooze</span>
                  </button>
                )}

                {/* Divider */}
                <div className="my-1 border-t border-zinc-800/80" />

                {/* Danger / Visibility Section */}
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenu(null);
                    toggleHiddenCasino(actionCasino);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-amber-400 hover:bg-amber-500/10 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <EyeOff size={16} className="text-amber-400" />
                  <span>{actionCasino.hidden ? "Unhide casino" : "Hide casino"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenu(null);
                    saveCasinos(casinos.filter((item) => item.id !== actionCasino.id));
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-rose-500 hover:bg-rose-500/10 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Trash2 size={16} className="text-rose-500" />
                  <span>Delete casino</span>
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
            <div className="shrink-0 p-4 pr-14 sm:pr-0 border-t border-white/10 bg-[#121815] sticky bottom-0 z-10 flex gap-2.5 overflow-x-auto no-scrollbar">
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


      {/* Centered Modal Overlay for Bonus Drops & Feed */}
      {activeDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveDrawer(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bonus-drops-modal-title"
        >
          {/* Centered Modal Container */}
          <div
            className="relative w-full max-w-xl max-h-[85vh] bg-[#0c1a13] border border-emerald-900/70 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-emerald-950/80 bg-[#0a150f] px-4 py-3 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                  <h3 id="bonus-drops-modal-title" className="text-sm font-black text-white tracking-wide hidden xs:inline">
                    Bonus Drops
                  </h3>
                </div>

                <div className="flex rounded-lg border border-emerald-900/60 bg-[#07130e] p-0.5 text-xs font-semibold">
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
                    <span>Bonus Drops</span>
                    {activeDropsCount > 0 && (
                      <span
                        className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                          activeDrawer === "drops"
                            ? "bg-zinc-950 text-amber-400"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {activeDropsCount}
                      </span>
                    )}
                  </button>

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
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                title="Close"
                aria-label="Close Bonus Drops modal"
                className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-900/40 bg-[#07130e] text-zinc-400 hover:text-white hover:border-emerald-500/50 transition cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
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
                setIsBonusDropsOpen={(open) => {
                  if (!open) setActiveDrawer(null);
                  else setActiveDrawer("drops");
                }}
                setIsAddCasinosOpen={(open) => {
                  setIsAddCasinosModalOpen(open);
                  if (open) setActiveDrawer(null);
                }}
                onOpenAddCasinos={() => {
                  setActiveDrawer(null);
                  setIsAddCasinosModalOpen(true);
                }}
                showAllCasinoDrops={showAllCasinoDrops}
                setShowAllCasinoDrops={setShowAllCasinoDrops}
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

      {/* Mobile Pop-up Blocker Fallback Toast */}
      {lastOpenedCasino && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-500/50 bg-[#09150f]/95 px-3.5 py-2.5 text-xs text-zinc-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[92vw]">
          <span className="truncate">Opening <strong className="text-white">{lastOpenedCasino.name}</strong>...</span>
          <a
            href={lastOpenedCasino.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 shrink-0"
          >
            Tap if didn't open
          </a>
          <button
            type="button"
            onClick={() => setLastOpenedCasino(null)}
            className="ml-1 text-zinc-400 hover:text-zinc-200 p-0.5 shrink-0"
            aria-label="Dismiss popup notice"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {/* Casino Details Modal Overlay */}
      <CasinoDetailsModal
        casinoId={selectedCasinoId}
        isOpen={Boolean(selectedCasinoId)}
        onClose={() => setSelectedCasinoId(null)}
      />
    </main>
  );
}
