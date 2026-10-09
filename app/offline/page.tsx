"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-[100dvh] bg-surface flex flex-col items-center justify-center px-8 text-center font-sans text-ink">
      <div className="text-6xl mb-4" aria-hidden>📡</div>
      <h1 className="font-display text-3xl font-black tracking-tight mb-2">You&apos;re offline</h1>
      <p className="text-sm font-medium text-ink-soft max-w-xs mb-8 leading-relaxed">
        Nura needs a connection to scan meals and sync. Reconnect and we&apos;ll pick up right where you left off.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="w-full max-w-xs rounded-[16px] bg-brand text-white font-bold py-3.5 shadow-lg shadow-brand/30 active:scale-[0.98] transition-transform"
      >
        Try again
      </button>
    </div>
  );
}
