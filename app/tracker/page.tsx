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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SocialFeed } from "@/app/components/feed/SocialFeed";
import {
  apiGetCasinos,
  apiGetDirectory,
  apiGetUsers,
  apiSaveCasinos,
  apiSaveDirectory,
} from "@/lib/api-client";
import { migrateLegacyLocalStorage } from "@/lib/migrate-legacy";
import { casinoDirectory, casinoDirectoryUrls } from "@/lib/casino-directory";

type Casino = {
  id: string;
  name: string;
  dailyBonus: string;
  /** Canonical casino site URL — used for the logo/favicon fallback and the card click target. */
  siteUrl?: string;
  /** Affiliate / sign-up link used by the "Sign up" button on the add-casinos page. */
  affiliateUrl?: string;
  /** Link opened by "Claim Now" from rollcall after a bonus has been claimed. */
  claimUrl?: string;
  /** Optional bonus T&C / detail page. */
  bonusUrl?: string;
  /** Admin-set button label shown on the bonus-details button (falls back to "Bonus"). */
  bonusTitle?: string;
  lastClaimedAt: string | null;
  intervalHours: number;
  resetAtTime?: string | null;
  trustpilotRating?: number;
  logo?: string;
  details?: string;
  hidden?: boolean;
  /** Legacy single URL field kept only for backward compatibility with existing records.
   *  Precedence: siteUrl > url. UI paths read siteUrl (falling back to url) instead of url directly. */
  url?: string;
};

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

