"use client";

import { FormEvent, useEffect, useState } from "react";
import { X, ShieldCheck, ExternalLink, HelpCircle } from "lucide-react";
import type { Casino } from "@/types/casino";

interface EditCasinoModalProps {
  isOpen: boolean;
  onClose: () => void;
  casino: Casino | null;
  onSave: (updates: Partial<Casino>) => Promise<void> | void;
  isAdmin?: boolean;
}

export function EditCasinoModal({
  isOpen,
  onClose,
  casino,
  onSave,
  isAdmin = false,
}: EditCasinoModalProps) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [claimUrl, setClaimUrl] = useState("");
  const [bonusUrl, setBonusUrl] = useState("");
  const [bonusTitle, setBonusTitle] = useState("");
  const [dailyBonus, setDailyBonus] = useState("");
  const [trustpilotRating, setTrustpilotRating] = useState("");
  const [details, setDetails] = useState("");
  const [useSpecificReset, setUseSpecificReset] = useState(false);
  const [resetTime, setResetTime] = useState("00:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (casino) {
      setName(casino.name || "");
      setProvider(casino.provider || "");
      setSiteUrl(casino.siteUrl || casino.url || "");
      setAffiliateUrl(casino.affiliateUrl || "");
      setClaimUrl(casino.claimUrl || "");
      setBonusUrl(casino.bonusUrl || "");
      setBonusTitle(casino.bonusTitle || "");
      setDailyBonus(casino.dailyBonus || "");
      setTrustpilotRating(typeof casino.trustpilotRating === "number" ? String(casino.trustpilotRating) : "");
      setDetails(casino.details || "");
      setUseSpecificReset(Boolean(casino.resetAtTime));
      setResetTime(casino.resetAtTime || "00:00");
      setError("");
    }
  }, [casino]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !casino) return null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const normalizedSite = siteUrl.trim()
        ? siteUrl.trim().startsWith("http")
          ? siteUrl.trim()
          : `https://${siteUrl.trim()}`
        : undefined;

      const normalizedAffiliate = affiliateUrl.trim()
        ? affiliateUrl.trim().startsWith("http")
          ? affiliateUrl.trim()
          : `https://${affiliateUrl.trim()}`
        : undefined;

      const normalizedClaim = claimUrl.trim()
        ? claimUrl.trim().startsWith("http")
          ? claimUrl.trim()
          : `https://${claimUrl.trim()}`
        : undefined;

      const normalizedBonusUrl = bonusUrl.trim()
        ? bonusUrl.trim().startsWith("http")
          ? bonusUrl.trim()
          : `https://${bonusUrl.trim()}`
        : undefined;

      const parsedRating = trustpilotRating.trim() ? Number(trustpilotRating) : undefined;
      if (parsedRating !== undefined && (Number.isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5)) {
        setError("Trustpilot rating must be between 0 and 5.");
        setSaving(false);
        return;
      }

      await onSave({
        name: name.trim() || casino?.name,
        provider: provider.trim() || undefined,
        siteUrl: normalizedSite,
        url: normalizedSite,
        affiliateUrl: normalizedAffiliate,
        claimUrl: normalizedClaim,
        bonusUrl: normalizedBonusUrl,
        bonusTitle: bonusTitle.trim() || undefined,
        dailyBonus: dailyBonus.trim() || casino?.dailyBonus,
        trustpilotRating: parsedRating,
        details: details.trim() || undefined,
        resetAtTime: useSpecificReset ? resetTime : null,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-casino-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3.5 sm:p-5 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-3xl border border-[#38503d] bg-[#121f17] shadow-[0_25px_70px_rgba(0,0,0,0.7)] text-[#e6eee5]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 pb-3 border-b border-[#243d2c] flex items-start justify-between bg-[#121f17]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#91b291]">
                {isAdmin ? "Admin Casino Editor" : "Edit Casino"}
              </span>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded bg-teal-950/80 border border-teal-600/40 px-1.5 py-0.2 text-[9px] font-bold text-teal-300">
                  <ShieldCheck size={11} />
                  <span>Global Sync</span>
                </span>
              )}
            </div>
            <h2
              id="edit-casino-modal-title"
              className="mt-1 text-xl sm:text-2xl font-bold text-white tracking-tight"
            >
              {casino.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit casino modal"
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#344d3b] text-[#91a595] hover:border-[#5ca06c] hover:bg-[#192b20] hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
          {/* Casino Name */}
          <div>
            <label className="block text-xs font-semibold text-[#a9bbaa] mb-1">
              Casino Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 w-full rounded-xl border border-[#344d3b] bg-[#0c1611] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e] focus:ring-1 focus:ring-[#78ae7e]"
            />
          </div>

          {/* Provider / Network Group */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                <span>Provider / Network Group</span>
              </label>
              <span className="text-[10px] text-[#789580] font-mono">Used for Speed Run sorting</span>
            </div>
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="VGW, Blazesoft, or leave blank if standalone"
              className="h-10 w-full rounded-xl border border-emerald-600/50 bg-[#0c1611] px-3 text-sm text-white placeholder:text-[#5e7865] outline-none focus:border-[#39ff6a] focus:ring-1 focus:ring-[#39ff6a]"
            />
            <p className="mt-1 text-[11px] text-[#7e9b86]">
              Grouping multiple casinos under the same provider (e.g. VGW for Chumba & LuckyLand) groups their daily rolls together during Speed Run.
            </p>
          </div>

          {/* Site URL */}
          <div>
            <label className="block text-xs font-semibold text-[#a9bbaa] mb-1">
              Site URL (card click & logo source)
            </label>
            <input
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://casino.example"
              className="h-10 w-full rounded-xl border border-[#344d3b] bg-[#0c1611] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
            />
          </div>

          {/* Affiliate & Claim URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#a9bbaa] mb-1">
                Affiliate URL (Sign Up Link)
              </label>
              <input
                type="text"
                value={affiliateUrl}
                onChange={(e) => setAffiliateUrl(e.target.value)}
                placeholder="https://casino.example?ref=..."
                className="h-10 w-full rounded-xl border border-[#344d3b] bg-[#0c1611] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a9bbaa] mb-1">
                Claim URL (Claim Now Link)
              </label>
              <input
                type="text"
                value={claimUrl}
                onChange={(e) => setClaimUrl(e.target.value)}
                placeholder="https://casino.example"
                className="h-10 w-full rounded-xl border border-[#344d3b] bg-[#0c1611] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
              />
            </div>
          </div>

          {/* Bonus URL & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#a9bbaa] mb-1">
                Bonus URL (Bonus Details)
              </label>
              <input
                type="text"
                value={bonusUrl}
                onChange={(e) => setBonusUrl(e.target.value)}
                placeholder="https://casino.example/bonus"
                className="h-10 w-full rounded-xl border border-[#344d3b] bg-[#0c1611] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a9bbaa] mb-1">
                Bonus Button Title
              </label>
              <input
                type="text"
                value={bonusTitle}
                onChange={(e) => setBonusTitle(e.target.value)}
                placeholder="e.g. Daily Bonus, Free SC"
                className="h-10 w-full rounded-xl border border-[#344d3b] bg-[#0c1611] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
              />
            </div>
          </div>

          {/* Daily Bonus Reward & Trustpilot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#a9bbaa] mb-1">
                Daily Bonus Label
              </label>
              <input
                type="text"
                value={dailyBonus}
                onChange={(e) => setDailyBonus(e.target.value)}
                placeholder="e.g. 1.00 SC + 10,000 GC"
                className="h-10 w-full rounded-xl border border-[#344d3b] bg-[#0c1611] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a9bbaa] mb-1">
                Trustpilot Rating (0 - 5)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={trustpilotRating}
                onChange={(e) => setTrustpilotRating(e.target.value)}
                placeholder="e.g. 4.5"
                className="h-10 w-full rounded-xl border border-[#344d3b] bg-[#0c1611] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
              />
            </div>
          </div>

          {/* Details */}
          <div>
            <label className="block text-xs font-semibold text-[#a9bbaa] mb-1">
              Details / Notes
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={2}
              placeholder="e.g. Daily reload claim tips, restrictions, or instructions..."
              className="w-full rounded-xl border border-[#344d3b] bg-[#0c1611] px-3 py-2 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
            />
          </div>

          {/* Reset Timer */}
          <fieldset className="rounded-xl border border-[#2b4434] bg-[#0c1611] p-3 space-y-2">
            <legend className="text-xs font-semibold text-[#a9bbaa] px-1">
              Reset Timer Configuration
            </legend>
            <label className="flex items-center gap-2.5 text-xs text-[#a9bbaa] cursor-pointer">
              <input
                type="checkbox"
                checked={useSpecificReset}
                onChange={(e) => setUseSpecificReset(e.target.checked)}
                className="h-4 w-4 accent-[#79b77f]"
              />
              <span>Fixed daily reset time (e.g. Midnight UTC)</span>
            </label>
            {useSpecificReset && (
              <div className="pt-1">
                <label className="block text-[11px] font-medium text-[#789580] mb-1">
                  Daily Reset Time (Local 24h)
                </label>
                <input
                  type="time"
                  value={resetTime}
                  onChange={(e) => setResetTime(e.target.value)}
                  className="h-9 rounded-lg border border-[#344d3b] bg-[#14231b] px-2 text-xs text-white"
                />
              </div>
            )}
          </fieldset>

          {error && (
            <p role="alert" className="text-xs text-red-400 font-medium">
              {error}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 p-4 border-t border-[#243d2c] flex justify-end gap-2.5 bg-[#121f17]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[#344d3b] px-4 py-2 text-xs font-semibold text-[#a9bbaa] hover:bg-[#192b20] hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-[#79b77f] to-[#39ff6a] px-5 py-2 text-xs font-bold text-[#0d1712] shadow-[0_4px_14px_rgba(57,255,106,0.35)] transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Casino Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditCasinoModal;

