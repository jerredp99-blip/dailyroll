"use client";

import { useState } from "react";
import { X, Save, Edit3, Loader2 } from "lucide-react";
import type { Casino } from "@/types/casino";

export function AdminCasinoDataForm({
  casino,
  isOpen,
  onClose,
  onSaved,
}: {
  casino: Casino;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedCasino: Casino) => void;
}) {
  const [formData, setFormData] = useState({
    name: casino.name || "",
    siteUrl: casino.siteUrl || casino.url || "",
    claimUrl: casino.claimUrl || "",
    affiliateUrl: casino.affiliateUrl || "",
    dailyBonus: casino.dailyBonus || "",
    dailyBonusSc: casino.dailyBonusSc || "",
    dailyBonusGc: casino.dailyBonusGc || "",
    minRedemption: casino.minRedemption || "",
    payoutMethods: casino.payoutMethods || "",
    payoutSpeed: casino.payoutSpeed || "",
    resetRule: casino.resetRule || "",
    restrictedStates: casino.restrictedStates || "",
    provider: casino.provider || "",
    trustpilotRating: casino.trustpilotRating ? String(casino.trustpilotRating) : "",
    claimTip: casino.claimTip ?? casino.claimInstructions ?? casino.details ?? "",
    details: casino.details || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/casinos/${encodeURIComponent(casino.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim() || casino.name,
          siteUrl: formData.siteUrl.trim() || null,
          claimUrl: formData.claimUrl.trim() || null,
          affiliateUrl: formData.affiliateUrl.trim() || null,
          dailyBonus: formData.dailyBonus.trim() || null,
          dailyBonusSc: formData.dailyBonusSc.trim() || null,
          dailyBonusGc: formData.dailyBonusGc.trim() || null,
          minRedemption: formData.minRedemption.trim() || null,
          payoutMethods: formData.payoutMethods.trim() || null,
          payoutSpeed: formData.payoutSpeed.trim() || null,
          resetRule: formData.resetRule.trim() || null,
          restrictedStates: formData.restrictedStates.trim() || null,
          provider: formData.provider.trim() || null,
          trustpilotRating: formData.trustpilotRating.trim() ? Number(formData.trustpilotRating.trim()) : null,
          claimTip: formData.claimTip.trim() || null,
          claimInstructions: formData.claimTip.trim() || null,
          details: formData.details.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update casino operational specs");
      }

      onSaved(data.casino);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Error saving changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-emerald-700/60 bg-[#0f1d16] p-5 sm:p-7 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-900 pb-4">
          <div className="flex items-center gap-2">
            <Edit3 className="text-emerald-400" size={20} />
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              Edit Operational Specs: {casino.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-emerald-950 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Section 1: Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Casino Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full rounded-lg border border-emerald-800/60 bg-[#14261d] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-400"
                placeholder="e.g. Stake.us"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Operator / Provider
              </label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => handleChange("provider", e.target.value)}
                className="w-full rounded-lg border border-emerald-800/60 bg-[#14261d] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-400"
                placeholder="e.g. VGW, B2Services, Blazesoft"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Site URL
              </label>
              <input
                type="url"
                value={formData.siteUrl}
                onChange={(e) => handleChange("siteUrl", e.target.value)}
                className="w-full rounded-lg border border-emerald-800/60 bg-[#14261d] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-400"
                placeholder="https://casino.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Claim / Bonus URL
              </label>
              <input
                type="url"
                value={formData.claimUrl}
                onChange={(e) => handleChange("claimUrl", e.target.value)}
                className="w-full rounded-lg border border-emerald-800/60 bg-[#14261d] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-400"
                placeholder="https://casino.com/daily-claim"
              />
            </div>
          </div>

          {/* Section 2: Daily Bonus Specs */}
          <div className="border-t border-emerald-900/60 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
              Daily Bonus Specs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Daily Bonus Label
                </label>
                <input
                  type="text"
                  value={formData.dailyBonus}
                  onChange={(e) => handleChange("dailyBonus", e.target.value)}
                  className="w-full rounded-lg border border-emerald-800/60 bg-[#14261d] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-400"
                  placeholder="e.g. 1.00 SC"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Daily SC Amount
                </label>
                <input
                  type="text"
                  value={formData.dailyBonusSc}
                  onChange={(e) => handleChange("dailyBonusSc", e.target.value)}
                  className="w-full rounded-lg border border-emerald-800/60 bg-[#14261d] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-400"
                  placeholder="e.g. 1.00 SC"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Daily GC Amount
                </label>
                <input
                  type="text"
                  value={formData.dailyBonusGc}
                  onChange={(e) => handleChange("dailyBonusGc", e.target.value)}
                  className="w-full rounded-lg border border-emerald-800/60 bg-[#14261d] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-400"
                  placeholder="e.g. 10,000 GC"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Redemptions & Payouts */}
          <div className="border-t border-emerald-900/60 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
              Redemption & Payout Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Minimum Redemption
                </label>
                <input
                  type="text"
                  value={formData.minRedemption}
                  onChange={(e) => handleChange("minRedemption", e.target.value)}
                  className="w-full rounded-lg border border-emerald-800/60 bg-[#14261d] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-400"
                  placeholder="e.g. $50 (Gift Card) / $100 (Bank)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Payout Speed
                </label>
                <input
                  type="text"
                  value={formData.payoutSpeed}
                  onChange={(e) => handleChange("payoutSpeed", e.target.value)}
                  className="w-full rounded-lg border border-emerald-800/60 bg-[#14261d] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-400"
                  placeholder="e.g. 24-48 Hours, Instant"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Payout Methods
                </label>
                <input
                  type="text"
                  value={formData.payoutMethods}
                  onChange={(e) => handleChange("payoutMethods", e.target.value)}
                  className="w-full rounded-lg border border-emerald-800/60 bg-[#14261d] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-400"
                  placeholder="e.g. Online Banking, Skrill, Prizeout Gift Cards, Crypto"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Rules & Restrictions */}
          <div className="border-t border-emerald-900/60 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
              Rules & Compliance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Reset Rule
                </label>
                <input
                  type="text"
                  value={formData.resetRule}
                  onChange={(e) => handleChange("resetRule", e.target.value)}
                  className="w-full rounded-lg border border-emerald-800/60 bg-[#14261d] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-400"
                  placeholder="e.g. Rolling 24 Hours, Fixed Midnight EST"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Restricted States
                </label>
                <input
                  type="text"
                  value={formData.restrictedStates}
                  onChange={(e) => handleChange("restrictedStates", e.target.value)}
                  className="w-full rounded-lg border border-emerald-800/60 bg-[#14261d] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-400"
                  placeholder="e.g. WA, ID, NV, MI, KY"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Trustpilot Rating
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.trustpilotRating}
                  onChange={(e) => handleChange("trustpilotRating", e.target.value)}
                  className="w-full rounded-lg border border-emerald-800/60 bg-[#14261d] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-400"
                  placeholder="e.g. 4.2"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Claim Tip (Shows in Speed Run & Cheat Sheet)
                </label>
                <textarea
                  rows={3}
                  value={formData.claimTip ?? ""}
                  onChange={(e) => handleChange("claimTip", e.target.value)}
                  placeholder="e.g. Click the daily bonus gift box on the top right header."
                  className="w-full bg-zinc-950 border border-emerald-500/30 rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-emerald-900/60 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-[#39ff6a] px-5 py-2 text-xs font-extrabold text-[#0c1a11] hover:bg-[#57ff81] transition shadow-[0_4px_16px_rgba(57,255,106,0.3)] disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Operational Specs</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminCasinoDataForm;