function CasinoLogo({ name, siteUrl }: { name: string; siteUrl?: string }) {
  const [hasError, setHasError] = useState(false);
  let logoUrl = casinoOfficialLogoUrls[name] || "";

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
    return <span>{name.slice(0, 2).toUpperCase()}</span>;
  }

  return (
    <img
      src={logoUrl}
      alt={`${name} logo`}
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
  const editScrollPosition = useRef<number | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  function showAddCasinosPage(show: boolean) {
    setIsAddCasinosPage(show);
    localStorage.setItem("dailyroll_tracker_view", show ? "add-casinos" : "dashboard");
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

      const loadedCasinos = saved ?? DEFAULT_CASINOS;
      const currentRatings = { ...sharedRatings };
      if (admin) {
        loadedCasinos.forEach((casino) => {
          if (
            typeof casino.trustpilotRating === "number" &&
            sharedRatingsByName[casino.name.toLowerCase()] === undefined
          ) {
            currentRatings[casino.name] = casino.trustpilotRating;
          }
        });
        await apiSaveDirectory({ ratings: currentRatings });
      }
      const defaultUrlByName = Object.fromEntries(
        DEFAULT_CASINOS.map((casino) => [casino.name.toLowerCase(), casino.url]),
      );
      const hydratedCasinos = loadedCasinos.map((casino) => {
        // Preserve each profile's own saved URLs unless the field is missing.
        // For the four built-in default casinos, when the user has never edited
        // their URL we pull the current master URL from the shared directory so
        // admin URL edits reach them; a user- or admin-written siteUrl always
        // wins. Legacy records that only have `url` keep using it as their site
        // URL until an admin or the user sets a dedicated siteUrl.
        const defaultUrl = defaultUrlByName[casino.name.toLowerCase()];
        const isDefaultCasinoWithUneditedUrl =
          defaultUrl !== undefined && casino.url === defaultUrl;
        const siteUrl = casino.siteUrl ??
          (casino.url && !isDefaultCasinoWithUneditedUrl
            ? casino.url
            : defaultUrl !== undefined
              ? sharedUrlsByName[casino.name.toLowerCase()]
              : undefined);
        return {
          ...casino,
          siteUrl,
          affiliateUrl: casino.affiliateUrl ?? sharedAffiliateUrlsByName[casino.name.toLowerCase()],
          claimUrl: casino.claimUrl ?? sharedClaimUrlsByName[casino.name.toLowerCase()],
          bonusUrl: casino.bonusUrl ?? sharedBonusUrlsByName[casino.name.toLowerCase()],
          bonusTitle: casino.bonusTitle ?? sharedBonusTitlesByName[casino.name.toLowerCase()],
          trustpilotRating:
            sharedRatingsByName[casino.name.toLowerCase()] ?? casino.trustpilotRating,
        };
      });
      if (cancelled) return;
      setCasinos(hydratedCasinos);
      if (user) {
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
  } {
    if (!casino.lastClaimedAt) return { ready: true, state: "ready", label: "Ready to claim", shortLabel: "now" };
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
    if (remaining <= 0) return { ready: true, state: "ready", label: "Ready to claim", shortLabel: "now" };
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return {
      ready: false,
      state: remaining <= 3600000 ? "pending" : "claimed",
      label: `${hours}h ${minutes}m ${seconds}s`,
      shortLabel: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`,
    };
  }

  function siteUrlFor(casino: Casino): string | undefined {
    return casino.siteUrl ?? casino.url;
  }

  function markClaimed(casino: Casino) {
    saveCasinos(
      casinos.map((item) =>
        item.id === casino.id
          ? { ...item, lastClaimedAt: new Date().toISOString() }
          : item,
      ),
    );
  }

  function openCasino(casino: Casino) {
    const target = siteUrlFor(casino);
    if (target) window.open(target, "_blank", "noopener,noreferrer");
  }

  function handleClaimFromFeed(casino: Casino) {
    const target = casino.claimUrl || siteUrlFor(casino) || "https://google.com";
    window.open(target, "_blank", "noopener,noreferrer");
    markClaimed(casino);
  }

    function openBonus(casino: Casino) {
    if (casino.bonusUrl) window.open(casino.bonusUrl, "_blank", "noopener,noreferrer");
  }

  function unclaim(casino: Casino) {
    saveCasinos(
      casinos.map((item) =>
        item.id === casino.id ? { ...item, lastClaimedAt: null } : item,
      ),
    );
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
      const updatedDirectory = [...directory, name.trim()];
      setDirectory(updatedDirectory);
      apiSaveDirectory({ list: updatedDirectory });
      setName("");
      setUrl("");
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
    window.open(casinoUrl, "_blank", "noopener,noreferrer");
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
    const updatedDirectoryUrls = isAdmin
      ? { ...directoryUrls, [editingCasino.name]: normalizedSiteUrl }
      : directoryUrls;
    const updatedDirectoryAffiliateUrls = isAdmin
      ? { ...directoryAffiliateUrls, [editingCasino.name]: affiliateUrl }
      : directoryAffiliateUrls;
    const updatedDirectoryClaimUrls = isAdmin
      ? { ...directoryClaimUrls, [editingCasino.name]: claimUrl }
      : directoryClaimUrls;
    const updatedDirectoryBonusUrls = isAdmin
      ? { ...directoryBonusUrls, [editingCasino.name]: bonusUrl }
      : directoryBonusUrls;
    const updatedDirectoryRatings = isAdmin && typeof rating === "number"
      ? { ...directoryRatings, [editingCasino.name]: rating }
      : directoryRatings;
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
                resetAtTime: editUseSpecificReset ? editResetTime : null,
                trustpilotRating: isAdmin ? rating : casino.trustpilotRating,
                details: editDetails.trim(),
                dailyBonus: editBonus.trim() || casino.dailyBonus,
              }
            : casino,
        ),
      );
    } else if (isAdmin) {
      const updatedAdminCasinos = casinos.map((casino) =>
        casino.name.toLowerCase() === editingCasino.name.toLowerCase()
          ? {
              ...casino,
              siteUrl: normalizedSiteUrl,
              affiliateUrl,
              claimUrl,
              bonusUrl,
              bonusTitle,
              ...(typeof rating === "number" ? { trustpilotRating: rating } : {}),
            }
          : casino,
      );
      if (updatedAdminCasinos.some((casino, index) => casino !== casinos[index])) {
        saveCasinos(updatedAdminCasinos);
      }
    }
    if (isAdmin) {
      setDirectoryUrls(updatedDirectoryUrls);
      setDirectoryAffiliateUrls(updatedDirectoryAffiliateUrls);
      setDirectoryClaimUrls(updatedDirectoryClaimUrls);
      setDirectoryBonusUrls(updatedDirectoryBonusUrls);
      setDirectoryRatings(updatedDirectoryRatings);
      await apiSaveDirectory({
        urls: Object.fromEntries(
          Object.entries(updatedDirectoryUrls).filter(([, v]) => v !== undefined),
        ) as Record<string, string>,
        affiliateUrls: Object.fromEntries(
          Object.entries(updatedDirectoryAffiliateUrls).filter(([, v]) => v !== undefined),
        ) as Record<string, string>,
        claimUrls: Object.fromEntries(
          Object.entries(updatedDirectoryClaimUrls).filter(([, v]) => v !== undefined),
        ) as Record<string, string>,
        bonusUrls: Object.fromEntries(
          Object.entries(updatedDirectoryBonusUrls).filter(([, v]) => v !== undefined),
        ) as Record<string, string>,
        bonusTitles: isAdmin ? { ...directoryBonusTitles, [editingCasino.name]: bonusTitle } : directoryBonusTitles,
        ratings: updatedDirectoryRatings,
      });
    }
    if (isAdmin) {
      const users = await apiGetUsers();
      await Promise.all(
        users.map(async (user) => {
          const userCasinos = await apiGetCasinos(user.email);
          if (!userCasinos) return;
          const updatedUserCasinos = userCasinos.map((casino) =>
            casino.name.toLowerCase() === editingCasino.name.toLowerCase()
              ? {
                  ...casino,
                  siteUrl: normalizedSiteUrl,
                  affiliateUrl,
                  claimUrl,
                  bonusUrl,
                  bonusTitle,
                  trustpilotRating: rating,
                }
              : casino,
          );
          await apiSaveCasinos(user.email, updatedUserCasinos);
        }),
      );
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

  return (
    <main className="min-h-screen bg-[#101815] text-[#e6eee5]">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-screen w-64 flex-col justify-between border-l border-emerald-900/30 bg-[#0a1410] px-5 py-5 transition-transform duration-200 lg:px-6 lg:py-8 ${
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
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#385e40] bg-[#1b3625] p-1 transition hover:border-[#79b77f]"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#79b77f] text-sm font-bold text-[#122519]">
                    {profileInitial}
                  </span>
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
                setViewMode("social");
                showAddCasinosPage(false);
                setIsSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${viewMode === "social" && !isAddCasinosPage ? "border border-emerald-800/50 bg-emerald-900/40 text-emerald-300" : "text-gray-400 hover:bg-emerald-950/30 hover:text-white"}`}
            >
              <MessageSquare size={16} /> Community Feed
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("rollcall");
                showAddCasinosPage(false);
                setIsSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${viewMode === "rollcall" && !isAddCasinosPage ? "border border-emerald-800/50 bg-emerald-900/40 text-emerald-300" : "text-gray-400 hover:bg-emerald-950/30 hover:text-white"}`}
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
              <Plus size={16} /> Add Casinos to Roll
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
        type="button"
        onClick={() => setIsSidebarOpen((open) => !open)}
        aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
        aria-expanded={isSidebarOpen}
        className="fixed right-5 top-5 z-40 grid h-9 w-9 place-items-center rounded-lg border border-[#344d3b] bg-[#101815]/90 text-[#b7d5b5] shadow-lg backdrop-blur transition hover:border-[#6b916f] hover:bg-[#1b2a20] sm:right-8"
      >
        {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      <div className="w-full px-4 py-6 sm:px-8">
        <header className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4 border-b border-[#263a2c] pb-3 mb-6">
          <div className="flex items-center gap-3">
            {isAddCasinosPage ? (
              <h1
                className="text-xl font-normal uppercase tracking-[0.08em] text-[#f3f8f0] sm:text-2xl"
                style={{ fontFamily: "Rhinos, Impact, sans-serif" }}
              >
                ADD CASINOS TO ROLL
              </h1>
            ) : (
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#edf4ea]">
                  {viewMode === "social" ? "Social Casino Feed" : "Daily Casino Rollcall"}
                </h2>
              </div>
            )}
          </div>

          {!isAddCasinosPage && (
            <div className="flex items-center gap-1 rounded-xl bg-[#0f1913] p-1 border border-[#263e2f]">
              <button
                type="button"
                onClick={() => setViewMode("social")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "social"
                    ? "bg-[#254231] text-white shadow-sm"
                    : "text-[#85a08b] hover:text-white"
                }`}
              >
                <MessageSquare size={13} />
                Community Feed
              </button>

              <button
                type="button"
                onClick={() => setViewMode("rollcall")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "rollcall"
                    ? "bg-[#254231] text-white shadow-sm"
                    : "text-[#85a08b] hover:text-white"
                }`}
              >
                <LayoutDashboard size={13} />
                Detailed Rollcall
              </button>
            </div>
          )}
        </header>

        {viewMode === "social" && !isAddCasinosPage ? (
          <SocialFeed
            currentUserEmail={signedInUser?.email}
            currentUserName={signedInUser?.name}
            currentUserAvatar={signedInUser?.avatarUrl || undefined}
            isAdmin={isAdmin}
            casinos={casinos}
            onClaimCasino={handleClaimFromFeed}
          />
        ) : (
          <div className="mx-auto max-w-4xl">

          {!isAddCasinosPage && (
            <div className="sticky top-20 z-20 mt-4 rounded-xl border border-[#2b4434] bg-[#13201a]/95 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs uppercase tracking-[0.14em] text-[#819487]">
                    Available to claim
                  </span>
                  <span className="text-lg font-bold text-[#39ff6a]">
                    {dailyTotals.available.toFixed(2)} SC
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs uppercase tracking-[0.14em] text-[#819487]">
                    Claimed today
                  </span>
                  <span className="text-lg font-bold text-[#9bcf9c]">
                    {dailyTotals.claimedToday.toFixed(2)} SC
                  </span>
                </div>
              </div>
            </div>
          )}

          <section className="mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {!isAddCasinosPage && (
                  <>
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
                  </>
                )}
              </div>
            </div>
            {isAddCasinosPage ? (
              <>
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
              </>
            ) : (
              <div className="mt-3 space-y-2">
                {sortedCasinos.map((casino) => {
                  const status = statusFor(casino);
                  const styles = STATUS_STYLES[status.state];
                  return (
                    <article
                      key={casino.id}
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest("button, a")) return;
                        openCasino(casino);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openCasino(casino);
                        }
                      }}
                      role="link"
                      tabIndex={0}
                      className={`group flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[#79b77f]/60 ${styles.card} ${casino.hidden ? "border-dashed opacity-60 grayscale hover:opacity-90" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#294631] text-sm font-bold text-[#9bcf9c]">
                          <CasinoLogo name={casino.name} siteUrl={siteUrlFor(casino)} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="font-semibold text-[#e5eee3]">
                              {casino.name}
                            </h2>
                            {casino.hidden && (
                              <span className="rounded-full border border-[#4a5d51] bg-[#1f2218] px-2 py-1 text-xs text-[#a3b1a5]">
                                Hidden
                              </span>
                            )}
                            <a
                              href={`https://www.trustpilot.com/search?query=${encodeURIComponent(casino.name)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#91bf9b] hover:text-[#c2e4bd]"
                            >
                              <TrustpilotStars rating={ratingForCasino(casino.name, casino.trustpilotRating)} />
                            </a>
                          </div>
                          <p className="mt-1 flex items-center gap-2 text-xs">
                            <span
                              aria-hidden="true"
                              className={`h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`}
                            />
                            <span className={`font-semibold ${styles.label}`}>
                              {status.ready ? "Ready to claim" : `Available in ${status.shortLabel}`}
                            </span>
                          </p>
                        </div>
                      </div>
                      <a
                        href={casino.claimUrl ?? siteUrlFor(casino)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (status.ready) markClaimed(casino);
                        }}
                        aria-label={
                          status.ready
                            ? `Claim ${casino.dailyBonus} for ${casino.name}`
                            : `Next claim for ${casino.name} in ${status.label}`
                        }
                        className={`ml-auto flex min-w-28 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-bold transition ${
                          status.ready
                            ? "bg-[#79b77f] text-[#122519] shadow-[0_6px_16px_rgba(121,183,127,0.2)] hover:-translate-y-0.5 hover:bg-[#91c991] hover:shadow-[0_10px_22px_rgba(145,201,145,0.32)] ring-2 ring-[#39ff6a] ring-offset-2 ring-offset-[#0f1a14]"
                            : "border border-[#3a4c40] bg-transparent text-[#f0a03c] hover:-translate-y-0.5 hover:border-[#556b5a] hover:bg-[#1d2a22]"
                        }`}
                      >
                        {status.ready ? (
                          <>
                            <CheckCircle2 size={16} strokeWidth={2.5} />
                            Claim {casino.dailyBonus}!
                          </>
                        ) : (
                          <>
                            <Clock size={16} strokeWidth={2.5} />
                            {status.label}
                          </>
                        )}
                      </a>
                      <div className="relative flex w-full items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenActionMenu((open) => open === casino.id ? null : casino.id)}
                          aria-label={`More actions for ${casino.name}`}
                          aria-expanded={openActionMenu === casino.id}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#4c6d50] text-[#b7d5b5] hover:bg-[#2a4230]"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {casino.bonusUrl && (
                          <button
                            type="button"
                            onClick={() => openBonus(casino)}
                            aria-label={`Open ${casino.bonusTitle || "Bonus"} for ${casino.name}`}
                            className="flex min-w-28 items-center justify-center gap-2 rounded-lg border border-[#4c6d50] bg-transparent px-3.5 py-2 text-sm font-bold text-[#b7d5b5] transition hover:-translate-y-0.5 hover:border-[#6f9d73] hover:bg-[#2a4230]"
                          >
                            <ExternalLink size={16} strokeWidth={2.5} />
                            {casino.bonusTitle || "Bonus"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
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
    </main>
  );
}
