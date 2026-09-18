"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, Pencil, Plus, ShieldAlert, Sparkles, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  apiApproveCasino,
  apiGetCasinos,
  apiGetDirectory,
  apiGetUsers,
  apiSaveCasinos,
  apiSaveDirectory,
  apiUpdateAdminCasino,
} from "@/lib/api-client";
import { casinoDirectory, casinoDirectoryUrls } from "@/lib/casino-directory";
import { ALL_PENDING_CASINOS, PENDING_CASINOS_BATCH, type PendingCasinoData } from "@/lib/pendingCasinos";
import { PACIFIC_TIME_OPTIONS } from "@/lib/timerUtils";
import { ExpandableSearch } from "@/app/components/ExpandableSearch";

import type { Casino } from "@/types/casino";

type User = { id: string; name: string; email: string };
type CasinoRecord = { user: User; casinos: Casino[] };

function Stars({ rating }: { rating?: number | null }) {
  const numericRating = Number(rating);
  const value = Number.isFinite(numericRating) ? Math.max(0, Math.min(5, numericRating)) : 0;
  return (
    <span aria-label={`${value.toFixed(1)} out of 5 stars`} className="tracking-[0.08em] text-[#e5b85d]">
      {Array.from({ length: 5 }, (_, index) => {
        const fillPercent = Math.max(0, Math.min(1, value - index)) * 100;
        return <span key={index} style={fillPercent > 0 && fillPercent < 100 ? { color: "transparent", backgroundImage: "linear-gradient(90deg, #e5b85d 50%, #536359 50%)", WebkitBackgroundClip: "text" } : { color: fillPercent === 100 ? "#e5b85d" : "#536359" }}>{fillPercent === 0 ? "☆" : "★"}</span>;
      })}
    </span>
  );
}

