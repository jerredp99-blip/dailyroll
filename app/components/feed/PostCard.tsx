"use client";

import { useState, useRef, useEffect } from "react";
import {
  Heart,
  MessageSquare,
  Copy,
  Check,
  Trophy,
  Gift,
  Zap,
  Send,
  Loader2,
  MoreHorizontal,
  Edit3,
  Trash2,
  X,
  CheckCheck,
  ExternalLink,
} from "lucide-react";
import { TagBadge } from "@/app/components/feed/TagBadge";
import { CATEGORY_TAGS, CASINO_TAGS } from "@/lib/casino-tags";
import type { Post, Comment } from "@/lib/store";

const EMOJI_OPTIONS = ["🔥", "🎰", "💎", "🚀"];

function cleanDomain(urlStr: string) {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return urlStr;
  }
}

function renderFormattedContent(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 break-all transition"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function PostCard({
  post,
  currentUserEmail,
  isAdmin,
  onSelectTag,
  onPostUpdated,
  onPostDeleted,
  isMenuOpen,
  onToggleMenu,
}: {
  post: Post;
  currentUserEmail?: string;
  isAdmin?: boolean;
  onSelectTag?: (tag: string) => void;
  onPostUpdated?: (post: Post) => void;
  onPostDeleted?: (postId: string) => void;
  isMenuOpen?: boolean;
  onToggleMenu?: (open: boolean) => void;
}) {
  const [currentPost, setCurrentPost] = useState<Post>(post);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Edit / Delete State
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editCasinoTag, setEditCasinoTag] = useState(post.casinoTag || "");
  const [editTags, setEditTags] = useState<string[]>(
    post.tags && post.tags.length > 0
      ? post.tags
      : post.casinoTag
      ? [post.casinoTag]
      : []
  );
  const [editWinAmount, setEditWinAmount] = useState(post.winAmount || "");
  const [editMultiplier, setEditMultiplier] = useState(post.multiplier || "");
  const [editDropCode, setEditDropCode] = useState(post.dropCode || "");
  const [editMediaUrl, setEditMediaUrl] = useState(post.mediaUrl || "");
  const [mediaError, setMediaError] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [internalShowMenu, setInternalShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleAddEditTag = (val: string) => {
    if (!val) return;
    const upper = val.trim().toUpperCase();
    if (!editTags.includes(upper)) {
      setEditTags((prev) => [...prev, upper]);
    }
  };

  const handleRemoveEditTag = (tagToRemove: string) => {
    setEditTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const isMenuVisible = isMenuOpen !== undefined ? isMenuOpen : internalShowMenu;
  const setMenuVisible = (open: boolean) => {
    if (onToggleMenu) {
      onToggleMenu(open);
    } else {
      setInternalShowMenu(open);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuVisible) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuVisible(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuVisible]);

  const isAuthor = Boolean(
    currentUserEmail &&
      currentPost.authorEmail &&
      currentUserEmail.trim().toLowerCase() === currentPost.authorEmail.trim().toLowerCase()
  );

  const canManage = Boolean(isAdmin || isAuthor);

  const hasLiked = currentUserEmail
    ? currentPost.likes?.includes(currentUserEmail.toLowerCase())
    : false;

  const handleToggleLike = async () => {
    try {
      const res = await fetch(`/api/posts/${currentPost.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: currentUserEmail }),
      });
      const data = await res.json();
      if (data.success && data.post) {
        setCurrentPost(data.post);
        onPostUpdated?.(data.post);
      }
    } catch (err) {
      console.error("Failed to like post", err);
    }
  };

  const handleAddReaction = async (emoji: string) => {
    try {
      const res = await fetch(`/api/posts/${currentPost.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji, userEmail: currentUserEmail }),
      });
      const data = await res.json();
      if (data.success && data.post) {
        setCurrentPost(data.post);
        onPostUpdated?.(data.post);
      }
    } catch (err) {
      console.error("Failed to react to post", err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    setEditError("");

    try {
      const res = await fetch(`/api/posts/${currentPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editContent.trim(),
          tags: editTags,
          casinoTag: editTags[0] || undefined,
          winAmount: editWinAmount ? editWinAmount.trim() : undefined,
          multiplier: editMultiplier ? editMultiplier.trim() : undefined,
          dropCode: editDropCode ? editDropCode.trim().toUpperCase() : undefined,
          mediaUrl: editMediaUrl ? editMediaUrl.trim() : undefined,
          mediaType: editMediaUrl
            ? editMediaUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i)
              ? "video"
              : editMediaUrl.match(/\.(png|jpg|jpeg|gif|webp|svg|avif)(\?.*)?$/i) || editMediaUrl.startsWith("data:image/")
              ? "image"
              : "link"
            : undefined,
          authorEmail: currentUserEmail,
          isAdmin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save changes");
      }

      setCurrentPost(data.post);
      setMediaError(false);
      onPostUpdated?.(data.post);
      setIsEditing(false);
      setMenuVisible(false);
    } catch (err: any) {
      setEditError(err.message || "Failed to update post");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePost = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/posts/${currentPost.id}?authorEmail=${encodeURIComponent(
          currentUserEmail || ""
        )}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete post");
      }

      onPostDeleted?.(currentPost.id);
    } catch (err: any) {
      alert(err.message || "Failed to delete post");
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await fetch(`/api/posts/${currentPost.id}/comments`);
        const data = await res.json();
        if (data.success) {
          setComments(data.comments || []);
        }
      } catch (err) {
        console.error("Failed to fetch comments", err);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/posts/${currentPost.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          authorEmail: currentUserEmail,
        }),
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setComments((prev) => [...prev, data.comment]);
        const updated = {
          ...currentPost,
          commentCount: (currentPost.commentCount || 0) + 1,
        };
        setCurrentPost(updated);
        onPostUpdated?.(updated);
        setNewComment("");
      }
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <article className="rounded-2xl border border-[#22392b] bg-[#121f17]/90 p-3.5 sm:p-5 shadow-sm backdrop-blur transition hover:border-[#32543d]">
      {/* Header: Author + Timestamp + Menu Button */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Author Avatar or Initials */}
          {currentPost.authorAvatar ? (
            <img
              src={currentPost.authorAvatar}
              alt={currentPost.authorName}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover border border-emerald-500/40 shadow-sm shrink-0"
            />
          ) : (
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-xs sm:text-sm font-bold text-white shadow-sm shrink-0">
              {currentPost.authorName.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5 truncate">
              <span className="text-xs sm:text-sm font-semibold text-[#edf5ec] truncate">
                {currentPost.authorName}
              </span>
              <span className="text-[11px] text-[#718776] shrink-0">
                • {timeAgo(currentPost.createdAt)}
                {currentPost.updatedAt && (
                  <span className="ml-1 text-[10px] text-emerald-400/80">(edited)</span>
                )}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#869f8c] truncate">
              @{currentPost.authorEmail.split("@")[0]}
            </p>
          </div>
        </div>

        {/* Edit / Delete Menu for Author or Admin */}
        {canManage && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuVisible(!isMenuVisible)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                isMenuVisible
                  ? "bg-[#192b20] text-emerald-400"
                  : "text-[#829c88] hover:bg-[#192b20] hover:text-white"
              }`}
              title="Post options"
            >
              <MoreHorizontal size={16} />
            </button>

            {isMenuVisible && (
              <div className="absolute right-0 top-9 z-20 w-36 rounded-xl border border-[#2b4835] bg-[#0f1b14] p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setEditContent(currentPost.content);
                    setEditTags(
                      currentPost.tags && currentPost.tags.length > 0
                        ? currentPost.tags
                        : currentPost.casinoTag
                        ? [currentPost.casinoTag]
                        : []
                    );
                    setEditWinAmount(currentPost.winAmount || "");
                    setEditMultiplier(currentPost.multiplier || "");
                    setEditDropCode(currentPost.dropCode || "");
                    setEditMediaUrl(currentPost.mediaUrl || "");
                    setMenuVisible(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#cbe0d0] hover:bg-[#1a2f22] hover:text-white"
                >
                  <Edit3 size={13} className="text-emerald-400" />
                  <span>Edit Post</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(true);
                    setMenuVisible(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-950/40 hover:text-red-200"
                >
                  <Trash2 size={13} className="text-red-400" />
                  <span>Delete Post</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tag Badges: Dedicated clean row for mobile and desktop */}
      {((currentPost.tags && currentPost.tags.length > 0) || currentPost.casinoTag) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {(currentPost.tags && currentPost.tags.length > 0
            ? currentPost.tags
            : currentPost.casinoTag
            ? [currentPost.casinoTag]
            : []
          ).map((t) => (
            <TagBadge
              key={t}
              tag={t}
              onClick={() => onSelectTag?.(t)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="mt-3 rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-xs animate-in fade-in duration-200">
          <p className="font-semibold text-red-200 mb-2">
            Are you sure you want to permanently delete this post?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeletePost}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              <span>Yes, Delete</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg bg-[#1a2e22] px-3 py-1.5 text-xs font-semibold text-[#8ca892] hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inline Editing Mode */}
      {isEditing ? (
        <div className="mt-3 space-y-3 rounded-xl border border-emerald-500/30 bg-[#0d1611] p-3 animate-in fade-in duration-200">
          <textarea
            rows={3}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full rounded-lg border border-[#274230] bg-[#122018] p-2.5 text-xs text-white placeholder-[#5c7261] outline-none focus:border-emerald-500"
            placeholder="Edit your post..."
          />

          {currentPost.type === "big_win" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={editWinAmount}
                onChange={(e) => setEditWinAmount(e.target.value)}
                placeholder="Win Amount (e.g. 250 SC)"
                className="h-8 rounded-lg border border-[#274230] bg-[#122018] px-2.5 text-xs text-white outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={editMultiplier}
                onChange={(e) => setEditMultiplier(e.target.value)}
                placeholder="Multiplier (e.g. 500x)"
                className="h-8 rounded-lg border border-[#274230] bg-[#122018] px-2.5 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>
          )}

          {currentPost.type === "drop_code" && (
            <input
              type="text"
              value={editDropCode}
              onChange={(e) => setEditDropCode(e.target.value)}
              placeholder="Drop Code"
              className="h-8 w-full rounded-lg border border-[#274230] bg-[#122018] px-2.5 text-xs font-mono uppercase text-teal-300 outline-none focus:border-teal-500"
            />
          )}

          {/* Tag Selector in Edit Mode */}
          {/* Tags Selector in Edit Mode */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-[#8ca592]">Tags:</span>
            {editTags.map((tag) => (
              <div key={tag} className="inline-flex items-center gap-1">
                <TagBadge tag={tag} size="sm" />
                <button
                  type="button"
                  onClick={() => handleRemoveEditTag(tag)}
                  className="rounded-full p-0.5 text-[#829c88] hover:bg-[#274433] hover:text-white transition"
                  title="Remove tag"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddEditTag(e.target.value);
                }
              }}
              className="h-8 rounded-lg border border-[#274230] bg-[#122018] px-2.5 text-xs text-[#e1ece0] outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="" disabled className="bg-[#122018] text-[#8ca592]">
                {editTags.length === 0 ? "+ Add Tag..." : "+ Add Another Tag..."}
              </option>
              <optgroup label="Categories" className="bg-[#122018] text-emerald-400 font-bold">
                {CATEGORY_TAGS.filter((cat) => !editTags.includes(cat.id)).map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#122018] text-white">
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Social Casinos" className="bg-[#122018] text-emerald-400 font-bold">
                {CASINO_TAGS.filter((cas) => !editTags.includes(cas.id)).map((cas) => (
                  <option key={cas.id} value={cas.id} className="bg-[#122018] text-white">
                    {cas.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Media / Link URL in Edit Mode */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#8ca592]">
              Attached Link or Media URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={editMediaUrl}
                onChange={(e) => setEditMediaUrl(e.target.value)}
                placeholder="Paste link or image URL..."
                className="h-8 flex-1 rounded-lg border border-[#274230] bg-[#122018] px-2.5 text-xs text-white placeholder-[#5c7261] outline-none focus:border-emerald-500"
              />
              {editMediaUrl && (
                <button
                  type="button"
                  onClick={() => setEditMediaUrl("")}
                  className="rounded-lg bg-[#1a2d21] px-2.5 text-xs text-red-300 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {editError && <p className="text-[11px] text-red-400">{editError}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg bg-[#182a1f] px-3 py-1.5 text-xs text-[#8ca892] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!editContent.trim() || savingEdit}
              onClick={handleSaveEdit}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {savingEdit ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCheck size={12} />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Special Badges (Big Win, Drop Code, Daily Claim) */}
          {currentPost.type === "big_win" && (
            <div className="mt-3.5 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 to-yellow-950/20 px-3.5 py-2 text-xs">
              <div className="flex items-center gap-1 font-bold text-amber-300">
                <Trophy size={14} className="text-amber-400" />
                <span>BIG WIN FLEX</span>
              </div>
              {currentPost.winAmount && (
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 font-mono font-bold text-amber-200">
                  {currentPost.winAmount}
                </span>
              )}
              {currentPost.multiplier && (
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-mono font-bold text-emerald-300">
                  {currentPost.multiplier}
                </span>
              )}
            </div>
          )}

          {currentPost.type === "drop_code" && currentPost.dropCode && (
            <div className="mt-3.5 flex items-center justify-between gap-3 rounded-xl border border-teal-500/40 bg-teal-950/30 p-3">
              <div className="flex items-center gap-2">
                <Gift size={16} className="text-teal-400" />
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-teal-300">
                    Active Drop Code
                  </p>
                  <p className="font-mono text-sm font-bold tracking-wider text-white">
                    {currentPost.dropCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(currentPost.dropCode!)}
                className="flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-800/40 px-3 py-1.5 text-xs font-semibold text-teal-200 transition hover:bg-teal-700/50"
              >
                {copiedCode ? (
                  <>
                    <Check size={13} className="text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={13} /> Copy
                  </>
                )}
              </button>
            </div>
          )}

          {currentPost.type === "daily_claim" && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-300 font-medium">
              <Zap size={14} className="text-emerald-400" />
              <span>Daily Roll Check-in Completed</span>
            </div>
          )}

          {/* Main Content */}
          <p className="mt-3 text-sm leading-relaxed text-[#d7e4d8] whitespace-pre-wrap">
            {renderFormattedContent(currentPost.content)}
          </p>

          {/* Attached Media (Photo, Video, or Link Preview Card) */}
          {currentPost.mediaUrl && (
            <>
              {currentPost.mediaType === "video" ||
              currentPost.mediaUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-[#243d2e] bg-black/40">
                  <video
                    src={currentPost.mediaUrl}
                    controls
                    playsInline
                    className="max-h-80 sm:max-h-96 w-full object-contain"
                  />
                </div>
              ) : (currentPost.mediaUrl.match(/\.(png|jpg|jpeg|gif|webp|svg|avif)(\?.*)?$/i) ||
                  currentPost.mediaUrl.startsWith("data:image/")) &&
                !mediaError ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-[#243d2e] bg-black/40">
                  <img
                    src={currentPost.mediaUrl}
                    alt="Post attachment"
                    onError={() => setMediaError(true)}
                    className="max-h-80 sm:max-h-96 w-full object-contain transition hover:opacity-95"
                  />
                </div>
              ) : (
                <a
                  href={currentPost.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-600/40 bg-[#0f1d15] p-3 text-xs transition hover:border-emerald-500 hover:bg-[#14261c] group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 shrink-0">
                      <ExternalLink size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white group-hover:text-emerald-300 truncate">
                        {cleanDomain(currentPost.mediaUrl)}
                      </p>
                      <p className="text-[11px] text-[#718c77] truncate">{currentPost.mediaUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 shrink-0">
                    <span>Visit Link</span>
                    <ExternalLink size={13} />
                  </div>
                </a>
              )}
            </>
          )}
        </>
      )}

      {/* Social Interactions Bar */}
      <div className="mt-3.5 flex items-center justify-between border-t border-[#1d3224] pt-2.5 sm:pt-3 gap-2 text-xs">
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          {/* Like button */}
          <button
            type="button"
            onClick={handleToggleLike}
            className={`flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1.5 transition text-xs shrink-0 ${
              hasLiked
                ? "bg-red-950/40 text-red-400 font-semibold border border-red-800/40"
                : "text-[#869f8c] hover:bg-[#182a1f] hover:text-white"
            }`}
          >
            <Heart size={14} className={hasLiked ? "fill-red-400" : ""} />
            <span className="font-semibold text-[11px] sm:text-xs">{currentPost.likes?.length || 0}</span>
          </button>

          {/* Emoji Reactions - Enforces Single Reaction */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {EMOJI_OPTIONS.map((emoji) => {
              const count = currentPost.reactions?.[emoji]?.length || 0;
              const userReacted = currentUserEmail
                ? currentPost.reactions?.[emoji]?.includes(currentUserEmail.toLowerCase())
                : false;

              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleAddReaction(emoji)}
                  className={`flex items-center gap-0.5 sm:gap-1 rounded-lg px-1.5 sm:px-2 py-1 transition text-xs shrink-0 ${
                    userReacted
                      ? "bg-emerald-900/60 border border-emerald-500 font-bold scale-105"
                      : count > 0
                      ? "bg-[#18291f] text-[#c0d4c3] hover:bg-[#1f3629]"
                      : "opacity-60 hover:opacity-100 hover:bg-[#18291f]"
                  }`}
                  title={userReacted ? `Remove ${emoji}` : `React with ${emoji} (single reaction)`}
                >
                  <span className="text-xs sm:text-sm">{emoji}</span>
                  {count > 0 && <span className="font-semibold text-[10px] sm:text-[11px]">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comment toggle button */}
        <button
          type="button"
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-xs text-[#869f8c] transition hover:bg-[#182a1f] hover:text-[#d3e5d5] shrink-0 ml-auto"
        >
          <MessageSquare size={14} />
          <span className="font-semibold text-[11px] sm:text-xs">{currentPost.commentCount || 0}</span>
          <span className="hidden sm:inline">Comments</span>
        </button>
      </div>

      {/* Expanded Comments Thread */}
      {showComments && (
        <div className="mt-3 border-t border-[#1d3224] pt-3 space-y-3 animate-in fade-in duration-200">
          {loadingComments ? (
            <div className="flex items-center justify-center py-4 text-xs text-[#7f9883]">
              <Loader2 size={16} className="animate-spin mr-2" /> Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center py-2 text-xs text-[#7f9883]">
              No comments yet. Be the first to join the conversation!
            </p>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl border border-[#233a2c] bg-[#0f1913] p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-emerald-300">
                      {comment.authorName}
                    </span>
                    <span className="text-[10px] text-[#6e8574]">
                      {timeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-[#c7d8c9]">{comment.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Comment input form */}
          <form onSubmit={handleSendComment} className="flex gap-2 pt-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 rounded-xl border border-[#263e2f] bg-[#0d1611] px-3 py-2 text-xs text-white placeholder-[#5e7463] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submittingComment}
              className="flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
            >
              {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
