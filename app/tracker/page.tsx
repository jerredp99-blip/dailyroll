"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  apiGetCasinos,
  apiGetDirectory,
  apiGetUsers,
  apiSaveCasinos,
  apiSaveDirectory,
} from "@/lib/api-client";
import { migrateLegacyLocalStorage } from "@/lib/migrate-legacy";

type Casino = {
  id: string;
  name: string;
  dailyBonus: string;
  url: string;
  lastClaimedAt: string | null;
  intervalHours: number;
  resetAtTime?: string | null;
  trustpilotRating?: number;
  logo?: string;
  details?: string;
};

type SignedInUser = {
  name: string;
  email: string;
};

const casinoDirectoryUrls: Record<string, string> = {
  Coinsback: "https://coinsback.com",
  "High 5 Casino": "https://high5casino.com",
  ReBet: "https://rebet.com",
  "Lucky Bunny": "https://luckybunnycasino.com",
  Pulszbingo: "https://pulszbingo.com",
  "1UP": "https://1upcasino.com",
  Lucklake: "https://lucklake.com",
  Punt: "https://punt.com",
  Chanced: "https://chanced.com",
  SidePot: "https://sidepot.com",
  MyPrize: "https://myprize.us",
  Lonestar: "https://lonestarcasino.com",
  RealPrize: "https://realprize.com",
  KingPrize: "https://kingprize.com",
  "Sheesh Casino": "https://sheesh.com",
  Pulsz: "https://pulsz.com",
  Sportzino: "https://sportzino.com",
  Modo: "https://modo.us",
  PlayFame: "https://playfame.com",
  YayCasino: "https://yaycasino.com",
  McLuck: "https://mcluck.com",
  "Hello Millions": "https://hellomillions.com",
  Megabonanza: "https://megabonanza.com",
  Jackpota: "https://jackpota.com",
  Superboo: "https://superboo.com",
  Ace: "https://ace.bet",
  Spree: "https://spree.com",
  "The Win Zone": "https://thewinzone.com",
  "Dogg House": "https://dogghouse.com",
  "Lucky Bits Vegas": "https://luckybitsvegas.com",
  "Oder Casino": "https://odercasino.com",
  "WOW Vegas": "https://wowvegas.com",
  Fliff: "https://fliff.com",
  "Coin Wizard": "https://coinwizard.com",
  "Golden Hearts Games": "https://goldenheartsgames.com",
  "Rolling Riches": "https://rollingriches.com",
  "Casino.click": "https://casino.click",
  "American Luck": "https://americanluck.com",
  "Luck Party": "https://luckparty.com",
  NewLuck: "https://newluck.com",
  "Shuffle.us": "https://shuffle.us",
  "Fortune Purple": "https://fortunepurple.com",
  "Fortune Wins": "https://fortunewins.com",
  AceBet: "https://acebet.com",
  Stake: "https://stake.us",
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

function CasinoLogo({ name, url }: { name: string; url: string }) {
  const [hasError, setHasError] = useState(false);
  let logoUrl = casinoOfficialLogoUrls[name] || "";

  if (!logoUrl) {
    try {
      logoUrl = `${new URL(url).origin}/favicon.ico`;
    } catch {
      logoUrl = "";
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

function TrustpilotStars({ rating }: { rating?: number }) {
  if (typeof rating !== "number") {
    return <span className="text-[#718275]">☆☆☆☆☆</span>;
  }

  return (
    <span aria-label={`${rating.toFixed(1)} out of 5 stars`} className="tracking-[0.08em]">
      {Array.from({ length: 5 }, (_, index) => {
        const fillPercent = Math.max(0, Math.min(1, rating - index)) * 100;
        return (
          <span
            key={index}
            aria-hidden="true"
            className="inline-block bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(90deg, #e5b85d ${fillPercent}%, #536359 ${fillPercent}%)`,
            }}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}

const casinoDirectory = [
  "Coinsback",
  "High 5 Casino",
  "ReBet",
  "Lucky Bunny",
  "Pulszbingo",
  "1UP",
  "Lucklake",
  "Punt",
  "Chanced",
  "SidePot",
  "MyPrize",
  "Lonestar",
  "RealPrize",
  "KingPrize",
  "Sheesh Casino",
  "Pulsz",
  "Sportzino",
  "Modo",
  "PlayFame",
  "YayCasino",
  "McLuck",
  "Hello Millions",
  "Megabonanza",
  "Jackpota",
  "Superboo",
  "Ace",
  "Spree",
  "The Win Zone",
  "Dogg House",
  "Lucky Bits Vegas",
  "Oder Casino",
  "WOW Vegas",
  "Fliff",
  "Coin Wizard",
  "Golden Hearts Games",
  "Rolling Riches",
  "Casino.click",
  "American Luck",
  "Luck Party",
  "NewLuck",
  "Shuffle.us",
  "Fortune Purple",
  "Fortune Wins",
  "AceBet",
  "Stake",
];

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

export default function TrackerPage() {
  const router = useRouter();
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [signedInUser, setSignedInUser] = useState<SignedInUser | null>(null);
  const [now, setNow] = useState(Date.now);
  const [name, setName] = useState("");
  const [bonus, setBonus] = useState("");
  const [url, setUrl] = useState("");
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
  const [directoryUrls, setDirectoryUrls] = useState<Record<string, string>>(
    casinoDirectoryUrls,
  );
  const [directoryRatings, setDirectoryRatings] = useState<Record<string, number>>({});
  const [editingCasino, setEditingCasino] = useState<Casino | null>(null);
  const [editUrl, setEditUrl] = useState("");
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
  const editScrollPosition = useRef<number | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  function showAddCasinosPage(show: boolean) {
    setIsAddCasinosPage(show);
    localStorage.setItem("dailyroll_tracker_view", show ? "add-casinos" : "dashboard");
  }

  function signOut() {
    localStorage.removeItem("dailyroll_user");
    localStorage.removeItem("dailyroll_admin");
    setSignedInUser(null);
    setIsAdmin(false);
    setIsProfileMenuOpen(false);
    router.replace("/#signin");
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
    const savedUser = localStorage.getItem("dailyroll_user");
    const savedAdmin = localStorage.getItem("dailyroll_admin");
    const user = savedUser ? (JSON.parse(savedUser) as SignedInUser) : null;
    const admin = Boolean(savedAdmin);

    let cancelled = false;
    (async () => {
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
      const hydratedCasinos = loadedCasinos.map((casino) => ({
        ...casino,
        url: sharedUrlsByName[casino.name.toLowerCase()] ?? casino.url,
        trustpilotRating:
          sharedRatingsByName[casino.name.toLowerCase()] ?? casino.trustpilotRating,
      }));
      if (cancelled) return;
      setCasinos(hydratedCasinos);
      if (user && saved) {
        await apiSaveCasinos(user.email, hydratedCasinos);
      }
      if (user) setSignedInUser(user);
      setIsAdmin(admin);
      setIsAddCasinosPage(localStorage.getItem("dailyroll_tracker_view") === "add-casinos");
      if (directoryData.list) setDirectory(directoryData.list);
      setDirectoryUrls({
        ...casinoDirectoryUrls,
        ...sharedUrls,
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

  function statusFor(casino: Casino) {
    if (!casino.lastClaimedAt) return { ready: true, label: "Ready to claim" };
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
    if (remaining <= 0) return { ready: true, label: "Ready to claim" };
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return { ready: false, label: `${hours}h ${minutes}m ${seconds}s` };
  }

  function claim(casino: Casino) {
    saveCasinos(
      casinos.map((item) =>
        item.id === casino.id
          ? { ...item, lastClaimedAt: new Date().toISOString() }
          : item,
      ),
    );
    window.open(casino.url, "_blank", "noopener,noreferrer");
  }

  function openCasino(casino: Casino) {
    window.open(casino.url, "_blank", "noopener,noreferrer");
  }

  function unclaim(casino: Casino) {
    saveCasinos(
      casinos.map((item) =>
        item.id === casino.id ? { ...item, lastClaimedAt: null } : item,
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
      url: url.startsWith("http") ? url : `https://${url}`,
      lastClaimedAt: null,
      intervalHours: 24,
      resetAtTime: useSpecificReset ? resetTime : null,
    };
    saveCasinos([...casinos, entry]);
    setName("");
    setBonus("");
    setUrl("");
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
    const entry: Casino = {
      id: Date.now().toString(),
      name: casinoName,
      dailyBonus: "Free daily",
      url:
        directoryUrls[casinoName] ||
        `https://www.google.com/search?q=${encodeURIComponent(`${casinoName} casino`)}`,
      lastClaimedAt: null,
      intervalHours: 24,
      trustpilotRating: directoryRatings[casinoName],
    };
    saveCasinos([...casinos, entry]);
    if (!stayOnList) showAddCasinosPage(false);
  }

  function signUpForCasino(casinoName: string) {
    const casinoUrl =
      directoryUrls[casinoName] ||
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
    setEditUrl(casino.url);
    setEditDetails(casino.details || "Daily bonus available");
    setEditBonus(casino.dailyBonus);
    setEditTrustpilotRating(casino.trustpilotRating?.toString() || "");
    setEditUseSpecificReset(Boolean(casino.resetAtTime));
    setEditResetTime(casino.resetAtTime || "00:00");
  }

  function openDirectoryEditor(casinoName: string) {
    openCasinoEditor({
      id: `directory:${casinoName}`,
      name: casinoName,
      dailyBonus: "Free daily",
      url: directoryUrls[casinoName] || "",
      lastClaimedAt: null,
      intervalHours: 24,
      trustpilotRating: directoryRatings[casinoName],
    });
  }

  async function saveCasinoEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCasino) return;
    const normalizedUrl = isAdmin && editUrl.trim()
      ? editUrl.trim().startsWith("http")
        ? editUrl.trim()
        : `https://${editUrl.trim()}`
      : editingCasino.url;
    const updatedDirectoryUrls = isAdmin
      ? { ...directoryUrls, [editingCasino.name]: normalizedUrl }
      : directoryUrls;
    const rating = isAdmin && editTrustpilotRating.trim()
      ? Number(editTrustpilotRating)
      : editingCasino.trustpilotRating;
    const updatedDirectoryRatings = isAdmin && typeof rating === "number"
      ? { ...directoryRatings, [editingCasino.name]: rating }
      : directoryRatings;
    if (!editingCasino.id.startsWith("directory:")) {
      saveCasinos(
        casinos.map((casino) =>
          casino.id === editingCasino.id
            ? {
                ...casino,
                url: normalizedUrl,
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
              url: normalizedUrl,
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
      setDirectoryRatings(updatedDirectoryRatings);
      await apiSaveDirectory({ urls: updatedDirectoryUrls, ratings: updatedDirectoryRatings });
    }
    if (isAdmin) {
      const users = await apiGetUsers();
      await Promise.all(
        users.map(async (user) => {
          const userCasinos = await apiGetCasinos(user.email);
          if (!userCasinos) return;
          const updatedUserCasinos = userCasinos.map((casino) =>
            casino.name.toLowerCase() === editingCasino.name.toLowerCase()
              ? { ...casino, url: normalizedUrl, trustpilotRating: rating }
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
    if (typeof recordRating === "number") return recordRating;
    const matchingName = Object.keys(directoryRatings).find(
      (name) => name.toLowerCase() === casinoName.toLowerCase(),
    );
    return matchingName ? directoryRatings[matchingName] : undefined;
  };

  const sortedCasinos = casinos
    .filter((casino) => {
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
        (casino) => casino.name.toLowerCase() === casinoName.toLowerCase(),
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
          isSidebarOpen ? "translate-x-0" : "translate-x-[calc(100%-4rem)]"
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
                showAddCasinosPage(false);
                setIsSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${!isAddCasinosPage ? "border border-emerald-800/50 bg-emerald-900/40 text-emerald-300" : "text-gray-400 hover:bg-emerald-950/30 hover:text-white"}`}
            >
              <LayoutDashboard size={16} /> Rollcall
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
      <div className="w-full px-5 py-8 sm:px-10 lg:pr-72">
        <div className="mx-auto max-w-4xl">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#263a2c] pb-3">
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
                    Daily Casino Rollcall
                  </h2>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen((open) => !open)}
              aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
              aria-expanded={isSidebarOpen}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#344d3b] text-[#b7d5b5] transition hover:border-[#6b916f] hover:bg-[#1b2a20]"
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </header>

          <section className="mt-4">
            <div className="flex items-end justify-end gap-4">
              <div className="flex flex-wrap items-center justify-end gap-3">
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
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setIsAddOpen(true)}
                  className="flex items-center gap-1 text-sm font-semibold text-[#9bcf9c] hover:text-[#c2e4bd]"
                >
                  <Plus size={15} /> Custom casino
                </button>
                {!isAddCasinosPage && (
                  <button
                    type="button"
                    onClick={() => showAddCasinosPage(true)}
                    className="flex items-center gap-1 text-sm font-semibold text-[#9bcf9c] hover:text-[#c2e4bd]"
                  >
                    <Plus size={15} /> Add Casinos to Roll
                  </button>
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
                            url={directoryUrls[casinoName] || ""}
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
                      className={`group flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-[#6f9d73] hover:shadow-[0_10px_24px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[#79b77f]/60 ${status.ready ? "border-[#385e40] bg-[#192a20] hover:bg-[#203524]" : "border-[#293a30] bg-[#17211c] opacity-80 hover:bg-[#1d2a22]"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#294631] text-sm font-bold text-[#9bcf9c]">
                          <CasinoLogo name={casino.name} url={casino.url} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="font-semibold text-[#e5eee3]">
                              {casino.name}
                            </h2>
                            <span className="rounded-full border border-[#355b3d] bg-[#1b3625] px-2 py-1 text-xs text-[#9bcf9c]">
                              {casino.dailyBonus}
                            </span>
                            <a
                              href={`https://www.trustpilot.com/search?query=${encodeURIComponent(casino.name)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#91bf9b] hover:text-[#c2e4bd]"
                            >
                              <TrustpilotStars rating={ratingForCasino(casino.name, casino.trustpilotRating)} />
                            </a>
                          </div>
                          <p className="mt-1 flex items-center gap-2 text-xs text-[#a0b2a3]">
                            <Clock
                              size={14}
                              className={
                                status.ready
                                  ? "text-[#9bcf9c]"
                                  : "text-[#819487]"
                              }
                            />
                            {casino.details || status.label}
                          </p>
                        </div>
                      </div>
                      <div className="relative flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => claim(casino)}
                          className={`flex min-w-28 items-center justify-center gap-2 rounded-lg bg-[#79b77f] px-3.5 py-2 text-sm font-bold text-[#122519] shadow-[0_6px_16px_rgba(121,183,127,0.2)] transition hover:-translate-y-0.5 hover:bg-[#91c991] hover:shadow-[0_10px_22px_rgba(145,201,145,0.32)] ${
                            status.ready ? "ring-2 ring-[#39ff6a] ring-offset-2 ring-offset-[#0f1a14]" : ""
                          }`}
                        >
                          {status.ready ? (
                            <CheckCircle2 size={16} strokeWidth={2.5} />
                          ) : (
                            <ExternalLink size={16} strokeWidth={2.5} />
                          )}
                          {status.ready ? "Claim!" : "Open link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenActionMenu((open) => open === casino.id ? null : casino.id)}
                          aria-label={`More actions for ${casino.name}`}
                          aria-expanded={openActionMenu === casino.id}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-[#4c6d50] text-[#b7d5b5] hover:bg-[#2a4230]"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
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
                {isAdmin && (
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
                )}
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
              {isAdmin && (
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
              )}
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
