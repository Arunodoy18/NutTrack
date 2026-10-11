"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useWeightUnit, setWeightUnit, type WeightUnit } from "@/lib/units";

export default function UnitsClient() {
  const unit = useWeightUnit();
  const opt = (u: WeightUnit, label: string) => (
    <button key={u} role="radio" aria-checked={unit === u} onClick={() => setWeightUnit(u)}
      className={`flex-1 py-3 rounded-2xl font-bold text-sm border ${unit === u ? "bg-brand text-white border-brand" : "bg-white text-ink border-surface-line"}`}>{label}</button>
  );
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/profile" aria-label="Back" className="w-10 h-10 rounded-full bg-white border border-surface-line flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-display text-2xl font-black">Units &amp; measurements</h1>
      </div>
      <section className="bg-white rounded-[32px] p-5 shadow-sm border border-surface-line">
        <h2 className="font-black text-ink">Body weight</h2>
        <p className="text-xs text-ink-soft mt-1 mb-3">Used when you log and read weigh-ins. Nura always stores kilograms, so switching never changes your data. This is saved on this phone.</p>
        <div className="flex gap-2" role="radiogroup" aria-label="Weight unit">{opt("kg", "Kilograms (kg)")}{opt("lb", "Pounds (lb)")}</div>
      </section>
    </div>
  );
}
