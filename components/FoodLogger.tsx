"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, Search, X } from "lucide-react";
import { portionOf, searchFoods, sumPortions, type Food, type Portion } from "@/lib/foods";
import { enqueueOp } from "@/lib/offlineQueue";
import { MEAL_SESSIONS, guessMealSession, type MealItemInput, type MealSession } from "@/lib/offlineTypes";

interface Props {
  userId: string;
  accountUserId?: string;
  onSaved: (name: string) => void;
}

/** A food from the built-in table or from the online packaged-food search. */
type Pick = Pick_;
interface Pick_ { id: string; name: string; brand?: string | null; per100: Food["per100"]; servings: { label: string; grams: number }[]; allergens?: string[]; online?: boolean }

interface Line { key: string; food: Pick; grams: number; quantityLabel: string; portion: Portion }

const asPick = (f: Food): Pick => ({ id: f.id, name: f.name, per100: f.per100, servings: f.servings, allergens: f.allergens });
const asFood = (p: Pick): Food => ({ id: p.id, name: p.name, aliases: [], category: "", diet: "vegan", allergens: [], per100: p.per100, servings: p.servings, source: "reference" });

const RECENT_KEY = (id: string) => `nura_recent_foods_${id}`;
const loadRecent = (id: string): Pick[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY(id)) || "[]"); } catch { return []; } };
const saveRecent = (id: string, p: Pick) => {
  try {
    const list = [p, ...loadRecent(id).filter((x) => x.id !== p.id)].slice(0, 8);
    localStorage.setItem(RECENT_KEY(id), JSON.stringify(list.map((x) => ({ ...x, allergens: x.allergens ?? [] }))));
  } catch { /* storage unavailable */ }
};

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