export default function AdminCasinosPage() {
  const router = useRouter();
  const [records, setRecords] = useState<CasinoRecord[]>([]);
  const [editing, setEditing] = useState<{ user: User; casino: Casino } | null>(null);
  const [provider, setProvider] = useState("");
  const [url, setUrl] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [claimUrl, setClaimUrl] = useState("");
  const [bonusUrl, setBonusUrl] = useState("");
  const [claimTip, setClaimTip] = useState("");
  const [bonus, setBonus] = useState("");
  const [details, setDetails] = useState("");
  const [rating, setRating] = useState("");
  const [resetTime, setResetTime] = useState("");
  const [error, setError] = useState("");

  const [directoryList, setDirectoryList] = useState<string[]>(casinoDirectory);
  const [directoryUrls, setDirectoryUrls] = useState<Record<string, string | undefined>>(casinoDirectoryUrls);
  const [directoryProviders, setDirectoryProviders] = useState<Record<string, string | undefined>>({});
  const [directoryAffiliateUrls, setDirectoryAffiliateUrls] = useState<Record<string, string | undefined>>({});
  const [directoryClaimUrls, setDirectoryClaimUrls] = useState<Record<string, string | undefined>>({});
  const [directoryBonusUrls, setDirectoryBonusUrls] = useState<Record<string, string | undefined>>({});
  const [directoryClaimTips, setDirectoryClaimTips] = useState<Record<string, string | undefined>>({});
  const [directoryRatings, setDirectoryRatings] = useState<Record<string, number>>({});
  const [directoryPendingReview, setDirectoryPendingReview] = useState<Record<string, boolean>>({});
  const [directoryPublished, setDirectoryPublished] = useState<Record<string, boolean>>({});

  const [directoryEditing, setDirectoryEditing] = useState<{ name: string; isNew: boolean } | null>(null);
  const [directoryName, setDirectoryName] = useState("");
  const [directoryProvider, setDirectoryProvider] = useState("");
  const [directoryUrl, setDirectoryUrl] = useState("");
  const [directoryAffiliateUrl, setDirectoryAffiliateUrl] = useState("");
  const [directoryClaimUrl, setDirectoryClaimUrl] = useState("");
  const [directoryBonusUrl, setDirectoryBonusUrl] = useState("");
  const [directoryClaimTip, setDirectoryClaimTip] = useState("");
  const [directoryRating, setDirectoryRating] = useState("");
  const [directoryError, setDirectoryError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Tab State: "master" | "pending"
  const [activeTab, setActiveTab] = useState<"master" | "pending">("master");

  // Inline edit state for pending review casinos
  const [pendingFormState, setPendingFormState] = useState<
    Record<
      string,
      {
        name?: string;
        provider?: string;
        url?: string;
        siteUrl?: string;
        claimUrl?: string;
        dailyBonus?: string;
        dailyBonusLabel?: string;
        dailyScAmount?: number;
        dailyBonusSc?: string;
        dailyGcAmount?: string;
        resetHours?: number;
        intervalHours?: number;
        resetAtTime?: string;
        claimTip?: string;
        minRedemptionText?: string;
        minRedemption?: string;
        affiliateUrl?: string;
      }
    >
  >({});
  const [approvingName, setApprovingName] = useState<string | null>(null);
  const [approvedSuccessMessage, setApprovedSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const authResponse = await fetch("/api/auth/me", { cache: "no-store" });
        const auth = (await authResponse.json()) as { user: User | null; isAdmin: boolean };
        if (!auth.isAdmin || !auth.user) {
          router.replace("/sign-in");
          return;
        }
        const [users, directory] = await Promise.all([apiGetUsers(), apiGetDirectory()]);
        const loaded = await Promise.all(users.map(async (user) => ({ user, casinos: (await apiGetCasinos(user.email)) ?? [] })));
        if (cancelled) return;
        setRecords(loaded);
        setDirectoryList(directory.list ?? casinoDirectory);
        setDirectoryUrls({ ...casinoDirectoryUrls, ...directory.urls });
        setDirectoryProviders(directory.providers ?? {});
        setDirectoryAffiliateUrls(directory.affiliateUrls ?? {});
        setDirectoryClaimUrls(directory.claimUrls ?? {});
        setDirectoryBonusUrls(directory.bonusUrls ?? {});
        setDirectoryClaimTips(directory.claimTips ?? {});
        setDirectoryRatings(directory.ratings);
        setDirectoryPendingReview(directory.pendingReview ?? {});
        setDirectoryPublished(directory.published ?? {});
        setLoaded(true);
      } catch {
        if (!cancelled) router.replace("/sign-in");
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  // Compute staged casinos awaiting approval
  const pendingCasinos = ALL_PENDING_CASINOS.filter((c) => {
    if (directoryPublished[c.name] === true) return false;
    const isPending = directoryPendingReview[c.name] ?? true;
    return isPending;
  });

  const filteredPendingCasinos = pendingCasinos.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      c.siteUrl.toLowerCase().includes(q)
    );
  });

  function handlePendingInputChange(casinoName: string, field: string, value: any) {
    setPendingFormState((prev) => ({
      ...prev,
      [casinoName]: {
        ...prev[casinoName],
        [field]: value,
      },
    }));
  }

  async function handleApprovePending(casino: PendingCasinoData) {
    setApprovingName(casino.name);
    setError("");
    try {
      const overrides = pendingFormState[casino.name] || {};
      const targetName = overrides.name?.trim() || casino.name;
      const payload = {
        name: targetName,
        provider: overrides.provider ?? directoryProviders[casino.name] ?? "",
        siteUrl: overrides.url ?? overrides.siteUrl ?? casino.siteUrl,
        claimUrl: overrides.claimUrl ?? directoryClaimUrls[casino.name] ?? "",
        dailyBonusLabel: overrides.dailyBonusLabel ?? overrides.dailyBonus ?? casino.dailyBonus,
        dailyScAmount: overrides.dailyScAmount ?? casino.dailyScAmount,
        dailyGcAmount: overrides.dailyGcAmount ?? "",
        minRedemptionText: overrides.minRedemptionText ?? overrides.minRedemption ?? casino.minRedemption,
        resetHours: overrides.resetHours ?? overrides.intervalHours ?? casino.intervalHours,
        claimTip: overrides.claimTip ?? casino.claimTip,
        affiliateUrl: overrides.affiliateUrl ?? directoryAffiliateUrls[casino.name] ?? "",
      };

      const res = await apiApproveCasino(payload);

      setDirectoryPendingReview((prev) => ({ ...prev, [casino.name]: false, [targetName]: false }));
      setDirectoryPublished((prev) => ({ ...prev, [casino.name]: true, [targetName]: true }));
      setDirectoryList((prev) => (prev.includes(targetName) ? prev : [...prev, targetName]));
      if (payload.affiliateUrl) {
        setDirectoryAffiliateUrls((prev) => ({ ...prev, [targetName]: payload.affiliateUrl }));
      }
      if (payload.provider) {
        setDirectoryProviders((prev) => ({ ...prev, [targetName]: payload.provider }));
      }
      setDirectoryUrls((prev) => ({ ...prev, [targetName]: payload.siteUrl }));

      setApprovedSuccessMessage(`${targetName} deployed & approved live!`);
      setTimeout(() => setApprovedSuccessMessage(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve casino.");
    } finally {
      setApprovingName(null);
    }
  }

  function openDirectoryEditor(name: string) {
    setDirectoryEditing({ name, isNew: false });
    setDirectoryName(name);
    setDirectoryProvider(directoryProviders[name] || "");
    setDirectoryUrl(directoryUrls[name] || "");
    setDirectoryAffiliateUrl(directoryAffiliateUrls[name] || "");
    setDirectoryClaimUrl(directoryClaimUrls[name] || "");
    setDirectoryBonusUrl(directoryBonusUrls[name] || "");
    setDirectoryClaimTip(directoryClaimTips[name] || "");
    setDirectoryRating(typeof directoryRatings[name] === "number" ? String(directoryRatings[name]) : "");
    setDirectoryError("");
  }

  function openNewDirectoryEntry() {
    setDirectoryEditing({ name: "", isNew: true });
    setDirectoryName("");
    setDirectoryProvider("");
    setDirectoryUrl("");
    setDirectoryAffiliateUrl("");
    setDirectoryClaimUrl("");
    setDirectoryBonusUrl("");
    setDirectoryClaimTip("");
    setDirectoryRating("");
    setDirectoryError("");
  }

  async function saveDirectoryEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!directoryEditing) return;
    const trimmedName = directoryName.trim();
    const normalizedUrl = directoryUrl.trim()
      ? directoryUrl.trim().startsWith("http")
        ? directoryUrl.trim()
        : `https://${directoryUrl.trim()}`
      : "";
    const parsedRating = directoryRating.trim() ? Number(directoryRating) : undefined;
    if (!trimmedName || !normalizedUrl || (parsedRating !== undefined && (Number.isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5))) {
      setDirectoryError("Enter a casino name, a valid URL, and a rating from 0 to 5.");
      return;
    }
    if (directoryEditing.isNew && directoryList.some((name) => name.toLowerCase() === trimmedName.toLowerCase())) {
      setDirectoryError("That casino is already in the list.");
      return;
    }
    const updatedList = directoryEditing.isNew ? [...directoryList, trimmedName] : directoryList;
    const updatedUrls = { ...directoryUrls, [trimmedName]: normalizedUrl };
    const updatedProviders = { ...directoryProviders };
    if (directoryProvider.trim()) updatedProviders[trimmedName] = directoryProvider.trim();
    else delete updatedProviders[trimmedName];

    const updatedAffiliateUrls = { ...directoryAffiliateUrls };
    if (directoryAffiliateUrl.trim()) updatedAffiliateUrls[trimmedName] = directoryAffiliateUrl.trim();
    else delete updatedAffiliateUrls[trimmedName];

    const updatedClaimUrls = { ...directoryClaimUrls };
    if (directoryClaimUrl.trim()) updatedClaimUrls[trimmedName] = directoryClaimUrl.trim();
    else delete updatedClaimUrls[trimmedName];

    const updatedBonusUrls = { ...directoryBonusUrls };
    if (directoryBonusUrl.trim()) updatedBonusUrls[trimmedName] = directoryBonusUrl.trim();
    else delete updatedBonusUrls[trimmedName];

    const updatedClaimTips = { ...directoryClaimTips };
    if (directoryClaimTip.trim()) updatedClaimTips[trimmedName] = directoryClaimTip.trim();
    else delete updatedClaimTips[trimmedName];

    const updatedRatings = { ...directoryRatings };
    if (parsedRating !== undefined) updatedRatings[trimmedName] = parsedRating;
    else delete updatedRatings[trimmedName];

    setDirectoryList(updatedList);
    setDirectoryUrls(updatedUrls);
    setDirectoryProviders(updatedProviders);
    setDirectoryAffiliateUrls(updatedAffiliateUrls);
    setDirectoryClaimUrls(updatedClaimUrls);
    setDirectoryBonusUrls(updatedBonusUrls);
    setDirectoryClaimTips(updatedClaimTips);
    setDirectoryRatings(updatedRatings);
    try {
      await apiUpdateAdminCasino({
        name: trimmedName,
        provider: directoryProvider.trim() || null,
        siteUrl: normalizedUrl || null,
        affiliateUrl: directoryAffiliateUrl.trim() || null,
        claimUrl: directoryClaimUrl.trim() || null,
        bonusUrl: directoryBonusUrl.trim() || null,
        claimTip: directoryClaimTip.trim() || null,
        claimInstructions: directoryClaimTip.trim() || null,
        trustpilotRating: parsedRating ?? null,
      });
      if (directoryEditing.isNew) {
        await apiSaveDirectory({ list: updatedList, providers: updatedProviders as Record<string, string> });
      }
      setDirectoryEditing(null);
    } catch (saveError) {
      setDirectoryError(saveError instanceof Error ? saveError.message : "Unable to save the casino directory.");
    }
  }

  async function removeDirectoryCasino(name: string) {
    if (!window.confirm(`Remove ${name} from the master casino list?`)) return;
    const updatedList = directoryList.filter((item) => item !== name);
    setDirectoryList(updatedList);
    await apiSaveDirectory({ list: updatedList });
  }

  function openEditor(user: User, casino: Casino) {
    setEditing({ user, casino });
    setProvider(casino.provider || directoryProviders[casino.name] || "");
    setUrl(casino.siteUrl ?? "");
    setAffiliateUrl(casino.affiliateUrl ?? "");
    setClaimUrl(casino.claimUrl ?? "");
    setBonusUrl(casino.bonusUrl ?? "");
    setClaimTip(casino.claimTip || casino.claimInstructions || directoryClaimTips[casino.name] || "");
    setBonus(casino.dailyBonus);
    setDetails(casino.details || "");
    setRating(typeof casino.trustpilotRating === "number" ? String(casino.trustpilotRating) : "");
    setResetTime(casino.resetAtTime || "");
    setError("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const normalizedUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    const normalizedAffiliateUrl = affiliateUrl.trim().startsWith("http") ? affiliateUrl.trim() : (affiliateUrl.trim() ? `https://${affiliateUrl.trim()}` : "");
    const normalizedClaimUrl = claimUrl.trim().startsWith("http") ? claimUrl.trim() : (claimUrl.trim() ? `https://${claimUrl.trim()}` : "");
    const normalizedBonusUrl = bonusUrl.trim().startsWith("http") ? bonusUrl.trim() : (bonusUrl.trim() ? `https://${bonusUrl.trim()}` : "");
    const parsedRating = rating.trim() ? Number(rating) : undefined;
    if (!normalizedUrl || (parsedRating !== undefined && (Number.isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5))) {
      setError("Enter a valid URL and a rating from 0 to 5.");
      return;
    }
    const updatedCasino = {
      ...editing.casino,
      provider: provider.trim() || null,
      siteUrl: normalizedUrl || null,
      affiliateUrl: normalizedAffiliateUrl || null,
      claimUrl: normalizedClaimUrl || null,
      bonusUrl: normalizedBonusUrl || null,
      claimTip: claimTip.trim() || null,
      claimInstructions: claimTip.trim() || null,
      dailyBonus: bonus.trim() || "Free daily",
      details: details.trim() || null,
      trustpilotRating: parsedRating ?? null,
      resetAtTime: resetTime || null,
    };
    const updatedRecords = records.map((record) => record.user.email === editing.user.email
      ? { ...record, casinos: record.casinos.map((casino) => casino.id === editing.casino.id ? updatedCasino : casino) }
      : record);
    setRecords(updatedRecords);
    try {
      await apiUpdateAdminCasino({
        name: editing.casino.name,
        provider: provider.trim() || null,
        siteUrl: normalizedUrl || null,
        affiliateUrl: normalizedAffiliateUrl || null,
        claimUrl: normalizedClaimUrl || null,
        bonusUrl: normalizedBonusUrl || null,
        claimTip: claimTip.trim() || null,
        claimInstructions: claimTip.trim() || null,
        trustpilotRating: parsedRating ?? null,
        dailyBonus: bonus.trim() || "Free daily",
        details: details.trim() || null,
        resetAtTime: resetTime || null,
      });
      setEditing(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save casino changes.");
    }
  }

  const filteredDirectoryList = directoryList.filter((name) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const nameMatch = name.toLowerCase().includes(q);
    const provider = directoryProviders[name] || "";
    const providerMatch = provider.toLowerCase().includes(q);
    const url = directoryUrls[name] || "";
    const urlMatch = url.toLowerCase().includes(q);
    return nameMatch || providerMatch || urlMatch;
  });

  if (!loaded) {
    return <main className="grid min-h-screen place-items-center bg-[#101815] text-[#9bcf9c]">Loading casino workspace...</main>;
  }

  return (
    <main className="min-h-screen bg-[#101815] px-5 py-8 text-[#e6eee5] sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#9bcf9c] hover:text-[#c2e4bd]">
          <ArrowLeft size={16} /> Admin workspace
        </Link>
        <section className="mt-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">Admin casino workspace</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.05em] text-[#edf4ea] sm:text-5xl">Every profile, every casino.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9aa99c]">Review, configure, and approve casinos across the master catalog and individual user profiles.</p>
        </section>

        {approvedSuccessMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/80 p-4 text-sm font-bold text-emerald-300 animate-fadeIn">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span>{approvedSuccessMessage}</span>
          </div>
        )}

        <section className="mt-8 w-full max-w-full overflow-hidden rounded-2xl border border-[#2b4434] bg-[#19251f] p-4 sm:p-6">
          {/* Section Header & Tab Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2b4434] pb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("master")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "master"
                    ? "bg-[#79b77f] text-[#122519] shadow-sm"
                    : "bg-[#14201a] text-[#8fa792] hover:text-white"
                }`}
              >
                Master Directory ({directoryList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`relative rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "pending"
                    ? "bg-amber-500 text-[#122519] shadow-sm"
                    : "bg-[#14201a] text-amber-400/90 hover:text-amber-300"
                }`}
              >
                <Clock size={14} />
                <span>Pending Review ({pendingCasinos.length})</span>
                {pendingCasinos.length > 0 && (
                  <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <ExpandableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={activeTab === "pending" ? "Search pending..." : "Search master list..."}
                expandedWidth="w-48 sm:w-64"
              />
              {activeTab === "master" && (
                <button type="button" onClick={openNewDirectoryEntry} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#79b77f] px-3 py-2 text-xs font-semibold text-[#122519] hover:bg-[#91c991]">
                  <Plus size={14} /> Add casino
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: MASTER DIRECTORY */}
          {activeTab === "master" && (
            <div className="mt-5 grid w-full gap-3 lg:grid-cols-2">
              {filteredDirectoryList.map((name) => (
                <article key={name} className="w-full max-w-full min-w-0 flex items-center justify-between gap-3 sm:gap-4 rounded-xl border border-[#304638] bg-[#1f3027] p-3.5 sm:p-4 box-border">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="truncate font-bold text-sm text-[#e5eee3]">{name}</h3>
                      {directoryProviders[name] && (
                        <span className="shrink-0 rounded bg-teal-950/80 border border-teal-600/40 px-1.5 py-0.5 text-[9px] font-bold text-teal-300">
                          {directoryProviders[name]}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate block w-full text-xs text-[#a9bbaa]">{directoryUrls[name] || "No URL set"}</p>
                    <div className="flex items-center text-amber-400 text-xs mt-1">
                      <Stars rating={directoryRatings[name]} />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <button type="button" onClick={() => openDirectoryEditor(name)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#4c6d50] px-2.5 py-1.5 text-xs font-semibold text-[#b7d5b5] hover:bg-[#2a4230] transition">
                      <Pencil size={13} /> Edit
                    </button>
                    <button type="button" onClick={() => removeDirectoryCasino(name)} aria-label={`Remove ${name}`} className="p-1 text-[#718275] hover:text-[#e69b91] transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
              {filteredDirectoryList.length === 0 && (
                <p className="col-span-full rounded-xl border border-dashed border-[#304638] p-6 text-center text-sm text-[#819487]">
                  {searchQuery.trim() ? `No casinos found matching "${searchQuery.trim()}".` : "No casinos in the master list yet."}
                </p>
              )}
            </div>
          )}

          {/* TAB 2: PENDING REVIEW QUEUE */}
          {activeTab === "pending" && (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-amber-400 shrink-0" />
                  <span>
                    Staged casinos are hidden from standard users. Confirm or edit their specs below, then click <strong>Deploy / Approve</strong> to publish live.
                  </span>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {filteredPendingCasinos.map((casino) => {
                  const form = pendingFormState[casino.name] || {};
                  const isApproving = approvingName === casino.name;

                  return (
                    <div
                      key={casino.name}
                      className="w-full bg-[#121d17] border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl"
                    >
                      {/* Header Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#22362b]">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-white">
                            {form.name !== undefined ? form.name : casino.name}
                          </h3>
                          <span className="text-[10px] font-mono bg-[#0a140f] px-2 py-0.5 rounded text-gray-400 border border-[#233b2e]">
                            slug: {casino.slug}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Awaiting Admin Confirmation</span>
                        </div>
                      </div>

                      {/* 1. General Info */}
                      <div>
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block mb-2">
                          General Info
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                              Casino Name
                            </label>
                            <input
                              type="text"
                              value={form.name !== undefined ? form.name : casino.name}
                              onChange={(e) => handlePendingInputChange(casino.name, "name", e.target.value)}
                              className="w-full h-9 bg-[#09120d] border border-[#243d2e] rounded-xl px-3 text-xs text-white focus:border-emerald-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                              Operator / Provider
                            </label>
                            <input
                              type="text"
                              value={form.provider !== undefined ? form.provider : directoryProviders[casino.name] || ""}
                              placeholder="e.g. Blazesoft, eCom Enterprise"
                              onChange={(e) => handlePendingInputChange(casino.name, "provider", e.target.value)}
                              className="w-full h-9 bg-[#09120d] border border-[#243d2e] rounded-xl px-3 text-xs text-white focus:border-emerald-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                              Site URL
                            </label>
                            <input
                              type="text"
                              value={form.url !== undefined ? form.url : casino.siteUrl}
                              onChange={(e) => handlePendingInputChange(casino.name, "url", e.target.value)}
                              className="w-full h-9 bg-[#09120d] border border-[#243d2e] rounded-xl px-3 text-xs text-white focus:border-emerald-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                              Claim / Bonus URL
                            </label>
                            <input
                              type="text"
                              value={form.claimUrl !== undefined ? form.claimUrl : directoryClaimUrls[casino.name] || ""}
                              placeholder="https://..."
                              onChange={(e) => handlePendingInputChange(casino.name, "claimUrl", e.target.value)}
                              className="w-full h-9 bg-[#09120d] border border-[#243d2e] rounded-xl px-3 text-xs text-white focus:border-emerald-400 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 2. Daily Bonus Specs */}
                      <div className="pt-2 border-t border-[#22362b]">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block mb-2">
                          Daily Bonus Specs
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-1">
                              Daily Bonus Label
                            </label>
                            <input
                              type="text"
                              value={form.dailyBonusLabel !== undefined ? form.dailyBonusLabel : casino.dailyBonus}
                              placeholder="e.g. 1.00 SC + Daily Wheel"
                              onChange={(e) => handlePendingInputChange(casino.name, "dailyBonusLabel", e.target.value)}
                              className="w-full h-9 bg-[#09120d] border border-[#243d2e] rounded-xl px-3 text-xs text-white focus:border-emerald-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-1">
                              Daily SC Amount
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.dailyScAmount !== undefined ? form.dailyScAmount : casino.dailyScAmount ?? 1.0}
                              onChange={(e) => handlePendingInputChange(casino.name, "dailyScAmount", parseFloat(e.target.value))}
                              className="w-full h-9 bg-[#09120d] border border-[#243d2e] rounded-xl px-3 text-xs text-white focus:border-emerald-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-1">
                              Daily GC Amount
                            </label>
                            <input
                              type="text"
                              value={form.dailyGcAmount !== undefined ? form.dailyGcAmount : ""}
                              placeholder="e.g. 10,000 GC"
                              onChange={(e) => handlePendingInputChange(casino.name, "dailyGcAmount", e.target.value)}
                              className="w-full h-9 bg-[#09120d] border border-[#243d2e] rounded-xl px-3 text-xs text-white focus:border-emerald-400 outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-1">
                              Timer Cycle (Hours)
                            </label>
                            <input
                              type="number"
                              value={form.resetHours !== undefined ? form.resetHours : casino.intervalHours ?? 24}
                              onChange={(e) => handlePendingInputChange(casino.name, "resetHours", parseInt(e.target.value))}
                              className="w-full h-9 bg-[#09120d] border border-[#243d2e] rounded-xl px-3 text-xs text-white focus:border-emerald-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                              Fixed Reset Time (PST)
                            </label>
                            <select
                              value={form.resetAtTime !== undefined ? form.resetAtTime : casino.resetAtTime || ""}
                              onChange={(e) => handlePendingInputChange(casino.name, "resetAtTime", e.target.value)}
                              className="w-full h-9 bg-[#09120d] border border-[#243d2e] rounded-xl px-2.5 text-xs text-white focus:border-emerald-400 outline-none cursor-pointer"
                            >
                              {PACIFIC_TIME_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-[#121d17] text-white">
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-1">
                              Claim Tip
                            </label>
                            <input
                              type="text"
                              value={form.claimTip !== undefined ? form.claimTip : casino.claimTip || ""}
                              placeholder="e.g. Click store popup"
                              onChange={(e) => handlePendingInputChange(casino.name, "claimTip", e.target.value)}
                              className="w-full h-9 bg-[#09120d] border border-[#243d2e] rounded-xl px-3 text-xs text-white focus:border-emerald-400 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 3. Redemption & Affiliate */}
                      <div className="pt-2 border-t border-[#22362b]">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block mb-2">
                          Redemption &amp; Affiliate
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                              Minimum Redemption
                            </label>
                            <input
                              type="text"
                              value={form.minRedemptionText !== undefined ? form.minRedemptionText : casino.minRedemption || ""}
                              placeholder="e.g. $50 (Gift Card) / $100 (Bank)"
                              onChange={(e) => handlePendingInputChange(casino.name, "minRedemptionText", e.target.value)}
                              className="w-full h-9 bg-[#09120d] border border-[#243d2e] rounded-xl px-3 text-xs text-white focus:border-emerald-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                              Affiliate / Referral URL
                            </label>
                            <input
                              type="text"
                              value={form.affiliateUrl !== undefined ? form.affiliateUrl : directoryAffiliateUrls[casino.name] || ""}
                              placeholder="https://..."
                              onChange={(e) => handlePendingInputChange(casino.name, "affiliateUrl", e.target.value)}
                              className="w-full h-9 bg-[#09120d] border border-[#243d2e] rounded-xl px-3 text-xs text-white focus:border-emerald-400 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer Action Bar */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#22362b] mt-1">
                        <span className="text-xs text-gray-400 font-medium">
                          Status: <strong className="text-gray-300">Hidden (Draft)</strong>
                        </span>
                        <button
                          type="button"
                          disabled={isApproving}
                          onClick={() => handleApprovePending(casino)}
                          className="h-10 px-4 rounded-xl inline-flex items-center justify-center gap-2 text-xs font-black text-white bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 border-t border-emerald-300/60 shadow-[0_3px_12px_rgba(16,185,129,0.35)] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-4 h-4 text-emerald-200" />
                          <span>{isApproving ? "Publishing..." : "Deploy / Approve"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredPendingCasinos.length === 0 && (
                  <div className="col-span-full rounded-xl border border-dashed border-[#304638] p-10 text-center text-sm text-[#819487]">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                    <p className="font-bold text-white">All staged casinos reviewed &amp; approved!</p>
                    <p className="text-xs text-gray-400 mt-1">There are currently no casinos awaiting admin review.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* User Profiles Section */}
        <div className="mt-8 space-y-5 w-full max-w-full overflow-hidden">
          {records.map((record) => (
            <section key={record.user.email} className="w-full max-w-full overflow-hidden rounded-2xl border border-[#2b4434] bg-[#19251f] p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#e5eee3]">{record.user.name}</h2>
                  <p className="mt-1 text-sm text-[#93a495]">{record.user.email}</p>
                </div>
                <span className="rounded-full border border-[#355b3d] bg-[#1b3625] px-3 py-1 text-xs font-semibold text-[#9bcf9c]">
                  {record.casinos.length} casinos
                </span>
              </div>
              <div className="mt-5 grid w-full gap-3 lg:grid-cols-2">
                {record.casinos.map((casino) => (
                  <article key={casino.id} className="w-full max-w-full min-w-0 flex items-center justify-between gap-3 sm:gap-4 rounded-xl border border-[#304638] bg-[#1f3027] p-3.5 sm:p-4 box-border">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="truncate font-bold text-sm text-[#e5eee3]">{casino.name}</h3>
                        {(casino.provider || directoryProviders[casino.name]) && (
                          <span className="shrink-0 rounded bg-teal-950/80 border border-teal-600/40 px-1.5 py-0.5 text-[9px] font-bold text-teal-300">
                            {casino.provider || directoryProviders[casino.name]}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate block w-full text-xs text-[#a9bbaa]">{casino.dailyBonus}</p>
                      <div className="flex items-center text-amber-400 text-xs mt-1">
                        <Stars rating={casino.trustpilotRating} />
                      </div>
                    </div>
                    <button type="button" onClick={() => openEditor(record.user, casino)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#4c6d50] px-2.5 py-1.5 text-xs font-semibold text-[#b7d5b5] hover:bg-[#2a4230] transition">
                      <Pencil size={13} /> Edit
                    </button>
                  </article>
                ))}
                {record.casinos.length === 0 && <p className="text-sm text-[#819487]">No casinos saved for this profile.</p>}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Editor Modal for Profile Casinos */}
      {editing && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/65 p-5" role="presentation" onMouseDown={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#38503d] bg-[#19251f] p-6 shadow-2xl" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">Edit profile casino</p>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-[#e5eee3]">{editing.casino.name}</h2>
                <p className="mt-1 text-xs text-[#93a495]">{editing.user.email}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close editor" className="text-[#91a595] hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="mt-6 grid gap-3">
              <label className="text-xs font-semibold text-[#a9bbaa]">Provider / Network Group<input value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="VGW, Blazesoft, or leave blank if standalone" className="mt-2 h-11 w-full rounded-xl border border-emerald-600/50 bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              <label className="text-xs font-semibold text-[#a9bbaa]">Site URL (card click / logo)<input required value={url} onChange={(event) => setUrl(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              <label className="text-xs font-semibold text-[#a9bbaa]">Affiliate URL (Sign up link)<input value={affiliateUrl} onChange={(event) => setAffiliateUrl(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              <label className="text-xs font-semibold text-[#a9bbaa]">Claim URL (Claim Now link)<input value={claimUrl} onChange={(event) => setClaimUrl(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              <label className="text-xs font-semibold text-[#a9bbaa]">Bonus URL (bonus details link)<input value={bonusUrl} onChange={(event) => setBonusUrl(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              <label className="text-xs font-semibold text-[#a9bbaa]">
                Claim Tip (Shows in Speed Run &amp; Cheat Sheet)
                <textarea
                  rows={3}
                  value={claimTip}
                  onChange={(event) => setClaimTip(event.target.value)}
                  placeholder="e.g. Click the daily bonus gift box on the top right header."
                  className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-[#111b16] p-2.5 text-xs text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                />
              </label>
              <label className="text-xs font-semibold text-[#a9bbaa]">Trustpilot rating<input type="number" min="0" max="5" step="0.1" value={rating} onChange={(event) => setRating(event.target.value)} placeholder="0 to 5" className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              <label className="text-xs font-semibold text-[#a9bbaa]">Bonus label<input value={bonus} onChange={(event) => setBonus(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              <label className="text-xs font-semibold text-[#a9bbaa]">Details<textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 py-2 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              <label className="text-xs font-semibold text-[#a9bbaa]">
                Daily reset time (PST)
                <select
                  value={resetTime}
                  onChange={(event) => setResetTime(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e] cursor-pointer"
                >
                  {PACIFIC_TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#111b16] text-[#e0ece0]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-[#e69b91]">{error}</p>}
            <button type="submit" className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[#79b77f] text-sm font-semibold text-[#122519] hover:bg-[#91c991]">Save changes</button>
          </form>
        </div>
      )}

      {/* Editor Modal for Directory Master Casinos */}
      {directoryEditing && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/65 p-5" role="presentation" onMouseDown={() => setDirectoryEditing(null)}>
          <form onSubmit={saveDirectoryEdit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#38503d] bg-[#19251f] p-6 shadow-2xl" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">{directoryEditing.isNew ? "Add casino" : "Edit master casino"}</p>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-[#e5eee3]">{directoryEditing.isNew ? "New casino" : directoryEditing.name}</h2>
              </div>
              <button type="button" onClick={() => setDirectoryEditing(null)} aria-label="Close editor" className="text-[#91a595] hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="mt-6 grid gap-3">
              {directoryEditing.isNew && (
                <label className="text-xs font-semibold text-[#a9bbaa]">Casino name<input required value={directoryName} onChange={(event) => setDirectoryName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              )}
              <label className="text-xs font-semibold text-[#a9bbaa]">Provider / Network Group<input value={directoryProvider} onChange={(event) => setDirectoryProvider(event.target.value)} placeholder="VGW, Blazesoft, or leave blank if standalone" className="mt-2 h-11 w-full rounded-xl border border-emerald-600/50 bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              <label className="text-xs font-semibold text-[#a9bbaa]">Site URL (card click / logo)<input required value={directoryUrl} onChange={(event) => setDirectoryUrl(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              <label className="text-xs font-semibold text-[#a9bbaa]">Affiliate URL (Sign up link)<input value={directoryAffiliateUrl} onChange={(event) => setDirectoryAffiliateUrl(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              <label className="text-xs font-semibold text-[#a9bbaa]">Claim URL (Claim Now link)<input value={directoryClaimUrl} onChange={(event) => setDirectoryClaimUrl(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              <label className="text-xs font-semibold text-[#a9bbaa]">Bonus URL (bonus details link)<input value={directoryBonusUrl} onChange={(event) => setDirectoryBonusUrl(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
              <label className="text-xs font-semibold text-[#a9bbaa]">
                Claim Tip (Shows in Speed Run &amp; Cheat Sheet)
                <textarea
                  rows={3}
                  value={directoryClaimTip}
                  onChange={(event) => setDirectoryClaimTip(event.target.value)}
                  placeholder="e.g. Click the daily bonus gift box on the top right header."
                  className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-[#111b16] p-2.5 text-xs text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                />
              </label>
              <label className="text-xs font-semibold text-[#a9bbaa]">Trustpilot rating<input type="number" min="0" max="5" step="0.1" value={directoryRating} onChange={(event) => setDirectoryRating(event.target.value)} placeholder="0 to 5" className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]" /></label>
            </div>
            {directoryError && <p role="alert" className="mt-3 text-sm text-[#e69b91]">{directoryError}</p>}
            <button type="submit" className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[#79b77f] text-sm font-semibold text-[#122519] hover:bg-[#91c991]">Save changes</button>
          </form>
        </div>
      )}
    </main>
  );
}
