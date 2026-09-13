"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
  Compass,
  Loader2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SocialFeed } from "@/app/components/feed/SocialFeed";
import { RollcallCard } from "@/app/components/RollcallCard";
import { getCasinoDeepLink } from "@/lib/casinoLinks";
import { openInExternalBrowser } from "@/lib/openExternalLink";
import { SpeedRunModal } from "@/app/components/SpeedRunModal";
import { SpeedRunErrorBoundary } from "@/components/SpeedRunErrorBoundary";
// import { BankrollSummary } from "@/app/components/BankrollSummary";
import {
  apiGetCasinos,
  apiGetDirectory,
  apiGetUsers,
  apiSaveCasinos,
  apiSaveDirectory,
  apiUpdateAdminCasino,
} from "@/lib/api-client";
import { migrateLegacyLocalStorage } from "@/lib/migrate-legacy";
import { casinoDirectory, casinoDirectoryUrls } from "@/lib/casino-directory";
import type { Casino } from "@/types/casino";

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

function TrustpilotStars({ rating }: { rating?: number }) {
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
  const [now, setNow] = useState(Date.now);
  const [name, setName] = useState("");
  const [bonus, setBonus] = useState("");
  const [url, setUrl] = useState("");
  const [newClaimUrl, setNewClaimUrl] = useState("");
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
  const [editingCasino, setEditingCasino] = useState<Casino | null>(null);
  const [editUrl, setEditUrl] = useState("");
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [casinoFilter, setCasinoFilter] = useState<"all" | "ready" | "claimed">("all");
  const [casinoSort, setCasinoSort] = useState<"status" | "f2p" | "trustpilot" | "name-asc" | "name-desc">("status");
  const [viewMode, setViewMode] = useState<"social" | "rollcall">("social");
  const [mobileTab, setMobileTab] = useState<"rollcall" | "feed">("feed");
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
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as {
          user: SignedInUser | null;
          isAdmin: boolean;
        };
        user = data.user;
        admin = data.isAdmin;
      } catch {
        // Not signed in.
      }
      if (cancelled) return;

      await migrateLegacyLocalStorage();
      const [saved, directoryData] = await Promise.all([
        apiGetCasinos(user?.email),
        apiGetDirectory(),
      ]);
      if (cancelled) return;

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

        // User Claim & Display State (Personal to this user, decoupled from static metadata):
        const lastClaimedAt = casino.lastClaimedAt || localClaimedTimes[casino.id] || null;

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
          if (parsedPreferences.sortOrder) setCasinoSort(parsedPreferences.sortOrder);
        } catch {
          // Ignore malformed saved preferences.
        }
      }
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
      setDirectoryRatings(currentRatings);

      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("speedrun") === "true") {
          setIsSpeedRunOpen(true);
        }
      }
    })();

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  function saveCasinos(updated: Casino[]) {
    setCasinos(updated);
    apiSaveCasinos(signedInUser?.email, updated);
  }

  function statusFor(casino: Casino): {
    ready: boolean;
    state: StatusState;
    label: string;
    shortLabel: string;
    remainingMs: number;
  } {
    // 1. Check if casino is snoozed (e.g. 1h hold)
    if (casino.snoozedUntil) {
      const snoozeEnd = new Date(casino.snoozedUntil).getTime();
      if (snoozeEnd > now) {
        const remaining = snoozeEnd - now;
        const minutes = Math.floor((remaining % 3600000) / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return {
          ready: false,
          state: "pending",
          label: `Snoozed (${minutes}m ${seconds}s)`,
          shortLabel: `${minutes}m`,
          remainingMs: remaining,
        };
      }
    }

    if (!casino.lastClaimedAt) return { ready: true, state: "ready", label: "Ready to claim", shortLabel: "now", remainingMs: 0 };
    let nextReset =
      new Date(casino.lastClaimedAt).getTime() +
      casino.intervalHours * 60 * 60 * 1000;
    if (casino.resetAtTime) {
      const [hours, minutes] = casino.resetAtTime.split(":").map(Number);
      const reset = new Date(now);
      reset.setHours(hours, minutes, 0, 0);
      if (reset.getTime() <= new Date(casino.lastClaimedAt).getTime())
        reset.setDate(reset.getDate() + 1);
      nextReset = reset.getTime();
    }
    const remaining = nextReset - now;
    if (remaining <= 0) return { ready: true, state: "ready", label: "Ready to claim", shortLabel: "now", remainingMs: 0 };
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return {
      ready: false,
      state: remaining <= 3600000 ? "pending" : "claimed",
      label: `${hours}h ${minutes}m ${seconds}s`,
      shortLabel: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`,
      remainingMs: Math.max(0, remaining),
    };
  }

  function siteUrlFor(casino?: Casino | null): string | undefined {
    if (!casino) return undefined;
    return casino.siteUrl ?? casino.url;
  }

  function markClaimed(casino: Casino) {
    const nowIso = new Date().toISOString();
    saveCasinos(
      casinos.map((item) =>
        item.id === casino.id
          ? { ...item, lastClaimedAt: nowIso, snoozedUntil: null }
          : item,
      ),
    );
    try {
      const storedTimes = JSON.parse(localStorage.getItem("dailyroll_claimed_times") || "{}");
      storedTimes[casino.id] = nowIso;
      localStorage.setItem("dailyroll_claimed_times", JSON.stringify(storedTimes));
    } catch {
      // ignore
    }
  }

  function handleUpdateCasino(targetCasino: Casino, updates: Partial<Casino>) {
    const updated = casinos.map((item) =>
      item.id === targetCasino.id ? { ...item, ...updates } : item,
    );
    saveCasinos(updated);
  }

  function handleSnoozeCasino(targetCasino: Casino, snoozedUntil: string) {
    const updated = casinos.map((item) =>
      item.id === targetCasino.id ? { ...item, snoozedUntil } : item,
    );
    saveCasinos(updated);
  }

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

  function openCasino(casino: Casino) {
    const target = siteUrlFor(casino);
    if (target) openInExternalBrowser(target);
  }

  function handleClaimFromFeed(casino: Casino) {
    // 1. Requirement 3: Ensure user interaction state fires immediately before navigation
    markClaimed(casino);
    const target = casino.claimUrl || siteUrlFor(casino) || "https://google.com";
    openInExternalBrowser(target);
  }

  function openBonus(casino: Casino) {
    if (casino.bonusUrl) openInExternalBrowser(casino.bonusUrl);
  }

  function unclaim(casino: Casino) {
    saveCasinos(
      casinos.map((item) =>
        item.id === casino.id ? { ...item, lastClaimedAt: null } : item,
      ),
    );
    try {
      const storedTimes = JSON.parse(localStorage.getItem("dailyroll_claimed_times") || "{}");
      delete storedTimes[casino.id];
      localStorage.setItem("dailyroll_claimed_times", JSON.stringify(storedTimes));
    } catch {
      // ignore
    }
  }

  function toggleHiddenCasino(casino: Casino) {
    saveCasinos(
      casinos.map((item) =>
        item.id === casino.id ? { ...item, hidden: !item.hidden } : item,
      ),
    );
  }

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
      apiUpdateAdminCasino({
        name: trimmedName,
        siteUrl: normalizedUrl,
        dailyBonus,
      }).catch((err) => console.error("Failed to add admin casino:", err));
      setName("");
      setUrl("");
      setBonus("");
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
    };
    saveCasinos([...casinos, entry]);
    setName("");
    setBonus("");
    setUrl("");
    setNewClaimUrl("");
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
    const siteUrl =
      directoryUrls[casinoName] ||
      `https://www.google.com/search?q=${encodeURIComponent(`${casinoName} casino`)}`;
    const entry: Casino = {
      id: Date.now().toString(),
      name: casinoName,
      dailyBonus: "Free daily",
      siteUrl,
      affiliateUrl: directoryAffiliateUrls[casinoName],
      claimUrl: directoryClaimUrls[casinoName],
      bonusUrl: directoryBonusUrls[casinoName],
      lastClaimedAt: null,
      intervalHours: 24,
      trustpilotRating: directoryRatings[casinoName],
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
    });
  }

  async function saveCasinoEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCasino) return;
    const normalizedSiteUrl = editUrl.trim()
      ? editUrl.trim().startsWith("http")
        ? editUrl.trim()
        : `https://${editUrl.trim()}`
      : (editingCasino.siteUrl ?? "");
    const affiliateUrl = editAffiliateUrl.trim().startsWith("http") ? editAffiliateUrl.trim() : (editAffiliateUrl.trim() ? `https://${editAffiliateUrl.trim()}` : "");
    const claimUrl = editClaimUrl.trim().startsWith("http") ? editClaimUrl.trim() : (editClaimUrl.trim() ? `https://${editClaimUrl.trim()}` : "");
    const bonusUrl = editBonusUrl.trim().startsWith("http") ? editBonusUrl.trim() : (editBonusUrl.trim() ? `https://${editBonusUrl.trim()}` : "");
    const bonusTitle = editBonusTitle.trim() || "";
    const rating = editTrustpilotRating.trim()
      ? Number(editTrustpilotRating)
      : editingCasino.trustpilotRating;
    const resetTime = editUseSpecificReset ? editResetTime : null;
    const dailyBonus = editBonus.trim() || editingCasino.dailyBonus;
    const details = editDetails.trim() || undefined;

    if (isAdmin) {
      // 1. Authoritative global update for admin: writes to Upstash Redis master directory AND all user lists atomically
      try {
        const response = await apiUpdateAdminCasino({
          name: editingCasino.name,
          siteUrl: normalizedSiteUrl || undefined,
          affiliateUrl: affiliateUrl || undefined,
          claimUrl: claimUrl || undefined,
          bonusUrl: bonusUrl || undefined,
          bonusTitle: bonusTitle || undefined,
          trustpilotRating: rating,
          dailyBonus,
          details,
          resetAtTime: resetTime,
        });

        if (response.ok && response.directory) {
          setDirectoryUrls({ ...casinoDirectoryUrls, ...response.directory.urls });
          setDirectoryAffiliateUrls(response.directory.affiliateUrls || {});
          setDirectoryClaimUrls(response.directory.claimUrls || {});
          setDirectoryBonusUrls(response.directory.bonusUrls || {});
          setDirectoryBonusTitles(response.directory.bonusTitles || {});
          setDirectoryRatings(response.directory.ratings || {});
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

  const ratingForCasino = (casinoName: string, recordRating?: number) => {
    const matchingName = Object.keys(directoryRatings).find(
      (name) => name.toLowerCase() === casinoName.toLowerCase(),
    );
    if (matchingName) {
      const numericDirectoryRating = Number(directoryRatings[matchingName]);
      if (Number.isFinite(numericDirectoryRating)) return numericDirectoryRating;
    }
    const numericRecordRating = Number(recordRating);
    return Number.isFinite(numericRecordRating) ? numericRecordRating : undefined;
  };

  const sortedCasinos = casinos
    .filter((casino) => {
      if (!showHidden && casino.hidden) return false;
      if (casinoFilter === "ready") return statusFor(casino).ready;
      if (casinoFilter === "claimed") return !statusFor(casino).ready;
      return true;
    })
    .sort((firstCasino, secondCasino) => {
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

  const readyCasinos = casinos.filter((c) => !c.hidden && statusFor(c).ready);
  const readyCount = readyCasinos.length;

  const handleOpenSpeedRun = () => {
    const readyList = casinos.filter((c) => !c.hidden && statusFor(c).ready);
    if (!readyList || readyList.length === 0) return;
    setIsSpeedRunOpen(true);
  };

  return (
    <main className="min-h-screen bg-[#101815] text-[#e6eee5]">
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
                setMobileTab("feed");
                showAddCasinosPage(false);
                setIsSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${mobileTab === "feed" && !isAddCasinosPage ? "border border-emerald-800/50 bg-emerald-900/40 text-emerald-300" : "text-gray-400 hover:bg-emerald-950/30 hover:text-white"}`}
            >
              <MessageSquare size={16} /> Community Feed
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileTab("rollcall");
                showAddCasinosPage(false);
                setIsSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${mobileTab === "rollcall" && !isAddCasinosPage ? "border border-emerald-800/50 bg-emerald-900/40 text-emerald-300" : "text-gray-400 hover:bg-emerald-950/30 hover:text-white"}`}
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
      <div className="w-full px-2.5 py-4 sm:px-8 sm:py-6">
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

        {/* Mobile Sticky Segmented Tab Control (< 768px) */}
        {!isAddCasinosPage && (
          <div className="sticky top-0 z-30 mb-4 bg-[#101815]/95 py-2 backdrop-blur md:hidden">
            <div className="flex rounded-xl bg-[#0f1913] p-1 border border-[#263e2f]">
              <button
                type="button"
                onClick={() => setMobileTab("feed")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                  mobileTab === "feed"
                    ? "bg-[#254231] text-white shadow-sm ring-1 ring-emerald-500/40"
                    : "text-[#85a08b] hover:text-white"
                }`}
              >
                <MessageSquare size={14} />
                Feed
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("rollcall")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                  mobileTab === "rollcall"
                    ? "bg-[#254231] text-white shadow-sm ring-1 ring-emerald-500/40"
                    : "text-[#85a08b] hover:text-white"
                }`}
              >
                <LayoutDashboard size={14} />
                Rollcall
                {readyCount > 0 && (
                  <span className="rounded-full bg-[#39ff6a] px-1.5 py-0.2 text-[10px] font-bold text-[#101815]">
                    {readyCount}
                  </span>
                )}
              </button>
            </div>
          </div>
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
                {visibleDirectory.map((casinoName) => (
                  <article
                    key={casinoName}
                    className="rounded-xl border border-[#293a30] bg-[#17211c] px-4 py-4 text-sm font-semibold text-[#d4e4d2] hover:border-[#4c6d50]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#294631] text-xs font-bold text-[#9bcf9c]">
                          <CasinoLogo
                            name={casinoName}
                            siteUrl={directoryUrls[casinoName] || undefined}
                          />
                        </div>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(`${casinoName} casino`)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            e.preventDefault();
                            openInExternalBrowser(`https://www.google.com/search?q=${encodeURIComponent(`${casinoName} casino`)}`);
                          }}
                          className="truncate hover:text-[#9bcf9c]"
                        >
                          {casinoName}
                        </a>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => openDirectoryEditor(casinoName)}
                            className="inline-flex h-8 items-center rounded-lg border border-[#4c6d50] px-3 text-xs font-semibold text-[#b7d5b5] transition hover:bg-[#2a4230]"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => signUpForCasino(casinoName)}
                          aria-label={`Sign up for ${casinoName}`}
                          className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg bg-[#79b77f] px-3 text-xs font-bold text-[#122519] shadow-[0_6px_16px_rgba(121,183,127,0.22)] transition hover:bg-[#91c991] hover:shadow-[0_8px_20px_rgba(145,201,145,0.32)]"
                        >
                          Sign up <ExternalLink size={12} strokeWidth={2.5} />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm(`Are you sure you want to remove ${casinoName} from the casino list?`)) return;
                              const updated = directory.filter(
                                (item) => item !== casinoName,
                              );
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
                    <p className="mt-2 text-xs font-normal text-[#718275]">
                      {casinos.some(
                        (casino) =>
                          casino.name.toLowerCase() ===
                          casinoName.toLowerCase(),
                      )
                        ? "Already on dashboard"
                        : "Add to dashboard"}
                    </p>
                    <a
                      href={`https://www.trustpilot.com/search?query=${encodeURIComponent(casinoName)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        e.preventDefault();
                        openInExternalBrowser(`https://www.trustpilot.com/search?query=${encodeURIComponent(casinoName)}`);
                      }}
                      className="mt-2 inline-flex text-xs font-normal text-[#91bf9b] hover:text-[#c2e4bd]"
                    >
                      {(() => {
                        const trackedCasino = casinos.find(
                          (casino) =>
                            casino.name.toLowerCase() === casinoName.toLowerCase(),
                        );
                        return (
                          <TrustpilotStars
                            rating={ratingForCasino(casinoName, trackedCasino?.trustpilotRating)}
                          />
                        );
                      })()}
                    </a>
                  </article>
                ))}
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
          <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Feed Column: Left on desktop, visible on mobile when mobileTab === 'feed' */}
            <div className={`space-y-4 md:col-span-5 lg:col-span-5 ${mobileTab !== "feed" ? "hidden md:block" : ""}`}>
              <div className="sticky top-4">
                <SocialFeed
                  compact={true}
                  currentUserEmail={signedInUser?.email}
                  currentUserName={signedInUser?.name}
                  currentUserAvatar={signedInUser?.avatarUrl || undefined}
                  isAdmin={isAdmin}
                  casinos={casinos}
                  onClaimCasino={handleClaimFromFeed}
                />
              </div>
            </div>

            {/* Rollcall Column: Right on desktop, visible on mobile when mobileTab === 'rollcall' */}
            <div className={`space-y-4 md:col-span-7 lg:col-span-7 ${mobileTab !== "rollcall" ? "hidden md:block" : ""}`}>
              {/* Tracker Counter Banner with Batch Claim */}
              <div className="sticky top-14 md:top-4 z-20 rounded-xl border border-[#2b4434] bg-[#13201a]/95 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="flex flex-wrap items-baseline gap-4 sm:gap-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-[#819487]">
                        Available
                      </span>
                      <span className="text-base sm:text-lg font-bold text-[#39ff6a]">
                        {dailyTotals.available.toFixed(2)} SC
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-[#819487]">
                        Claimed today
                      </span>
                      <span className="text-base sm:text-lg font-bold text-[#9bcf9c]">
                        {dailyTotals.claimedToday.toFixed(2)} SC
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: Batch Claim & Add Casinos */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    {/* + Add Casinos button (Secondary / Ghost style) */}
                    <button
                      type="button"
                      onClick={() => showAddCasinosPage(true)}
                      title="Add casinos to your rollcall"
                      className="flex items-center gap-1.5 rounded-lg border border-[#385640] bg-[#14231b]/90 px-3 py-1.5 text-xs font-semibold text-[#b7d5b5] transition hover:bg-[#1f3629] hover:border-[#5ca06c] hover:text-white cursor-pointer active:scale-95"
                    >
                      <Plus size={14} className="text-[#39ff6a]" />
                      <span>
                        + Add<span className="hidden sm:inline"> Casinos</span>
                      </span>
                    </button>

                    {/* Speed Run V2 Action Button */}
                    <button
                      type="button"
                      onClick={handleOpenSpeedRun}
                      disabled={readyCount === 0}
                      title={readyCount > 0 ? `Start Speed Run V2 session (${readyCount} ready)` : "No casinos currently ready to claim"}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition shadow-sm ${
                        readyCount > 0
                          ? "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-[#0d1712] shadow-[0_4px_14px_rgba(245,158,11,0.35)] hover:from-amber-400 hover:to-yellow-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ring-1 ring-yellow-400"
                          : "border border-[#263e2f] bg-[#14231b] text-[#5e7865] cursor-not-allowed opacity-60"
                      }`}
                    >
                      <Zap size={13} fill={readyCount > 0 ? "currentColor" : "none"} />
                      <span>⚡ Speed Run ({readyCount})</span>
                    </button>

                    {/* Launch All Staggered (Anti-popup loop) */}
                    {isStaggering ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1.5 rounded-lg bg-[#14231b] border border-amber-500/60 px-3 py-1.5 text-xs font-bold text-amber-300 animate-pulse">
                          <Loader2 size={13} className="animate-spin text-amber-400" />
                          <span>{staggerStatus || "Launching..."}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelStagger}
                          title="Cancel launching remaining casinos"
                          className="flex items-center gap-1 rounded-lg border border-red-800/60 bg-red-950/50 px-2 py-1.5 text-xs font-bold text-red-300 hover:bg-red-900/60 hover:text-white transition cursor-pointer"
                        >
                          <X size={13} />
                          <span>Cancel</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleLaunchAllStaggered}
                        disabled={readyCount === 0}
                        title={
                          readyCount > 0
                            ? `Launch all ${readyCount} ready casinos with 1.5s delay to prevent pop-up blocking`
                            : "No casinos currently ready to claim"
                        }
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                          readyCount > 0
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-[#0d1712] shadow-[0_4px_14px_rgba(16,185,129,0.35)] hover:from-emerald-400 hover:to-teal-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ring-1 ring-emerald-300"
                            : "border border-[#263e2f] bg-[#14231b] text-[#5e7865] cursor-not-allowed opacity-60"
                        }`}
                      >
                        <Zap size={13} fill={readyCount > 0 ? "currentColor" : "none"} />
                        <span>Launch All Staggered ({readyCount})</span>
                      </button>
                    )}

                    {/* Open All Ready (Primary Batch Claim Button) */}
                    {!isStaggering && (
                      <button
                        type="button"
                        onClick={handleOpenAllReady}
                        disabled={readyCount === 0}
                        title={readyCount > 0 ? `Open all ${readyCount} ready casinos` : "No casinos currently ready to claim"}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                          readyCount > 0
                            ? "bg-[#79b77f] text-[#122519] shadow-[0_4px_14px_rgba(121,183,127,0.3)] hover:bg-[#91c991] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ring-1 ring-[#39ff6a]"
                            : "border border-[#263e2f] bg-[#14231b] text-[#5e7865] cursor-not-allowed opacity-60"
                        }`}
                      >
                        <ExternalLink size={13} strokeWidth={2.5} />
                        <span>Open All Ready ({readyCount})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bankroll & Projected Yield Analytics Card (temporarily hidden) */}
              {/* <BankrollSummary casinos={casinos} claimedToday={dailyTotals.claimedToday} /> */}

              {/* Filter & Sort Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-[#a9bbaa]">
                  <span className="sr-only">Filter casinos</span>
                  <select
                    value={casinoFilter}
                    onChange={(event) => setCasinoFilter(event.target.value as typeof casinoFilter)}
                    aria-label="Filter casinos"
                    className="h-9 rounded-lg border border-[#344d3b] bg-[#111b16] px-2 text-xs text-[#d4e4d2] outline-none focus:border-[#78ae7e]"
                  >
                    <option value="all">All casinos</option>
                    <option value="ready">Ready to claim</option>
                    <option value="claimed">Claimed</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#a9bbaa]">
                  <span className="sr-only">Sort casinos</span>
                  <select
                    value={casinoSort}
                    onChange={(event) => setCasinoSort(event.target.value as typeof casinoSort)}
                    aria-label="Sort casinos"
                    className="h-9 rounded-lg border border-[#344d3b] bg-[#111b16] px-2 text-xs text-[#d4e4d2] outline-none focus:border-[#78ae7e]"
                  >
                    <option value="status">Sort by status</option>
                    <option value="f2p">Best F2P / Free to play</option>
                    <option value="trustpilot">Highest Trustpilot rating</option>
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#a9bbaa]">
                  <span className="sr-only">Show hidden casinos</span>
                  <input
                    type="checkbox"
                    checked={showHidden}
                    onChange={(event) => setShowHidden(event.target.checked)}
                    aria-label="Show hidden casinos"
                    className="h-4 w-4 accent-[#79b77f]"
                  />
                  Show hidden
                </label>
              </div>

              {/* Casinos List using RollcallCard */}
              <div className="space-y-2.5">
                {sortedCasinos.map((casino) => (
                  <RollcallCard
                    key={casino.id}
                    casino={casino}
                    status={statusFor(casino)}
                    siteUrl={siteUrlFor(casino)}
                    isActionMenuOpen={openActionMenu === casino.id}
                    onToggleActionMenu={() =>
                      setOpenActionMenu((open) => (open === casino.id ? null : casino.id))
                    }
                    onClaim={markClaimed}
                    onOpenCasino={openCasino}
                    onOpenBonus={casino.bonusUrl ? openBonus : undefined}
                    renderLogo={() => <CasinoLogo name={casino.name} siteUrl={siteUrlFor(casino)} />}
                    renderTrustpilot={() => (
                      <a
                        href={`https://www.trustpilot.com/search?query=${encodeURIComponent(casino.name)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          openInExternalBrowser(`https://www.trustpilot.com/search?query=${encodeURIComponent(casino.name)}`);
                        }}
                        className="text-xs text-[#91bf9b] hover:text-[#c2e4bd]"
                      >
                        <TrustpilotStars rating={ratingForCasino(casino.name, casino.trustpilotRating)} />
                      </a>
                    )}
                  />
                ))}
                {sortedCasinos.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[#293a30] p-8 text-center text-xs text-[#718275]">
                    No casinos found matching the current filter.
                  </div>
                )}
              </div>
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
                    if (!window.confirm(`Are you sure you want to delete ${actionCasino.name} from the dashboard?`)) return;
                    setOpenActionMenu(null);
                    unclaim(actionCasino);
                  }}
                  className="w-full rounded-xl border border-[#6b4d3d] px-4 py-3 text-left text-sm font-semibold text-[#e6b39a] hover:bg-[#3a2b26]"
                >
                  Unclaim bonus
                </button>
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
      {editingCasino && (
        <div
          className="fixed inset-0 z-20 grid place-items-center bg-black/65 p-5"
          role="presentation"
          onMouseDown={() => setEditingCasino(null)}
        >
          <form
            onSubmit={saveCasinoEdits}
            className="w-full max-w-lg rounded-2xl border border-[#38503d] bg-[#19251f] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-casino-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">
                  Casino editor
                </p>
                <h2
                  id="edit-casino-title"
                  className="mt-2 font-serif text-3xl font-semibold text-[#e5eee3]"
                >
                  Edit {editingCasino.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingCasino(null)}
                aria-label="Close edit casino prompt"
                className="text-[#91a595] hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-6 grid gap-3">
              <label className="text-xs font-semibold text-[#a9bbaa]">
                Casino URL
                <input
                  type="text"
                  required
                  inputMode="url"
                  value={editUrl}
                  onChange={(event) => setEditUrl(event.target.value)}
                  placeholder="https://casino.example"
                  className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                />
              </label>
              {isAdmin && (
                <label className="text-xs font-semibold text-[#a9bbaa]">
                  Trustpilot rating
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={editTrustpilotRating}
                    onChange={(event) => setEditTrustpilotRating(event.target.value)}
                    placeholder="0 to 5"
                    className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              {isAdmin && (
                <label className="text-xs font-semibold text-[#a9bbaa]">
                  Affiliate URL (Sign up link)
                  <input
                    type="text"
                    inputMode="url"
                    value={editAffiliateUrl}
                    onChange={(event) => setEditAffiliateUrl(event.target.value)}
                    placeholder="https://casino.example?ref=..."
                    className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              {isAdmin && (
                <label className="text-xs font-semibold text-[#a9bbaa]">
                  Claim URL (Claim Now link)
                  <input
                    type="text"
                    inputMode="url"
                    value={editClaimUrl}
                    onChange={(event) => setEditClaimUrl(event.target.value)}
                    placeholder="https://casino.example"
                    className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              {isAdmin && (
                <label className="text-xs font-semibold text-[#a9bbaa]">
                  Bonus URL (bonus details link)
                  <input
                    type="text"
                    inputMode="url"
                    value={editBonusUrl}
                    onChange={(event) => setEditBonusUrl(event.target.value)}
                    placeholder="https://casino.example/bonus"
                    className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              {isAdmin && (
                <label className="text-xs font-semibold text-[#a9bbaa]">
                  Bonus button title
                  <input
                    type="text"
                    value={editBonusTitle}
                    onChange={(event) => setEditBonusTitle(event.target.value)}
                    placeholder="e.g. Daily Bonus, 100% Match"
                    className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              <label className="text-xs font-semibold text-[#a9bbaa]">
                Bonus label
                <input
                  value={editBonus}
                  onChange={(event) => setEditBonus(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                />
              </label>
              <label className="text-xs font-semibold text-[#a9bbaa]">
                Details
                <textarea
                  value={editDetails}
                  onChange={(event) => setEditDetails(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 py-2 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                />
              </label>
              <fieldset className="mt-1 space-y-3">
                <legend className="text-xs font-semibold text-[#a9bbaa]">
                  Reset timer
                </legend>
                <p className="text-sm font-normal text-[#a9bbaa]">
                  Default: reset 24 hours after claiming.
                </p>
                <label className="flex items-center gap-3 text-sm font-normal text-[#a9bbaa]">
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
            <button
              type="submit"
              className="mt-5 h-11 w-full rounded-xl bg-[#79b77f] text-sm font-semibold text-[#122519] hover:bg-[#91c991]"
            >
              Save casino
            </button>
          </form>
        </div>
      )}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-20 grid place-items-center bg-black/65 p-5"
          role="presentation"
          onMouseDown={() => setIsAddOpen(false)}
        >
          <form
            onSubmit={addCasino}
            className="w-full max-w-lg rounded-2xl border border-[#38503d] bg-[#19251f] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-casino-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">
                  Rollcall
                </p>
                <h2
                  id="add-casino-title"
                  className="mt-2 font-serif text-3xl font-semibold text-[#e5eee3]"
                >
                  Add a casino
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                aria-label="Close add casino prompt"
                className="text-[#91a595] hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-6 grid gap-3">
              <input
                required
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Casino name"
                className="h-11 rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm outline-none placeholder:text-[#718275] focus:border-[#78ae7e]"
              />
              <input
                value={bonus}
                onChange={(event) => setBonus(event.target.value)}
                placeholder="Daily bonus"
                className="h-11 rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm outline-none placeholder:text-[#718275] focus:border-[#78ae7e]"
              />
              <input
                required
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="Website URL"
                className="h-11 rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm outline-none placeholder:text-[#718275] focus:border-[#78ae7e]"
              />
              <input
                value={newClaimUrl}
                onChange={(event) => setNewClaimUrl(event.target.value)}
                placeholder="Daily bonus link"
                className="h-11 rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm outline-none placeholder:text-[#718275] focus:border-[#78ae7e]"
              />
            </div>
            <fieldset className="mt-5 space-y-3">
              <legend className="mb-3 text-sm font-semibold text-[#d4e4d2]">
                Reset time
              </legend>
              <label className="flex items-center gap-3 text-sm text-[#a9bbaa]">
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
              <label className="flex items-center gap-3 text-sm text-[#a9bbaa]">
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
                  className="h-11 rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                />
              )}
            </fieldset>
            <button
              type="submit"
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#79b77f] text-sm font-semibold text-[#122519] hover:bg-[#91c991]"
            >
              <Plus size={16} /> Add to tracker
            </button>
          </form>
        </div>
      )}

      <SpeedRunErrorBoundary onClose={() => setIsSpeedRunOpen(false)}>
        <SpeedRunModal
          isOpen={isSpeedRunOpen}
          onClose={() => setIsSpeedRunOpen(false)}
          readyCasinos={casinos.filter((c) => !c.hidden && statusFor(c).ready)}
          allCasinos={casinos}
          onClaim={markClaimed}
          onUpdateCasino={handleUpdateCasino}
          onSnooze={handleSnoozeCasino}
          renderLogo={(casino) =>
            casino ? <CasinoLogo name={casino.name} siteUrl={siteUrlFor(casino)} /> : null
          }
        />
      </SpeedRunErrorBoundary>
    </main>
  );
}
