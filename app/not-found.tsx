import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] bg-surface flex flex-col items-center justify-center px-8 text-center font-sans text-ink">
      <div className="text-6xl mb-4" aria-hidden>🍽️</div>
      <h1 className="font-display text-3xl font-black tracking-tight mb-2">Nothing on this plate</h1>
      <p className="text-sm font-medium text-ink-soft max-w-xs mb-8">
        We couldn&apos;t find that page.
      </p>
      <Link
        href="/dashboard"
        className="w-full max-w-xs rounded-[16px] bg-brand text-white font-bold py-3.5 shadow-lg shadow-brand/30"
      >
        Go to home
      </Link>
    </div>
  );
}
