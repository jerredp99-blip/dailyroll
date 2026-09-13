"use client";

import { useState, useRef, useMemo } from "react";
import {
  Send,
  Trophy,
  Gift,
  MessageSquare,
  Loader2,
  Image as ImageIcon,
  Video,
  X,
  Link as LinkIcon,
} from "lucide-react";
import { TagBadge } from "@/app/components/feed/TagBadge";
import { CATEGORY_TAGS, CASINO_TAGS } from "@/lib/casino-tags";
import type { Post, PostType } from "@/lib/store";
import type { Casino } from "@/types/casino";

export function PostComposer({
  currentUserEmail,
  currentUserName,
  currentUserAvatar,
  isAdmin = false,
  casinos = [],
  onPostCreated,
}: {
  currentUserEmail?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  isAdmin?: boolean;
  casinos?: Casino[];
  onPostCreated: (post: Post) => void;
}) {
  const [type, setType] = useState<PostType>("discussion");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCasinoId, setSelectedCasinoId] = useState("");
  const [winAmount, setWinAmount] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [dropCode, setDropCode] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "link" | undefined>(undefined);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const supportedCasinosList = useMemo(() => {
    const list: Array<{ id: string; name: string; tag: string }> = [];
    const seen = new Set<string>();

    if (casinos && Array.isArray(casinos)) {
      for (const c of casinos) {
        const id = c.id.toLowerCase().trim();
        if (!seen.has(id)) {
          seen.add(id);
          const tag = c.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
          list.push({ id: c.id, name: c.name, tag });
        }
      }
    }

    for (const ct of CASINO_TAGS) {
      const id = ct.id.toLowerCase().trim();
      if (!seen.has(id)) {
        seen.add(id);
        list.push({ id: ct.id.toLowerCase(), name: ct.name, tag: ct.id });
      }
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [casinos]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      setError("Please select a valid image or video file.");
      return;
    }

    // Check size (warn/reject if over 10MB to avoid payload limits)
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large (max 10MB). For larger videos, paste a video URL instead.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMediaUrl(reader.result as string);
      setMediaType(isVideo ? "video" : "image");
      setShowUrlInput(false);
    };
    reader.onerror = () => {
      setError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaUrl("");
    setMediaType(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSelectType = (newType: PostType) => {
    if (newType === "drop_code" && !isAdmin) return;
    setType(newType);
    if (newType === "big_win" && !selectedTags.includes("BIG_WIN")) {
      setSelectedTags((prev) => [
        ...prev.filter((t) => t !== "DISCUSSION" && t !== "BONUS_CODE"),
        "BIG_WIN",
      ]);
    } else if (newType === "drop_code" && !selectedTags.includes("BONUS_CODE")) {
      setSelectedTags((prev) => [
        ...prev.filter((t) => t !== "DISCUSSION" && t !== "BIG_WIN"),
        "BONUS_CODE",
      ]);
    } else if (newType === "discussion" && !selectedTags.includes("DISCUSSION")) {
      setSelectedTags((prev) => [
        ...prev.filter((t) => t !== "BIG_WIN" && t !== "BONUS_CODE"),
        "DISCUSSION",
      ]);
    }
  };

  const handleAddTag = (val: string) => {
    if (!val) return;
    const upper = val.trim().toUpperCase();
    if (!selectedTags.includes(upper)) {
      setSelectedTags((prev) => [...prev, upper]);
    }
    if (upper === "BIG_WIN") {
      setType("big_win");
    } else if (upper === "BONUS_CODE") {
      setType("drop_code");
    } else if (upper === "DISCUSSION") {
      setType("discussion");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    if (type === "drop_code" && !selectedCasinoId) {
      setError("Please select the associated casino for this bonus drop.");
      setIsSubmitting(false);
      return;
    }

    const chosenCasino = supportedCasinosList.find((c) => c.id === selectedCasinoId);
    const chosenCasinoId =
      selectedCasinoId === "universal" ? null : chosenCasino ? chosenCasino.id : selectedCasinoId || null;
    const chosenCasinoName =
      selectedCasinoId === "universal" ? "All Casinos" : chosenCasino ? chosenCasino.name : null;
    const chosenCasinoTag = chosenCasino ? chosenCasino.tag : selectedTags[0] || undefined;
    const effectiveTags =
      chosenCasinoTag && !selectedTags.includes(chosenCasinoTag)
        ? [chosenCasinoTag, ...selectedTags.filter((t) => t !== "BONUS_CODE"), "BONUS_CODE"]
        : selectedTags;

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          casinoId: chosenCasinoId,
          casinoName: chosenCasinoName,
          casinoTag: chosenCasinoTag,
          tags: effectiveTags,
          type,
          winAmount: type === "big_win" ? winAmount : undefined,
          multiplier: type === "big_win" ? multiplier : undefined,
          dropCode: type === "drop_code" ? dropCode : undefined,
          targetUrl: targetUrl.trim() ? targetUrl.trim() : undefined,
          linkUrl: targetUrl.trim() ? targetUrl.trim() : undefined,
          authorEmail: currentUserEmail,
          authorName: currentUserName,
          authorAvatar: currentUserAvatar,
          mediaUrl: mediaUrl || undefined,
          mediaType: mediaType || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish post");
      }

      onPostCreated(data.post);
      setContent("");
      setSelectedTags([]);
      setSelectedCasinoId("");
      setWinAmount("");
      setMultiplier("");
      setDropCode("");
      setTargetUrl("");
      handleRemoveMedia();
      setShowUrlInput(false);
      setIsExpanded(false);
    } catch (err: any) {
      setError(err.message || "Failed to post");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Minimized state: sleek, compact bar that expands upon clicking the typebox
  if (!isExpanded) {
    return (
      <div className="rounded-2xl border border-[#243d2e] bg-[#122018]/95 p-3 sm:p-4 shadow-sm backdrop-blur transition hover:border-[#335640]">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {currentUserAvatar ? (
            <img
              src={currentUserAvatar}
              alt={currentUserName || "Avatar"}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover border border-emerald-500/40 shrink-0"
            />
          ) : (
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-xs font-bold text-white shrink-0">
              {(currentUserName || "U").slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* Minimized typebox trigger */}
          <button
            type="button"
            onClick={() => {
              setIsExpanded(true);
              setTimeout(() => textareaRef.current?.focus(), 50);
            }}
            className="flex-1 rounded-xl border border-[#243d2e] bg-[#0d1611] px-3.5 py-2 sm:py-2.5 text-left text-xs sm:text-sm text-[#66806c] transition hover:border-emerald-500/50 hover:bg-[#111e17] hover:text-[#90ad98] flex items-center justify-between cursor-pointer"
          >
            <span className="truncate">Share a win, bonus code, or discuss...</span>
            <span className="hidden sm:inline text-[11px] font-semibold text-emerald-400/80 bg-[#16271e] px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0 ml-2">
              Post
            </span>
          </button>
        </div>

        {/* Quick action buttons row */}
        <div className="flex items-center justify-between border-t border-[#1a2e22] mt-2.5 pt-2 px-0.5">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                handleSelectType("big_win");
                setIsExpanded(true);
                setTimeout(() => textareaRef.current?.focus(), 50);
              }}
              className="flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-950/40 transition"
            >
              <Trophy size={13} className="text-amber-400" />
              <span className="text-[11px] sm:text-xs">Big Win</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  handleSelectType("drop_code");
                  setIsExpanded(true);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                className="flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-medium text-teal-300 hover:bg-teal-950/40 transition"
              >
                <Gift size={13} className="text-teal-400" />
                <span className="text-[11px] sm:text-xs">Drop Code</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsExpanded(true);
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              className="flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-medium text-[#8ca892] hover:bg-[#182a1f] hover:text-emerald-300 transition"
            >
              <ImageIcon size={13} />
              <span className="text-[11px] sm:text-xs">Media</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsExpanded(true);
              setTimeout(() => textareaRef.current?.focus(), 50);
            }}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition pr-1"
          >
            Create ✍️
          </button>
        </div>
      </div>
    );
  }

  // Expanded state: full composer with focus
  return (
    <div className="rounded-2xl border border-emerald-600/40 bg-[#122018] p-3.5 sm:p-5 shadow-lg backdrop-blur animate-in fade-in zoom-in-95 duration-150">
      {/* Post Type Selector & Minimize Button */}
      <div className="flex items-center justify-between border-b border-[#1f3527] pb-2.5 sm:pb-3 mb-3">
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => handleSelectType("discussion")}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition ${
              type === "discussion"
                ? "bg-[#274433] text-white border border-emerald-500/30"
                : "text-[#859d8b] hover:text-white hover:bg-[#18291f]"
            }`}
          >
            <MessageSquare size={13} />
            Discussion
          </button>

          <button
            type="button"
            onClick={() => handleSelectType("big_win")}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition ${
              type === "big_win"
                ? "bg-amber-950/60 text-amber-200 border border-amber-600/40"
                : "text-[#859d8b] hover:text-white hover:bg-[#18291f]"
            }`}
          >
            <Trophy size={13} className="text-amber-400" />
            Big Win
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleSelectType("drop_code")}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition ${
                type === "drop_code"
                  ? "bg-teal-950/60 text-teal-200 border border-teal-600/40"
                  : "text-[#859d8b] hover:text-white hover:bg-[#18291f]"
              }`}
            >
              <Gift size={13} className="text-teal-400" />
              Bonus Drop
            </button>
          )}
        </div>

        {/* Minimize / Cancel Button */}
        <button
          type="button"
          onClick={() => {
            if (!content.trim() || window.confirm("Discard post draft?")) {
              setContent("");
              setSelectedTags([]);
              setSelectedCasinoId("");
              setWinAmount("");
              setMultiplier("");
              setDropCode("");
              setTargetUrl("");
              handleRemoveMedia();
              setShowUrlInput(false);
              setIsExpanded(false);
            }
          }}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#78937e] hover:bg-[#192b20] hover:text-white transition shrink-0 ml-2"
          title="Minimize post composer"
        >
          <X size={14} />
          <span className="hidden sm:inline">Cancel</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Conditional Extra Inputs for Big Win or Drop Code */}
        {type === "big_win" && (
          <div className="grid grid-cols-2 gap-2.5 animate-in fade-in duration-200">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-amber-300">
                Win Amount
              </label>
              <input
                type="text"
                value={winAmount}
                onChange={(e) => setWinAmount(e.target.value)}
                placeholder="e.g. 250 SC, $500"
                className="h-9 w-full rounded-lg border border-amber-800/40 bg-[#0e1712] px-3 text-xs text-white placeholder-[#5a6e60] outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-amber-300">
                Multiplier
              </label>
              <input
                type="text"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
                placeholder="e.g. 500x"
                className="h-9 w-full rounded-lg border border-amber-800/40 bg-[#0e1712] px-3 text-xs text-white placeholder-[#5a6e60] outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {type === "drop_code" && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            {/* Associated Casino (Required for Bonus Drops) */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-teal-300">
                Associated Casino *
              </label>
              <select
                required
                value={selectedCasinoId}
                onChange={(e) => {
                  setSelectedCasinoId(e.target.value);
                  setError("");
                }}
                className="h-9 w-full rounded-lg border border-teal-800/40 bg-[#0e1712] px-3 text-xs text-white outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="" disabled>-- Select Casino (Required) --</option>
                <option value="universal">🌐 All Casinos (Universal Drop)</option>
                {supportedCasinosList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-teal-300">
                Promo / Drop Code
              </label>
              <input
                type="text"
                value={dropCode}
                onChange={(e) => setDropCode(e.target.value)}
                placeholder="e.g. CROWN25DROP"
                className="h-9 w-full font-mono rounded-lg border border-teal-800/40 bg-[#0e1712] px-3 text-xs text-white uppercase placeholder-[#5a6e60] outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-teal-300">
                Destination URL (optional)
              </label>
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://... (opens on card click or Claim Bonus)"
                className="h-9 w-full rounded-lg border border-teal-800/40 bg-[#0e1712] px-3 text-xs text-white placeholder-[#5a6e60] outline-none focus:border-teal-500"
              />
            </div>
          </div>
        )}

        {/* Text Area */}
        <div className="flex gap-2.5 sm:gap-3">
          {currentUserAvatar ? (
            <img
              src={currentUserAvatar}
              alt={currentUserName || "Avatar"}
              className="hidden sm:block h-9 w-9 rounded-full object-cover border border-emerald-500/40 shrink-0 mt-1"
            />
          ) : (
            <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-xs font-bold text-white shrink-0 mt-1">
              {(currentUserName || "U").slice(0, 2).toUpperCase()}
            </div>
          )}
          <textarea
            ref={textareaRef}
            autoFocus
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              type === "big_win"
                ? "Tell the community about your hit! Which slot? Base game or bonus round?"
                : type === "drop_code"
                ? "Where did you find this drop? How many SC/GC is it worth?"
                : "Share bonus strategies, ask a question, or talk slots..."
            }
            className="w-full rounded-xl border border-[#274230] bg-[#0d1611] p-3 text-xs sm:text-sm text-white placeholder-[#5c7261] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Media Preview (Photo, Video, or Link) */}
        {mediaUrl && (
          <div className="relative mt-2 overflow-hidden rounded-xl border border-emerald-500/30 bg-black/40 p-1">
            {mediaType === "video" ? (
              <video
                src={mediaUrl}
                controls
                className="max-h-64 w-full rounded-lg object-contain"
              />
            ) : mediaType === "image" ? (
              <img
                src={mediaUrl}
                alt="Attachment preview"
                className="max-h-64 w-full rounded-lg object-contain"
              />
            ) : (
              <div className="flex items-center gap-2 p-2.5 text-xs text-emerald-300">
                <LinkIcon size={16} className="text-emerald-400 shrink-0" />
                <span className="truncate flex-1 font-mono text-[11px] text-white">{mediaUrl}</span>
                <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700/50 text-emerald-400 shrink-0 mr-8">
                  Link attached
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handleRemoveMedia}
              className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-red-600"
              title="Remove media"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Media URL Input Box (if toggled) */}
        {showUrlInput && !mediaUrl && (
          <div className="flex gap-2 animate-in fade-in duration-150">
            <input
              type="url"
              placeholder="Paste image, video, or bonus link URL..."
              onChange={(e) => {
                const val = e.target.value.trim();
                setMediaUrl(val);
                if (val.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
                  setMediaType("video");
                } else if (val.match(/\.(png|jpg|jpeg|gif|webp|svg|avif)(\?.*)?$/i) || val.startsWith("data:image/")) {
                  setMediaType("image");
                } else {
                  setMediaType("link");
                }
              }}
              className="flex-1 rounded-lg border border-[#274230] bg-[#0e1913] px-3 py-1.5 text-xs text-white placeholder-[#5c7261] outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowUrlInput(false)}
              className="rounded-lg bg-[#18291f] px-2.5 text-xs text-[#829c88] hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*"
          className="hidden"
        />

        {/* Bottom Bar: Tags Selector + Media buttons + Submit Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#1a2e21]">
          {/* Tags section */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-semibold text-[#829c88]">Tags:</span>

            {/* Selected Tag Badges with remove buttons */}
            {selectedTags.map((tag) => (
              <div key={tag} className="inline-flex items-center gap-1">
                <TagBadge tag={tag} size="sm" />
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="rounded-full p-0.5 text-[#829c88] hover:bg-[#274433] hover:text-white transition"
                  title="Remove tag"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* Dropdown to add tags */}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddTag(e.target.value);
                }
              }}
              className="rounded-lg border border-[#274230] bg-[#0e1913] px-2.5 py-1 text-xs font-medium text-[#e1ece0] outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="" disabled className="bg-[#122018] text-[#8ca592]">
                {selectedTags.length === 0 ? "+ Add Tag" : "+ Add Tag..."}
              </option>
              <optgroup label="Categories" className="bg-[#122018] text-emerald-400 font-bold">
                {CATEGORY_TAGS.filter((cat) => !selectedTags.includes(cat.id)).map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#122018] text-white font-normal">
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Social Casinos" className="bg-[#122018] text-emerald-400 font-bold">
                {CASINO_TAGS.filter((cas) => !selectedTags.includes(cas.id)).map((cas) => (
                  <option key={cas.id} value={cas.id} className="bg-[#122018] text-white font-normal">
                    {cas.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Action Row: Media Attachment & Submit */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1 sm:pt-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[#8ca892] transition hover:bg-[#182a1f] hover:text-emerald-300"
                title="Attach photo or video"
              >
                <ImageIcon size={14} />
                <span className="text-[11px] sm:text-xs">Photo/Video</span>
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[#8ca892] transition hover:bg-[#182a1f] hover:text-teal-300"
                title="Add media by URL"
              >
                <LinkIcon size={13} />
                <span className="text-[11px] sm:text-xs">URL</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Posting...
                </>
              ) : (
                <>
                  <Send size={13} /> Post
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg p-2">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
