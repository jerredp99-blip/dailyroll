"use client";

import { useState, useRef } from "react";
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

export function PostComposer({
  currentUserEmail,
  currentUserName,
  currentUserAvatar,
  onPostCreated,
}: {
  currentUserEmail?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onPostCreated: (post: Post) => void;
}) {
  const [type, setType] = useState<PostType>("discussion");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [winAmount, setWinAmount] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [dropCode, setDropCode] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | undefined>(undefined);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          casinoTag: selectedTags[0] || undefined,
          tags: selectedTags,
          type,
          winAmount: type === "big_win" ? winAmount : undefined,
          multiplier: type === "big_win" ? multiplier : undefined,
          dropCode: type === "drop_code" ? dropCode : undefined,
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
      setWinAmount("");
      setMultiplier("");
      setDropCode("");
      handleRemoveMedia();
      setShowUrlInput(false);
    } catch (err: any) {
      setError(err.message || "Failed to post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#243d2e] bg-[#122018]/95 p-4 sm:p-5 shadow-sm backdrop-blur">
      {/* Post Type Selector */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#1f3527] pb-3 mb-3.5">
        <button
          type="button"
          onClick={() => handleSelectType("discussion")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
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
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            type === "big_win"
              ? "bg-amber-950/60 text-amber-200 border border-amber-600/40"
              : "text-[#859d8b] hover:text-white hover:bg-[#18291f]"
          }`}
        >
          <Trophy size={13} className="text-amber-400" />
          Flex Big Win
        </button>

        <button
          type="button"
          onClick={() => handleSelectType("drop_code")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            type === "drop_code"
              ? "bg-teal-950/60 text-teal-200 border border-teal-600/40"
              : "text-[#859d8b] hover:text-white hover:bg-[#18291f]"
          }`}
        >
          <Gift size={13} className="text-teal-400" />
          Drop Code
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
          <div className="animate-in fade-in duration-200">
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
        )}

        {/* Text Area */}
        <div className="flex gap-3">
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
            className="w-full rounded-xl border border-[#274230] bg-[#0d1611] p-3 text-sm text-white placeholder-[#5c7261] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Media Preview (Photo or Video) */}
        {mediaUrl && (
          <div className="relative mt-2 overflow-hidden rounded-xl border border-emerald-500/30 bg-black/40 p-1">
            {mediaType === "video" ? (
              <video
                src={mediaUrl}
                controls
                className="max-h-64 w-full rounded-lg object-contain"
              />
            ) : (
              <img
                src={mediaUrl}
                alt="Attachment preview"
                className="max-h-64 w-full rounded-lg object-contain"
              />
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
              placeholder="Paste image or video URL (e.g. https://.../image.png or .mp4)"
              onChange={(e) => {
                const val = e.target.value.trim();
                setMediaUrl(val);
                if (val.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
                  setMediaType("video");
                } else {
                  setMediaType("image");
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
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
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
                {selectedTags.length === 0 ? "+ Add Tag" : "+ Add Another Tag..."}
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

          <div className="flex items-center gap-3">
            {/* Media Upload Buttons */}
            <div className="flex items-center gap-1 border-l border-[#1f3527] pl-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#8ca892] transition hover:bg-[#182a1f] hover:text-emerald-300"
                title="Attach photo or video"
              >
                <ImageIcon size={15} />
                <span className="hidden sm:inline">Photo/Video</span>
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#8ca892] transition hover:bg-[#182a1f] hover:text-teal-300"
                title="Add media by URL"
              >
                <LinkIcon size={14} />
                <span className="hidden sm:inline">URL</span>
              </button>
            </div>
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

        {error && (
          <p className="text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg p-2">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