export default function FoodLogger({ userId, accountUserId, onSaved }: Props) {
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState<{ q: string; results: Pick[]; loading: boolean; note?: string }>({ q: "", results: [], loading: false });
  const [recent, setRecent] = useState<Pick[]>([]);
  const [editing, setEditing] = useState<Pick | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [session, setSession] = useState<MealSession>(guessMealSession(Date.now()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reqId = useRef(0);

  useEffect(() => setRecent(loadRecent(userId)), [userId]);

  const local = useMemo(() => (query.trim() ? searchFoods(query, 8).map(asPick) : []), [query]);

  // Online packaged-food search, only when typing, debounced, and silently skipped when offline.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || typeof navigator === "undefined" || !navigator.onLine) { setOnline({ q, results: [], loading: false }); return; }
    const id = ++reqId.current;
    setOnline((o) => ({ ...o, q, loading: true, note: undefined }));
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`);
        const j = await res.json();
        if (id !== reqId.current) return;
        setOnline({ q, results: (j.results ?? []).map((r: any) => ({ ...r, online: true })), loading: false, note: j.error });
      } catch {
        if (id === reqId.current) setOnline({ q, results: [], loading: false });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [query]);

  const addLine = (food: Pick, grams: number, label: string) => {
    const portion = portionOf(asFood(food), grams);
    setLines((l) => [...l, { key: `${food.id}-${Date.now()}-${l.length}`, food, grams, quantityLabel: label, portion }]);
    saveRecent(userId, food);
    setRecent(loadRecent(userId));
    setEditing(null);
    setQuery("");
  };

  const total = useMemo(() => sumPortions(lines.map((l) => l.portion)), [lines]);
  const mealName = useMemo(() => {
    if (lines.length === 0) return "";
    const names = lines.slice(0, 2).map((l) => l.food.name.split(",")[0]);
    return (names.join(", ") + (lines.length > 2 ? ` +${lines.length - 2} more` : "")).slice(0, 100);
  }, [lines]);

  const save = async () => {
    if (lines.length === 0 || saving) return;
    setSaving(true);
    setError("");
    try {
      const items: MealItemInput[] = lines.map((l) => ({
        name: l.food.name.slice(0, 100), quantity: l.quantityLabel,
        calories: l.portion.kcal, protein: l.portion.protein, fat: l.portion.fat, carbs: l.portion.carbs, fiber: l.portion.fiber,
        sodium: l.portion.sodium, iron: l.portion.iron, calcium: l.portion.calcium, vitaminC: l.portion.vitaminC, potassium: l.portion.potassium,
      }));
      await enqueueOp({
        userId, ownerId: accountUserId ?? userId, kind: "meal_manual", eatenAt: Date.now(),
        meal: {
          name: mealName, mealSession: session, items,
          totalCalories: Math.round(total.kcal), totalProtein: Math.round(total.protein), totalFat: Math.round(total.fat),
          totalCarbs: Math.round(total.carbs), totalFiber: Math.round(total.fiber),
        },
      });
      onSaved(mealName);
    } catch (e: any) {
      setError(e?.message || "Couldn't save on this device. Please try again.");
      setSaving(false);
    }
  };

  const row = (p: Pick) => (
    <li key={p.id}>
      <button type="button" onClick={() => setEditing(p)} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/10 text-left active:scale-[0.99] transition-transform">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white truncate">{p.name}</div>
          <div className="text-[11px] font-medium text-white/55 truncate">
            {Math.round(p.per100.kcal)} kcal · P {fmt(p.per100.protein)} · C {fmt(p.per100.carbs)} · F {fmt(p.per100.fat)} <span className="text-white/35">per 100 g</span>
            {p.brand ? ` · ${p.brand}` : ""}
          </div>
          {p.allergens && p.allergens.length > 0 && <div className="text-[10px] font-bold text-amber-300/90 mt-0.5">Contains {p.allergens.join(", ")}</div>}
        </div>
        <Plus className="w-5 h-5 text-white/70 shrink-0" />
      </button>
    </li>
  );

  /* ── portion picker ── */
  if (editing) return <PortionPicker food={editing} onCancel={() => setEditing(null)} onAdd={addLine} />;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false}
          placeholder="Search: roti, dal, banana, paneer…" aria-label="Search foods"
          className="w-full bg-white/10 text-white placeholder:text-white/40 rounded-2xl pl-10 pr-10 py-3 text-base font-bold outline-none focus:ring-2 focus:ring-brand border border-white/10"
        />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/50"><X className="w-4 h-4" /></button>}
      </div>

      {query.trim() === "" && recent.length > 0 && (
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.15em] text-white/40 uppercase mb-2">Recent</div>
          <ul className="space-y-2">{recent.slice(0, 5).map(row)}</ul>
        </div>
      )}

      {query.trim() !== "" && (
        <ul className="space-y-2" aria-live="polite">
          {local.map(row)}
          {local.length === 0 && online.results.length === 0 && !online.loading && (
            <li className="text-sm font-medium text-white/50 px-1">
              No match in the food list{typeof navigator !== "undefined" && !navigator.onLine ? " (you're offline — packaged-food search needs a connection)" : ""}. Try another spelling, or use “I know the numbers”.
            </li>
          )}
          {online.loading && <li className="text-xs font-medium text-white/40 px-1">Searching packaged foods…</li>}
          {online.results.length > 0 && <li className="text-[10px] font-mono font-bold tracking-[0.15em] text-white/40 uppercase pt-1 px-1">Packaged foods</li>}
          {online.results.map(row)}
          {online.note && online.results.length === 0 && <li className="text-xs font-medium text-white/40 px-1">{online.note}</li>}
        </ul>
      )}

      {lines.length > 0 && (
        <div className="rounded-3xl bg-white/10 border border-white/10 p-4 space-y-3">
          <div className="text-[10px] font-mono font-bold tracking-[0.15em] text-white/40 uppercase">Your meal</div>
          <ul className="space-y-2">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{l.food.name}</div>
                  <div className="text-[11px] font-medium text-white/50">{l.quantityLabel} · {l.portion.kcal} kcal</div>
                </div>
                <button type="button" onClick={() => setLines((x) => x.filter((y) => y.key !== l.key))} aria-label={`Remove ${l.food.name}`} className="p-1.5 rounded-full bg-white/10 text-white/70"><X className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-white/10 pt-3 text-white">
            <span className="text-2xl font-black">{Math.round(total.kcal)} <span className="text-xs font-bold text-white/50">kcal</span></span>
            <span className="text-[11px] font-bold text-white/60">P {fmt(total.protein)} · C {fmt(total.carbs)} · F {fmt(total.fat)} · Fi {fmt(total.fiber)}</span>
          </div>
          <div className="flex gap-1.5">
            {MEAL_SESSIONS.map((s) => (
              <button key={s} type="button" onClick={() => setSession(s)} className={`flex-1 py-1.5 rounded-full text-[10px] font-bold uppercase ${session === s ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>{s}</button>
            ))}
          </div>
          {error && <p className="text-sm font-bold text-red-400">{error}</p>}
          <button type="button" onClick={save} disabled={saving} className="w-full py-3.5 rounded-full bg-brand text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand/40 disabled:opacity-60">
            <Check className="w-5 h-5" />{saving ? "Saving…" : "Save meal"}
          </button>
        </div>
      )}
    </div>
  );
}

