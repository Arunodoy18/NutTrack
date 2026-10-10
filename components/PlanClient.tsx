"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, RefreshCw, Shuffle, ShoppingBasket, X } from "lucide-react";
import { RECIPES, filterRecipes, getRecipe, mealFromRecipe, type MealType } from "@/lib/foods/recipes";
import { generatePlan, groceryForPlan, type PlanDay, type PlannedMeal } from "@/lib/foods/planner";
import type { Allergen, Diet } from "@/lib/foods";
import { enqueueOp } from "@/lib/offlineQueue";
import { showToast } from "@/components/OfflineStatusBar";
import { addIngredientsToGroceryListAction } from "@/app/actions";
import type { MealSession } from "@/lib/offlineTypes";

interface Props { userId: string; accountUserId: string; name: string; age: number; calories: number; protein: number; eats: "any" | Diet; avoid: Allergen[] }

const SLOT_LABEL: Record<MealType, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };
const SESSION: Record<MealType, MealSession> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };
const STORE = (id: string) => `nura_plan_${id}`;

interface Saved { shuffle: number; pinned: Record<string, string>; logged: Record<string, true>; week: string }
const weekKey = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 10); };

export default function PlanClient({ userId, accountUserId, name, age, calories, protein, eats, avoid }: Props) {
  const [saved, setSaved] = useState<Saved>({ shuffle: 0, pinned: {}, logged: {}, week: weekKey() });
  const [ready, setReady] = useState(false);
  const [day, setDay] = useState(0);
  const [swap, setSwap] = useState<{ day: number; slot: MealType } | null>(null);
  const [shopping, setShopping] = useState(false);

  // Restore swaps / shuffle for this person; a new week starts fresh.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE(userId));
      if (raw) {
        const s = JSON.parse(raw) as Saved;
        if (s.week === weekKey()) setSaved(s);
      }
    } catch { /* ignore */ }
    setReady(true);
  }, [userId]);
  useEffect(() => { if (ready) try { localStorage.setItem(STORE(userId), JSON.stringify(saved)); } catch { /* ignore */ } }, [saved, ready, userId]);

  const plan: PlanDay[] = useMemo(
    () => generatePlan({ targets: { calories, protein }, constraints: { eats, avoid, age }, seed: `${userId}:${saved.week}:${saved.shuffle}`, pinned: saved.pinned }),
    [calories, protein, eats, avoid, age, userId, saved.week, saved.shuffle, saved.pinned]
  );
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }), []);
  const today = plan[day];
  // Dates and "this week" depend on the device clock, so render only after mounting (avoids hydration mismatches).
  if (!ready || !today) return <div className="pt-24 px-5 text-center text-sm font-bold text-ink-soft">Preparing your plan…</div>;

  const logMeal = async (d: number, m: PlannedMeal) => {
    const r = getRecipe(m.recipeId)!;
    try {
      await enqueueOp({ userId, ownerId: accountUserId, kind: "meal_manual", eatenAt: Date.now(), meal: mealFromRecipe(r, m.scale, SESSION[m.slot]) });
      setSaved((s) => ({ ...s, logged: { ...s.logged, [`${d}:${m.slot}`]: true } }));
      showToast(`Logged ${r.name}`);
    } catch (e: any) { showToast(e?.message || "Couldn't log that meal"); }
  };

  const pct = Math.min(100, Math.round((today.totals.kcal / calories) * 100));

  return (
    <div className="pt-14 px-5 max-w-lg mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-ink-soft mb-5"><ArrowLeft className="w-5 h-5" /><span className="font-bold text-sm">Home</span></Link>
      <div className="flex items-end justify-between mb-1">
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-brand uppercase">This week</div>
          <h1 className="font-display text-[32px] font-black tracking-tight leading-none">Meal plan</h1>
        </div>
        <Link href="/recipes" className="text-sm font-bold text-brand">Recipes →</Link>
      </div>
      <p className="text-sm font-medium text-ink-soft mb-4">
        Built for {name}: about <b className="text-ink">{calories} kcal</b> and <b className="text-ink">{protein} g protein</b> a day{age < 18 ? ", kid-friendly and growth-focused" : ""}, respecting diet and allergies.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-3">
        {dates.map((d, i) => (
          <button key={i} onClick={() => setDay(i)} className={`shrink-0 w-14 py-2 rounded-2xl border text-center ${day === i ? "bg-ink text-white border-ink" : "bg-white text-ink border-surface-line"}`} aria-label={d.toDateString()}>
            <div className="text-[10px] font-bold uppercase opacity-70">{i === 0 ? "Today" : d.toLocaleDateString([], { weekday: "short" })}</div>
            <div className="text-lg font-black leading-tight">{d.getDate()}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[24px] border border-surface-line p-4 mb-4 shadow-sm">
        <div className="flex justify-between text-sm font-bold mb-2"><span className="text-ink">{today.totals.kcal} kcal</span><span className="text-ink-soft">goal {calories}</span></div>
        <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="flex justify-between text-[11px] font-bold text-ink-soft mt-2"><span>P {Math.round(today.totals.protein)}g</span><span>C {Math.round(today.totals.carbs)}g</span><span>F {Math.round(today.totals.fat)}g</span><span>Fibre {Math.round(today.totals.fiber)}g</span></div>
      </div>

      <ul className="space-y-3 mb-5">
        {today.meals.map((m) => {
          const r = getRecipe(m.recipeId)!;
          const done = saved.logged[`${day}:${m.slot}`];
          return (
            <li key={m.slot} className="bg-white rounded-[24px] border border-surface-line shadow-sm p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono font-bold tracking-[0.15em] text-brand uppercase">{SLOT_LABEL[m.slot]}</div>
                  <h3 className="font-black text-ink leading-snug">{r.name}</h3>
                  <div className="text-xs font-bold text-ink-soft mt-1">{m.kcal} kcal · P {Math.round(m.protein)}g{m.scale !== 1 ? ` · ${m.scale}× portion` : ""} · {r.minutes} min</div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setSwap({ day, slot: m.slot })} className="px-3 py-2 rounded-xl bg-surface-muted text-ink-soft text-xs font-bold flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Swap</button>
                <Link href="/recipes" className="px-3 py-2 rounded-xl bg-surface-muted text-ink-soft text-xs font-bold">Recipe</Link>
                <button onClick={() => logMeal(day, m)} disabled={!!done} className={`ml-auto px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${done ? "bg-emerald-50 text-emerald-700" : "bg-brand text-white"}`}>
                  <Check className="w-3.5 h-3.5" />{done ? "Logged" : "Log it"}
                </button>
              </div>
            </li>
          );
        })}
        {today.meals.length === 0 && <li className="text-sm font-medium text-ink-soft text-center py-8">No safe recipes fit these diet and allergy settings yet.</li>}
      </ul>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setSaved((s) => ({ ...s, shuffle: s.shuffle + 1, pinned: {}, logged: {} }))} className="py-3.5 rounded-[18px] bg-white border-2 border-surface-line text-ink font-bold text-sm flex items-center justify-center gap-2"><Shuffle className="w-4 h-4" />New week</button>
        <button onClick={() => setShopping(true)} className="py-3.5 rounded-[18px] bg-ink text-white font-bold text-sm flex items-center justify-center gap-2"><ShoppingBasket className="w-4 h-4" />Shopping list</button>
      </div>

      {swap && (
        <SwapSheet slot={swap.slot} current={plan[swap.day].meals.find((m) => m.slot === swap.slot)?.recipeId} eats={eats} avoid={avoid} age={age}
          onPick={(id) => { setSaved((s) => ({ ...s, pinned: { ...s.pinned, [`${swap.day}:${swap.slot}`]: id }, logged: { ...s.logged, [`${swap.day}:${swap.slot}`]: undefined as never } })); setSwap(null); }}
          onClose={() => setSwap(null)} />
      )}
      {shopping && <ShoppingSheet plan={plan} onClose={() => setShopping(false)} />}
    </div>
  );
}

