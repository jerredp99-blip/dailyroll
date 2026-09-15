"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DailyRoll Error Boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-rose-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-zinc-100 mb-2">Something went wrong</h2>
        <p className="text-sm text-zinc-400 max-w-md">
          An unexpected error occurred. Please try reloading the page.
        </p>
        {process.env.NODE_ENV === "development" && error?.message && (
          <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-zinc-900/80 border border-zinc-800 p-3 text-left text-xs text-rose-300 font-mono">
            {error.message}
          </pre>
        )}
      </div>
      <button
        onClick={() => reset()}
        className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 transition-all active:scale-95 cursor-pointer"
      >
        Reload Daily Roll
      </button>
    </div>
  );
}