function PortionPicker({ food, onCancel, onAdd }: { food: Pick; onCancel: () => void; onAdd: (f: Pick, grams: number, label: string) => void }) {
  const servings = food.servings.length ? food.servings : [{ label: "100 g", grams: 100 }];
  const [idx, setIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState("");
  const useGrams = custom.trim() !== "";
  const gramsNum = Number(custom);
  const grams = useGrams ? gramsNum : servings[idx].grams * qty;
  const valid = Number.isFinite(grams) && grams >= 1 && grams <= 2000;
  const p = portionOf(asFood(food), valid ? grams : 0);
  const label = useGrams ? `${fmt(gramsNum)} g` : `${qty === 1 ? "" : fmt(qty) + " × "}${servings[idx].label}`;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onCancel} className="text-sm font-bold text-white/60">← Back to search</button>
      <div>
        <div className="text-xl font-black text-white leading-tight">{food.name}</div>
        {food.allergens && food.allergens.length > 0 && <div className="text-[11px] font-bold text-amber-300/90 mt-1">Contains {food.allergens.join(", ")}</div>}
      </div>

      <div>
        <div className="text-[10px] font-mono font-bold tracking-[0.15em] text-white/40 uppercase mb-2">Serving</div>
        <div className="flex flex-wrap gap-2">
          {servings.map((s, i) => (
            <button key={s.label} type="button" onClick={() => { setIdx(i); setCustom(""); }} className={`px-3 py-2 rounded-full text-xs font-bold ${!useGrams && idx === i ? "bg-white text-black" : "bg-white/10 text-white/70"}`}>{s.label}</button>
          ))}
        </div>
      </div>

      {!useGrams && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setQty((q) => Math.max(0.5, q - 0.5))} aria-label="Less" className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-95"><Minus className="w-5 h-5" /></button>
          <div className="flex-1 text-center text-3xl font-black text-white">{fmt(qty)}<span className="text-sm font-bold text-white/50"> ×</span></div>
          <button type="button" onClick={() => setQty((q) => Math.min(20, q + 0.5))} aria-label="More" className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-95"><Plus className="w-5 h-5" /></button>
        </div>
      )}

      <div className="relative">
        <input type="number" inputMode="decimal" min={1} max={2000} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="…or type exact grams" aria-label="Exact grams"
          className="w-full bg-white/10 text-white placeholder:text-white/40 rounded-2xl px-4 py-3 pr-10 text-base font-bold outline-none focus:ring-2 focus:ring-brand border border-white/10" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/50">g</span>
      </div>

      <div className="rounded-3xl bg-white/10 border border-white/10 p-4">
        <div className="flex items-baseline justify-between text-white">
          <span className="text-3xl font-black">{valid ? p.kcal : "—"}<span className="text-xs font-bold text-white/50"> kcal</span></span>
          <span className="text-xs font-bold text-white/60">{valid ? `${fmt(grams)} g` : "enter 1–2000 g"}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
          {[["Protein", p.protein], ["Carbs", p.carbs], ["Fat", p.fat], ["Fibre", p.fiber]].map(([l, v]) => (
            <div key={String(l)} className="rounded-xl bg-white/10 py-2"><div className="text-[9px] font-bold text-white/50 uppercase">{l}</div><div className="text-sm font-black text-white">{valid ? `${v}g` : "—"}</div></div>
          ))}
        </div>
      </div>

      <button type="button" disabled={!valid} onClick={() => onAdd(food, grams, label)} className="w-full py-3.5 rounded-full bg-brand text-white font-bold disabled:opacity-40 shadow-lg shadow-brand/40">
        Add to meal
      </button>
    </div>
  );
}
