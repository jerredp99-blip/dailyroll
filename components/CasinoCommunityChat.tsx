"use client";

import { useState, useEffect } from "react";
import { Send, MessageSquare, User, Loader2, Sparkles } from "lucide-react";
import type { Comment } from "@/lib/store";
import type { Casino } from "@/types/casino";

function formatRelativeTime(dateString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateString).toLocaleDateString();
  } catch {
    return "recently";
  }
}

export function CasinoCommunityChat({ casino }: { casino: Casino }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newContent, setNewContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadComments() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/casinos/${encodeURIComponent(casino.id)}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch (err) {
        console.error("Failed to load casino comments:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadComments();
  }, [casino.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newContent.trim();
    if (!content) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    // Optimistic comment
    const tempId = "temp-" + Date.now();
    const optimisticComment: Comment = {
      id: tempId,
      postId: `casino:${casino.id}`,
      authorId: "me",
      authorName: "You",
      authorEmail: "",
      content,
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [...prev, optimisticComment]);
    setNewContent("");

    try {
      const res = await fetch(`/api/casinos/${encodeURIComponent(casino.id)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to post message");
      }

      // Replace optimistic comment with real server comment
      setComments((prev) => prev.map((c) => (c.id === tempId ? data.comment : c)));
    } catch (err: unknown) {
      console.error("Comment submit error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to post message");
      // Revert optimistic
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header / Context note */}
      <div className="rounded-xl border border-emerald-900/50 bg-[#0d1712] p-3.5 text-xs text-gray-400 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-emerald-300 font-semibold">
          <MessageSquare size={16} />
          <span>{casino.name} Discussion & Community Tips</span>
        </div>
        <span className="text-[11px] text-gray-400">
          {comments.length} {comments.length === 1 ? "message" : "messages"}
        </span>
      </div>

      {/* Message List */}
      <div className="min-h-[220px] max-h-[480px] overflow-y-auto space-y-2.5 rounded-xl border border-emerald-950/80 bg-[#09110d] p-3 sm:p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-2" />
            <p className="text-xs text-gray-400">Loading discussion...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-950/60 text-emerald-400 mb-2 border border-emerald-800/40">
              <Sparkles size={18} />
            </div>
            <p className="text-sm font-semibold text-gray-300">No messages yet!</p>
            <p className="text-xs text-gray-400 max-w-xs mt-1">
              Be the first to share slot tips, redemption times, or ask a question about {casino.name}.
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="flex items-start gap-2.5 rounded-xl border border-emerald-900/30 bg-[#0e1913] p-3 transition hover:border-emerald-800/50"
            >
              {comment.authorAvatar ? (
                <img
                  src={comment.authorAvatar}
                  alt={comment.authorName}
                  className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-emerald-500/40"
                />
              ) : (
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-900/70 text-[11px] font-bold text-emerald-300">
                  {comment.authorName.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-300 truncate">
                    {comment.authorName}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-200 leading-relaxed break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmit} className="relative">
        {errorMsg && (
          <div className="mb-2 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-1.5 text-xs text-red-300">
            {errorMsg}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-xl border border-emerald-800/60 bg-[#0e1913] p-1.5 focus-within:border-emerald-500">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={`Share tips or ask about ${casino.name}...`}
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newContent.trim()}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[#39ff6a] px-3.5 py-1.5 text-xs font-bold text-[#0d1712] hover:bg-[#5aff84] transition disabled:opacity-40 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <>
                <span>Post</span>
                <Send size={12} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CasinoCommunityChat;

