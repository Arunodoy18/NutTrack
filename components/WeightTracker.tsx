"use client";

import { useWeightUnit, showWeight, showWeightDelta, toKg } from "@/lib/units";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, X, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { enqueueOp } from "@/lib/offlineQueue";
import { useOfflineSync } from "@/lib/useOfflineSync";
import { showToast } from "@/components/OfflineStatusBar";
import { changeOver, lossTooFast, type WeightPoint } from "@/lib/weightTrend";

interface Props {
  userId: string;
  accountUserId: string;
  /** Saved weigh-ins, any order. */
  logs: { id: string; weightKg: number; timestamp: string }[];
  profileWeightKg: number | null;
  isChild: boolean;
  goal: string | null;
  name: string;
}

function Sparkline({ points }: { points: WeightPoint[] }) {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.at - b.at).slice(-60);
  const W = 300, H = 90, P = 8;
  const min = Math.min(...sorted.map((p) => p.kg)), max = Math.max(...sorted.map((p) => p.kg));
  const span = Math.max(max - min, 1);
  const t0 = sorted[0].at, tSpan = Math.max(sorted[sorted.length - 1].at - t0, 1);
  const xy = sorted.map((p) => [P + ((p.at - t0) / tSpan) * (W - 2 * P), H - P - ((p.kg - min) / span) * (H - 2 * P)] as const);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" role="img" aria-label={`Weight trend from ${sorted[0].kg} to ${sorted[sorted.length - 1].kg} kilograms`}>
      <path d={d} fill="none" stroke="#FC4C02" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === xy.length - 1 ? 5 : 3} fill={sorted[i].pending ? "#38bdf8" : "#FC4C02"} />)}
      <circle cx={last[0]} cy={last[1]} r="9" fill="#FC4C02" opacity="0.15" />
    </svg>
  );
}

export default function WeightTracker({ userId, accountUserId, logs, profileWeightKg, isChild, goal, name }: Props) {
  const router = useRouter();
  const sync = useOfflineSync(accountUserId);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  // When queued weigh-ins reach the server, reload this page's data (and the regenerated targets).
  useEffect(() => {
    const onSynced = () => router.refresh();
    window.addEventListener("nura:synced", onSynced);
    return () => window.removeEventListener("nura:synced", onSynced);
  }, [router]);

  const mine = sync.pending.filter((o) => o.userId === userId);
  const removed = new Set(mine.filter((o) => o.kind === "weight_delete").map((o) => o.logId));
  const points: WeightPoint[] = useMemo(() => {
    const saved = logs.filter((l) => !removed.has(l.id)).map((l) => ({ id: l.id, kg: l.weightKg, at: new Date(l.timestamp).getTime() }));
    const queued = mine.filter((o) => o.kind === "weight_log").map((o) => ({ id: `pending-${o.id}`, kg: o.weightKg ?? 0, at: o.eatenAt, pending: true }));
    return [...saved, ...queued].sort((a, b) => b.at - a.at);
  }, [logs, mine, removed]);

  const unit = useWeightUnit();
  const current = points[0]?.kg ?? profileWeightKg;
  const d7 = changeOver(points, 7), d30 = changeOver(points, 30);
  const typed = Number(value);
  const kg = toKg(typed, unit);
  const valid = value.trim() !== "" && Number.isFinite(typed) && kg >= 8 && kg <= 400;

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await enqueueOp({ userId, ownerId: accountUserId, kind: "weight_log", eatenAt: Date.now(), weightKg: kg });
      showToast(`Logged ${showWeight(kg, unit)} ${unit}`);
      setValue("");
    } catch (e: any) {
      showToast(e?.message || "Couldn't save that weight");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: WeightPoint) => {
    try {
      if (p.pending) await sync.discard(p.id.replace("pending-", ""));
      else await enqueueOp({ userId, ownerId: accountUserId, kind: "weight_delete", eatenAt: Date.now(), logId: p.id });
    } catch (e: any) {
      showToast(e?.message || "Couldn't remove that entry");
    }
  };

  const Delta = ({ v, label }: { v: number | null; label: string }) => (
    <div className="flex-1 rounded-2xl bg-surface-muted p-3 text-center">
      <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-1">{label}</div>
      <div className="flex items-center justify-center gap-1 font-black text-ink">
        {v === null ? <Minus className="w-4 h-4 text-ink-faint" /> : v < 0 ? <TrendingDown className="w-4 h-4 text-emerald-500" /> : v > 0 ? <TrendingUp className="w-4 h-4 text-amber-500" /> : <Minus className="w-4 h-4" />}
        <span>{v === null ? "—" : `${v > 0 ? "+" : ""}${showWeightDelta(v, unit)} ${unit}`}</span>
      </div>
    </div>
  );

  return (
    <section className="bg-white rounded-[32px] p-5 shadow-sm border border-surface-line mb-6" aria-label="Weight">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-500 flex items-center justify-center"><Scale className="w-6 h-6" /></div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-black text-ink leading-tight">{isChild ? `${name}'s growth` : "Weight"}</h3>
          <p className="text-xs font-medium text-ink-soft">{current != null ? <>Now <b className="text-ink">{showWeight(current, unit)} {unit}</b></> : "No weigh-ins yet"}</p>
        </div>
      </div>

      <Sparkline points={points} />

      {points.length >= 2 && (
        <div className="flex gap-2 mb-3">
          <Delta v={d7} label="7 days" />
          <Delta v={d30} label="30 days" />
        </div>
      )}

      {isChild ? (
        <p className="text-xs font-medium text-ink-soft bg-emerald-50 border border-emerald-100 rounded-2xl p-3 mb-3 leading-relaxed">
          Children&apos;s weight goes up as they grow, and every child grows at their own pace. Weigh now and then, and review the trend with your paediatrician on a growth chart — Nura updates {name}&apos;s calorie target as they grow.
        </p>
      ) : (
        goal === "Lose weight" && lossTooFast(points) && (
          <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-3 leading-relaxed">
            You&apos;re losing weight faster than about 1% of your body weight a week. That&apos;s usually too fast to keep muscle and energy — consider easing your target or speaking to a dietitian.
          </p>
        )
      )}

      <div className="flex gap-2 mb-1">
        <div className="relative flex-1">
          <input
            type="number" inputMode="decimal" step="0.1" min={unit === "lb" ? 18 : 8} max={unit === "lb" ? 880 : 400} value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={current != null ? `e.g. ${showWeight(current, unit)}` : unit === "lb" ? "e.g. 138" : "e.g. 62.5"} aria-label={`Today's weight in ${unit === "lb" ? "pounds" : "kilograms"}`}
            className="w-full bg-surface-muted rounded-[16px] px-4 py-3 pr-10 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-brand"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-soft">{unit}</span>
        </div>
        <button onClick={save} disabled={!valid || busy} className="px-5 rounded-[16px] bg-brand text-white font-bold text-sm disabled:opacity-40">
          Log
        </button>
      </div>

      {points.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {points.slice(0, 5).map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm px-1">
              <span className="font-bold text-ink">{showWeight(p.kg, unit)} {unit}{p.pending && <span className="ml-2 text-[10px] font-bold text-sky-600">saved on this phone</span>}</span>
              <span className="flex items-center gap-2 text-xs font-medium text-ink-soft">
                {new Date(p.at).toLocaleDateString([], { day: "numeric", month: "short" })}
                <button onClick={() => remove(p)} className="p-1 rounded-full text-ink-faint hover:text-red-500" aria-label={`Remove ${showWeight(p.kg, unit)} ${unit} entry`}><X className="w-3.5 h-3.5" /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
