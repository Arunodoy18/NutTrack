"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="px-4 py-1.5 rounded-full bg-brand text-white text-xs font-bold">
      Print / Save PDF
    </button>
  );
}
