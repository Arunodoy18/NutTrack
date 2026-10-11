"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Footprints, Flame, ChevronRight } from "lucide-react";
import { creditKcal } from "@/lib/activity";

interface Data {
  days: { day: string; steps: number; activeKcal: number }[];
  workouts: { id: string; startedAt: string; minutes: number; kcal: number }[];
  settings: { creditEnabled: boolean; creditPct: number };
}

const localDay = (d: Date) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD in the phone's own time zone

export default function ActivityCard({ userId, age }: { userId: string; age?: number }) {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/activity?days=2", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && d) setData(d); })
      .catch(() => {});
    return () => { live = false; };
  }, [userId]);

  const today = localDay(new Date());
  const rows = (data?.days ?? []).filter((d) => d.day === today);
  // Phone + watch can both report the same day: show the larger figure instead of adding them.
  const steps = rows.reduce((m, r) => Math.max(m, r.steps), 0);
  const wk = (data?.workouts ?? []).filter((w) => localDay(new Date(w.startedAt)) === today);
  const wkKcal = wk.reduce((a, w) => a + w.kcal, 0);
  const wkMin = wk.reduce((a, w) => a + w.minutes, 0);
  const active = Math.max(rows.reduce((m, r) => Math.max(m, r.activeKcal), 0), wkKcal);
  const credit = data ? creditKcal({ activeKcal: active, enabled: data.settings.creditEnabled, pct: data.settings.creditPct, age: age ?? null }) : 0;
  const empty = !data || (steps === 0 && active === 0 && wk.length === 0);

  return (
    <Link href="/connected" className="block bg-white rounded-[32px] p-5 shadow-sm border border-surface-line active:scale-[0.99] transition-transform" aria-label="Activity">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Footprints className="w-6 h-6" /></div>
          <div>
            <h3 className="font-display text-lg font-black text-ink leading-tight">Activity</h3>
            {empty ? (
              <p className="text-xs font-medium text-ink-soft">Log a workout or connect Health Connect</p>
            ) : (
              <p className="text-xs font-medium text-ink-soft">
                <b className="text-ink">{steps.toLocaleString()}</b> steps
                {active > 0 && <> · <Flame className="inline w-3 h-3 -mt-0.5 text-orange-500" /> <b className="text-ink">{active}</b> kcal</>}
                {wkMin > 0 && <> · {wkMin} min workout</>}
              </p>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-ink-soft" />
      </div>
      {credit > 0 && <p className="mt-3 text-[11px] font-medium text-ink-soft bg-emerald-50 rounded-xl px-3 py-2">You can add up to <b className="text-ink">{credit} kcal</b> to today&apos;s food from your activity.</p>}
    </Link>
  );
}