function SwapSheet({ slot, current, eats, avoid, age, onPick, onClose }: { slot: MealType; current?: string; eats: "any" | Diet; avoid: Allergen[]; age: number; onPick: (id: string) => void; onClose: () => void }) {
  const options = filterRecipes(RECIPES, { eats, avoid, age, meal: slot }).filter((r) => r.id !== current);
  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto bg-white rounded-t-[32px] p-5 pb-8" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Swap meal">
        <div className="flex items-center justify-between mb-3"><h2 className="font-display text-xl font-black">Swap {SLOT_LABEL[slot].toLowerCase()}</h2><button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-surface-muted"><X className="w-4 h-4" /></button></div>
        <ul className="space-y-2">
          {options.map((r) => (
            <li key={r.id}><button onClick={() => onPick(r.id)} className="w-full text-left p-3 rounded-2xl border border-surface-line active:bg-surface-muted"><div className="font-bold text-ink">{r.name}</div><div className="text-xs font-medium text-ink-soft">{r.perServing.kcal} kcal · P {Math.round(r.perServing.protein)}g · {r.minutes} min</div></button></li>
          ))}
          {options.length === 0 && <li className="text-sm font-medium text-ink-soft py-6 text-center">No other safe options for this meal.</li>}
        </ul>
      </div>
    </div>
  );
}

function ShoppingSheet({ plan, onClose }: { plan: PlanDay[]; onClose: () => void }) {
  const list = useMemo(() => groceryForPlan(plan), [plan]);
  const groups = useMemo(() => { const g = new Map<string, typeof list>(); for (const i of list) g.set(i.category, [...(g.get(i.category) ?? []), i]); return Array.from(g.entries()); }, [list]);
  const [busy, setBusy] = useState(false);
  const addAll = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) { showToast("The grocery list needs a connection"); return; }
    setBusy(true);
    const res = await addIngredientsToGroceryListAction(list.map((i) => `${i.name} (${i.grams} g)`));
    showToast(res.success ? ((res.added ?? 0) > 0 ? `Added ${res.added} items to your grocery list` : "Already on your grocery list") : "Couldn't update the grocery list");
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-t-[32px] p-5 pb-8" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Shopping list">
        <div className="flex items-center justify-between mb-1"><h2 className="font-display text-xl font-black">Shopping list</h2><button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-surface-muted"><X className="w-4 h-4" /></button></div>
        <p className="text-xs font-medium text-ink-soft mb-4">Everything for the 7-day plan, in cooked-weight amounts.</p>
        {groups.map(([cat, items]) => (
          <div key={cat} className="mb-4">
            <div className="text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-1">{cat}</div>
            <ul className="divide-y divide-surface-line">{items.map((i) => <li key={i.foodId} className="flex justify-between py-2 text-sm"><span className="font-medium text-ink">{i.name}</span><span className="font-bold text-ink-soft">{i.grams} g</span></li>)}</ul>
          </div>
        ))}
        <button onClick={addAll} disabled={busy} className="w-full py-3.5 rounded-[16px] bg-brand text-white font-bold disabled:opacity-60">Add all to my grocery list</button>
      </div>
    </div>
  );
}
