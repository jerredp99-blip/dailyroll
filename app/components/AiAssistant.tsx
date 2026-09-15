"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  Wand2,
  Check,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

export function GeminiLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gemini-bubble-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1BA1E3" />
          <stop offset="35%" stopColor="#5460E6" />
          <stop offset="70%" stopColor="#9B72CB" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
      </defs>
      <path
        d="M11.04 19.32Q12 21.6 12 24q0-2.4.96-4.68.96-2.28 2.58-3.9 1.62-1.62 3.9-2.58Q21.6 12 24 12q-2.4 0-4.56-.96-2.28-.96-3.9-2.58-1.62-1.62-2.58-3.9Q12 2.4 12 0q0 2.4-.96 4.56-.96 2.28-2.58 3.9-1.62 1.62-3.9 2.58Q2.4 12 0 12q2.4 0 4.56.96 2.28.96 3.9 2.58 1.62 1.62 2.58 3.9Z"
        fill="url(#gemini-bubble-gradient)"
      />
    </svg>
  );
}

export function AiAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"advisor" | "extract">("advisor");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Key Configuration State
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean | null>(null);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [keySuccess, setKeySuccess] = useState("");

  // Free Tier Quota State
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const [quotaMessage, setQuotaMessage] = useState<string | null>(null);

  // Check key and quota status on mount/open
  useEffect(() => {
    async function checkKeyAndQuota() {
      try {
        const [keyRes, quotaRes] = await Promise.all([
          fetch("/api/ai/configure-key"),
          fetch("/api/ai/bonus-assistant"),
        ]);
        const keyData = await keyRes.json();
        const quotaData = await quotaRes.json();
        setIsKeyConfigured(Boolean(keyData.configured));
        if (typeof quotaData.remainingToday === "number") {
          setRemainingToday(quotaData.remainingToday);
        }
      } catch {
        setIsKeyConfigured(false);
      }
    }
    checkKeyAndQuota();
  }, [isOpen]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("dailyroll_open_ai_assistant", handleOpen);
    return () => window.removeEventListener("dailyroll_open_ai_assistant", handleOpen);
  }, []);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim() || savingKey) return;

    setSavingKey(true);
    setKeyError("");
    setKeySuccess("");

    try {
      const res = await fetch("/api/ai/configure-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to validate API key");
      }

      setIsKeyConfigured(true);
      setKeySuccess("Gemini API key verified and saved!");
      setApiKeyInput("");
      setTimeout(() => {
        setShowKeyConfig(false);
        setKeySuccess("");
      }, 2000);
    } catch (err: any) {
      setKeyError(err.message || "Failed to configure key");
    } finally {
      setSavingKey(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResponse(null);
    setExtractedData(null);
    setQuotaMessage(null);

    try {
      const res = await fetch("/api/ai/bonus-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          text: prompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      if (typeof data.remainingToday === "number") {
        setRemainingToday(data.remainingToday);
      }

      if (data.message) {
        setQuotaMessage(data.message);
      }

      if (mode === "extract") {
        setExtractedData(data.data);
      } else {
        setResponse(data.reply);
      }
    } catch (err: any) {
      setResponse(`Error: ${err.message || "Failed to connect to AI service"}`);
    } finally {
      setLoading(false);
    }
  };

  const copyExtractedJson = () => {
    if (extractedData) {
      navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Floating Gemini AI Trigger Bubble (Small Gemini Logo) - Hidden on /tracker since docked in floating right stack */}
      {pathname !== "/tracker" && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#131d27]/95 via-[#0d161d]/95 to-[#080d12]/95 border border-cyan-500/40 hover:border-cyan-300 active:scale-95 shadow-xl shadow-black/80 backdrop-blur-md transition-all duration-300 cursor-pointer hover:shadow-[0_0_22px_rgba(56,189,248,0.45)] group"
          aria-label="Open Dailyroll Gemini AI Assistant"
          title="Dailyroll Gemini AI Assistant"
        >
          <span className="absolute inset-0 rounded-full bg-cyan-400/10 animate-pulse pointer-events-none" />
          <GeminiLogo className="h-5 w-5 sm:h-5.5 sm:w-5.5 transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
        </button>
      )}

      {/* AI Assistant Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="flex h-[85vh] sm:h-[620px] w-full max-w-xl flex-col rounded-t-2xl sm:rounded-2xl border border-emerald-500/20 bg-[#121c17] text-gray-100 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-emerald-900/40 bg-[#15231c] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <GeminiLogo className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-emerald-300 flex items-center gap-2">
                    Dailyroll AI Assistant
                    {isKeyConfigured && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                        Live 3.6
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Google Gemini 3.6 Flash
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {!isKeyConfigured && (
                  <button
                    type="button"
                    onClick={() => setShowKeyConfig(!showKeyConfig)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                      showKeyConfig
                        ? "bg-emerald-600 text-white"
                        : "text-amber-300 hover:bg-white/5 hover:text-amber-200"
                    }`}
                    title="Configure Gemini API Key (Admin)"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Set Admin Key</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Key Configuration Drawer */}
            {showKeyConfig && (
              <div className="border-b border-emerald-900/50 bg-[#0c1611] p-4 animate-in slide-in-from-top-2 duration-150">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
                      Google Gemini API Key
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Enter your key from Google AI Studio to unlock real-time AI responses and promo extraction.
                    </p>
                  </div>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline"
                  >
                    Get Free Key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <form onSubmit={handleSaveKey} className="flex gap-2 mt-3">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 rounded-xl border border-emerald-800/50 bg-[#122018] px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!apiKeyInput.trim() || savingKey}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {savingKey ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    <span>Save</span>
                  </button>
                </form>

                {keyError && (
                  <p className="mt-2 text-[11px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {keyError}
                  </p>
                )}

                {keySuccess && (
                  <p className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    {keySuccess}
                  </p>
                )}
              </div>
            )}

            {/* Offline Preview Notice when no key is set and drawer is closed */}
            {!isKeyConfigured && !showKeyConfig && (
              <div className="flex items-center justify-between border-b border-amber-900/40 bg-amber-950/30 px-4 py-2 text-[11px] text-amber-200/90">
                <span>
                  Offline mode active. Configure your free Gemini API key to enable live AI.
                </span>
                <button
                  type="button"
                  onClick={() => setShowKeyConfig(true)}
                  className="font-bold underline hover:text-white shrink-0 ml-2"
                >
                  Configure Key
                </button>
              </div>
            )}

            {/* Quota limit notice if active */}
            {quotaMessage && (
              <div className="flex items-center gap-1.5 border-b border-amber-900/40 bg-amber-950/40 px-4 py-2 text-[11px] text-amber-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{quotaMessage}</span>
              </div>
            )}

            {/* Mode Switcher */}
            <div className="flex border-b border-emerald-900/30 bg-[#0d1612] px-5 py-2.5 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("advisor");
                  setResponse(null);
                  setExtractedData(null);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  mode === "advisor"
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                Advisor Chat
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("extract");
                  setResponse(null);
                  setExtractedData(null);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  mode === "extract"
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Wand2 className="h-3.5 w-3.5" />
                Extract Bonus Offer
              </button>
            </div>

            {/* Conversation / Results Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!response && !extractedData && !loading && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-3 py-8">
                  <Sparkles className="h-10 w-10 text-emerald-400/40" />
                  <p className="text-sm max-w-sm">
                    {mode === "advisor"
                      ? "Ask any question about daily login bonuses, Sweeps Coins, reset intervals, or playthrough rules."
                      : "Paste promo email text, terms, or bonus details to automatically extract casino name, reward amount, and reset intervals."}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {mode === "advisor" ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setPrompt("Which sweepstakes casinos have the best daily login bonus?")
                          }
                          className="text-xs bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-800/40 rounded-full px-3 py-1 text-emerald-300 transition"
                        >
                          Best daily bonuses?
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPrompt("How does Sweeps Coin playthrough work before redeeming?")
                          }
                          className="text-xs bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-800/40 rounded-full px-3 py-1 text-emerald-300 transition"
                        >
                          How does SC playthrough work?
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setPrompt(
                            "Get 1 FREE Sweeps Coin and 10,000 Gold Coins every 24 hours at High 5 Casino when you sign in daily!"
                          )
                        }
                        className="text-xs bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-800/40 rounded-full px-3 py-1 text-emerald-300 transition"
                      >
                        Try sample promo text
                      </button>
                    )}
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center py-12 gap-3 text-emerald-400 text-sm">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Analyzing with Gemini...</span>
                </div>
              )}

              {response && (
                <div className="rounded-xl border border-emerald-800/30 bg-[#16251e] p-4 text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
                  {response}
                </div>
              )}

              {extractedData && (
                <div className="rounded-xl border border-emerald-700/40 bg-[#16251e] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-900/50 pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Extracted Bonus Details
                    </span>
                    <button
                      onClick={copyExtractedJson}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-300 transition"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>Copy JSON</>
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#0f1914] p-2.5 rounded-lg border border-emerald-900/30">
                      <span className="text-gray-400 block mb-0.5">Casino Name</span>
                      <span className="font-semibold text-emerald-300">{extractedData.name}</span>
                    </div>
                    <div className="bg-[#0f1914] p-2.5 rounded-lg border border-emerald-900/30">
                      <span className="text-gray-400 block mb-0.5">Daily Bonus</span>
                      <span className="font-semibold text-emerald-300">{extractedData.dailyBonus}</span>
                    </div>
                    <div className="bg-[#0f1914] p-2.5 rounded-lg border border-emerald-900/30">
                      <span className="text-gray-400 block mb-0.5">Interval</span>
                      <span className="text-gray-200">
                        {extractedData.intervalHours ? `${extractedData.intervalHours} Hours` : "24 Hours"}
                      </span>
                    </div>
                    {extractedData.promoCode && (
                      <div className="bg-[#0f1914] p-2.5 rounded-lg border border-emerald-900/30">
                        <span className="text-gray-400 block mb-0.5">Promo Code</span>
                        <span className="text-amber-300 font-mono">{extractedData.promoCode}</span>
                      </div>
                    )}
                  </div>
                  {extractedData.notes && (
                    <div className="bg-[#0f1914] p-2.5 rounded-lg border border-emerald-900/30 text-xs text-gray-300">
                      <span className="text-gray-400 block mb-0.5">Notes:</span>
                      {extractedData.notes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="border-t border-emerald-900/40 bg-[#132019] p-3 sm:p-4">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === "advisor"
                      ? "Ask anything about bonuses, reset times, or sweepstakes rules..."
                      : "Paste casino bonus text or offer details..."
                  }
                  className="w-full rounded-xl border border-emerald-800/40 bg-[#0d1612] px-4 py-3 pr-12 text-sm text-gray-100 placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!prompt.trim() || loading}
                  className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Free Usage Indicator Footer */}
            <div className="flex items-center justify-between px-5 py-2 text-[10px] text-gray-400 bg-[#0e1712] border-t border-emerald-950/40">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                {isKeyConfigured
                  ? remainingToday !== null
                    ? remainingToday > 0
                      ? `${remainingToday}/10 free live AI queries left today`
                      : "Daily free quota reached (Unlimited offline advisor active)"
                    : "Free live tier active"
                  : "Offline mode (100% free)"}
              </span>
              <span className="flex items-center gap-1 text-[#688570]">
                <ShieldCheck className="h-3 w-3 text-emerald-500/80" /> Zero Cost Guaranteed
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
