"use client";

import React, { useState } from "react";
import { Droplets, Plus, X } from "lucide-react";
import { QUICK_DRINKS, MIN_DRINK_ML, MAX_DRINK_ML } from "@/lib/hydration";
import { enqueueOp } from "@/lib/offlineQueue";
import { showToast } from "@/components/OfflineStatusBar";

export interface WaterEntry {
  id: string;
  amountMl: number;
  timestamp: string;
  /** Not on the server yet (saved on this phone). */
  pending?: boolean;
}

interface Props {
  userId: string;
  accountUserId?: string;
  totalMl: number;
  goalMl: number;
  entries: WaterEntry[];
  isChild?: boolean;
  name?: string;
  /** Discard a not-yet-synced drink. */
  onDiscardPending: (opId: string) => void;
}

const litres = (ml: number) => (ml >= 1000 ? `${(ml / 1000).toFixed(ml % 100 === 0 ? 1 : 2).replace(/\.?0+$/, "")} L` : `${ml} ml`);

export default function WaterCard({ userId, accountUserId, totalMl, goalMl, entries, isChild, name, onDiscardPending }: Props) {
  const [custom, setCustom] = useState(false);
  const [customMl, setCustomMl] = useState("");
  const [busy, setBusy] = useState(false);
  const pct = Math.min(100, Math.round((totalMl / Math.max(goalMl, 1)) * 100));
  const done = totalMl >= goalMl;

  const add = async (ml: number) => {
    if (busy) return;
    if (!Number.isFinite(ml) || ml < MIN_DRINK_ML || ml > MAX_DRINK_ML) {
      showToast(`A drink should be between ${MIN_DRINK_ML} and ${MAX_DRINK_ML} ml`);
      return;
    }
    setBusy(true);
    try {
      await enqueueOp({ userId, ownerId: accountUserId ?? userId, kind: "water_add", eatenAt: Date.now(), amountMl: Math.round(ml) });
      try { navigator.vibrate?.(12); } catch { /* not supported */ }
      setCustom(false);
      setCustomMl("");
    } catch (e: any) {
      showToast(e?.message || "Couldn't save that drink");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (e: WaterEntry) => {
    try {
      if (e.pending) onDiscardPending(e.id.replace("pending-", ""));
      else await enqueueOp({ userId, ownerId: accountUserId ?? userId, kind: "water_delete", eatenAt: Date.now(), logId: e.id });
    } catch (err: any) {
      showToast(err?.message || "Couldn't remove that drink");
    }
  };

  return (
    <section className="bg-white rounded-[32px] p-5 shadow-sm border border-surface-line" aria-label="Water">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display text-lg font-black text-ink leading-tight">{isChild && name ? `${name}'s water` : "Water"}</h3>
            <p className="text-xs font-medium text-ink-soft">
              <b className="text-ink">{litres(totalMl)}</b> of {litres(goalMl)}
              {done ? " · goal reached 🎉" : ` · ${litres(goalMl - totalMl)} to go`}
            </p>
          </div>
        </div>
        <span className="text-sm font-black text-sky-600">{pct}%</span>
      </div>

      <div
        className="h-3 rounded-full bg-sky-50 overflow-hidden mb-4"
        role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Water goal progress"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {QUICK_DRINKS.map((d) => (
          <button
            key={d.ml}
            onClick={() => add(d.ml)}
            disabled={busy}
            className="rounded-2xl bg-sky-50 text-sky-700 py-2.5 flex flex-col items-center active:scale-[0.96] transition-transform disabled:opacity-60"
            aria-label={`Add ${d.label}, ${d.ml} millilitres`}
          >
            <span className="text-xl leading-none mb-1" aria-hidden>{d.emoji}</span>
            <span className="text-[11px] font-black">+{d.ml}</span>
          </button>
        ))}
        <button
          onClick={() => setCustom((v) => !v)}
          className="rounded-2xl bg-surface-muted text-ink py-2.5 flex flex-col items-center active:scale-[0.96] transition-transform"
          aria-label="Add a custom amount"
        >
          <Plus className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-black">Other</span>
        </button>
      </div>

      {custom && (
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <input
              type="number" inputMode="numeric" min={MIN_DRINK_ML} max={MAX_DRINK_ML} value={customMl}
              onChange={(e) => setCustomMl(e.target.value)}
              placeholder="e.g. 330" aria-label="Custom amount in millilitres"
              className="w-full bg-surface-muted rounded-[16px] px-4 py-3 pr-12 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-sky-400"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-soft">ml</span>
          </div>
          <button
            onClick={() => add(Number(customMl))}
            disabled={!customMl || busy}
            className="px-5 rounded-[16px] bg-sky-500 text-white font-bold text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {entries.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2">Today&apos;s drinks</div>
          <ul className="flex flex-wrap gap-2">
            {entries.map((e) => (
              <li key={e.id} className={`flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-bold ${e.pending ? "bg-sky-50 text-sky-600 border border-dashed border-sky-300" : "bg-surface-muted text-ink"}`}>
                <span>{e.amountMl} ml</span>
                <span className="text-ink-faint font-medium">
                  {new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <button onClick={() => remove(e)} className="p-1 rounded-full text-ink-faint hover:text-red-500" aria-label={`Remove ${e.amountMl} millilitres`}>
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
