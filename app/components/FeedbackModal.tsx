"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Loader2, CheckCircle2 } from "lucide-react";

export function FeedbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      const metadata = {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        pathname: window.location.pathname,
        timestamp: new Date().toISOString(),
      };
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), metadata }),
      });
      if (!res.ok) throw new Error("Failed to send feedback");
      setSent(true);
      setMessage("");
      setTimeout(() => {
        setSent(false);
        setIsOpen(false);
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Failed to send feedback. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 rounded-full bg-zinc-900/90 border border-zinc-700 hover:border-emerald-500/50 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white shadow-lg shadow-black/50 backdrop-blur-md transition-all duration-200 cursor-pointer hover:shadow-[0_0_16px_rgba(16,185,129,0.2)] active:scale-95"
        aria-label="Send Feedback"
        title="Report a bug or send feedback"
      >
        <MessageCircle size={14} className="text-emerald-400" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-emerald-500/20 bg-[#121c17] text-gray-100 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-emerald-900/40 bg-[#15231c] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <MessageCircle size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-emerald-300">Send Feedback</h3>
                  <p className="text-[11px] text-gray-400">Report a bug or share an idea</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setError("");
                  setSent(false);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {sent ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-300">Thanks for your feedback!</p>
                  <p className="text-xs text-zinc-400">We'll review it shortly.</p>
                </div>
              ) : (
                <>
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe the bug or share your idea..."
                    rows={4}
                    maxLength={2000}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-emerald-500/60 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-zinc-600">
                      Device info will be included automatically
                    </p>
                    <span className="text-[10px] text-zinc-600">{message.length}/2000</span>
                  </div>
                  {error && (
                    <p className="text-xs text-rose-400 font-medium">{error}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={sending || !message.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 transition-all active:scale-95 cursor-pointer"
                  >
                    {sending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    {sending ? "Sending..." : "Send Feedback"}
                  </button>
                  <p className="text-[10px] text-zinc-600 text-center">
                    Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">⌘</kbd>+<kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">↵</kbd> to send
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
