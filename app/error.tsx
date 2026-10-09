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
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] bg-surface flex flex-col items-center justify-center px-8 text-center font-sans text-ink">
      <div className="w-20 h-20 rounded-[28px] bg-brand/10 flex items-center justify-center mb-6 text-4xl" aria-hidden>
        🥗
      </div>
      <h1 className="font-display text-3xl font-black tracking-tight mb-2">Something went wrong</h1>
      <p className="text-sm font-medium text-ink-soft max-w-xs mb-8 leading-relaxed">
        Nura hit a snag. Your logged meals are safe. Give it another try.
      </p>
      <button
        onClick={() => reset()}
        className="w-full max-w-xs rounded-[16px] bg-brand text-white font-bold py-3.5 shadow-lg shadow-brand/30 active:scale-[0.98] transition-transform"
      >
        Try again
      </button>
      <a href="/dashboard" className="mt-4 text-sm font-bold text-ink-soft">
        Back to home
      </a>
    </div>
  );
}
