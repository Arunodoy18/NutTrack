"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock, Minus, Plus, Search, ShoppingBasket, X } from "lucide-react";
import { RECIPES, filterRecipes, mealFromRecipe, scaledIngredients, type MealType, type Recipe } from "@/lib/foods/recipes";
import type { Allergen, Diet } from "@/lib/foods";
import { enqueueOp } from "@/lib/offlineQueue";
import { showToast } from "@/components/OfflineStatusBar";
import { addToGrocery, groceryToast } from "@/lib/groceryClient";
import { guessMealSession, type MealSession } from "@/lib/offlineTypes";

interface Props { userId: string; accountUserId: string; name: string; age: number; eats: "any" | Diet; avoid: Allergen[] }

const MEALS: { v: MealType | "all"; l: string }[] = [{ v: "all", l: "All" }, { v: "breakfast", l: "Breakfast" }, { v: "lunch", l: "Lunch" }, { v: "dinner", l: "Dinner" }, { v: "snack", l: "Snacks" }];
const DIET_LABEL: Record<Diet, string> = { vegan: "Vegan", vegetarian: "Veg", egg: "Egg", nonveg: "Non-veg" };
const DIET_CLS: Record<Diet, string> = { vegan: "bg-emerald-50 text-emerald-700", vegetarian: "bg-emerald-50 text-emerald-700", egg: "bg-amber-50 text-amber-700", nonveg: "bg-red-50 text-red-600" };
const sessionFor = (r: Recipe): MealSession => {
  const guess = guessMealSession(Date.now());
  const map: Record<MealSession, MealType> = { Breakfast: "breakfast", Lunch: "lunch", Dinner: "dinner", Snack: "snack" };
  if (r.meals.includes(map[guess])) return guess;
  const first = r.meals[0];
  return (first.charAt(0).toUpperCase() + first.slice(1)) as MealSession;
};

export default function RecipesClient({ userId, accountUserId, name, age, eats, avoid }: Props) {
  const [meal, setMeal] = useState<MealType | "all">("all");
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState(false);
  const [open, setOpen] = useState<Recipe | null>(null);

  const list = useMemo(
    () => filterRecipes(RECIPES, { eats, avoid, age, meal: meal === "all" ? undefined : meal, maxMinutes: quick ? 20 : undefined, query }),
    [eats, avoid, age, meal, quick, query]
  );
  const hidden = RECIPES.length - filterRecipes(RECIPES, { eats, avoid, age }).length;

  return (
    <div className="pt-14 px-5 max-w-lg mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-ink-soft mb-5"><ArrowLeft className="w-5 h-5" /><span className="font-bold text-sm">Home</span></Link>
      <div className="flex items-end justify-between mb-1">
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-brand uppercase">Cook & log</div>
          <h1 className="font-display text-[32px] font-black tracking-tight leading-none">Recipes</h1>
        </div>
        <Link href="/plan" className="text-sm font-bold text-brand">Meal plan →</Link>
      </div>
      <p className="text-sm font-medium text-ink-soft mb-4">
        {list.length} recipe{list.length === 1 ? "" : "s"} for {name}{hidden > 0 ? ` · ${hidden} hidden for diet, allergy or age` : ""}.
      </p>

      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recipes or ingredients (paneer, dal, ragi…)" aria-label="Search recipes"
          className="w-full bg-white rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-brand border border-surface-line" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-2">
        {MEALS.map((m) => (
          <button key={m.v} onClick={() => setMeal(m.v)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border ${meal === m.v ? "bg-ink text-white border-ink" : "bg-white text-ink border-surface-line"}`}>{m.l}</button>
        ))}
        <button onClick={() => setQuick((q) => !q)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-1 ${quick ? "bg-brand text-white border-brand" : "bg-white text-ink border-surface-line"}`}><Clock className="w-3.5 h-3.5" />Under 20 min</button>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-16 text-sm font-medium text-ink-soft">No recipes match. Try clearing a filter.</div>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id}>
              <button onClick={() => setOpen(r)} className="w-full text-left bg-white rounded-[24px] border border-surface-line shadow-sm p-4 active:scale-[0.99] transition-transform">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-black text-ink leading-snug">{r.name}</h3>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${DIET_CLS[r.diet]}`}>{DIET_LABEL[r.diet]}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs font-bold text-ink-soft">
                  <span className="text-ink">{r.perServing.kcal} kcal</span>
                  <span>P {Math.round(r.perServing.protein)}g</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.minutes} min</span>
                  <span className="text-ink-faint">{r.cuisine}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <RecipeSheet recipe={open} userId={userId} accountUserId={accountUserId} onClose={() => setOpen(null)} />}
    </div>
  );
}

function RecipeSheet({ recipe: r, userId, accountUserId, onClose }: { recipe: Recipe; userId: string; accountUserId: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [session, setSession] = useState<MealSession>(sessionFor(r));
  const [busy, setBusy] = useState(false);
  const ings = scaledIngredients(r, scale * r.servings);
  const k = (n: number) => Math.round(n * scale);

  const log = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await enqueueOp({ userId, ownerId: accountUserId, kind: "meal_manual", eatenAt: Date.now(), meal: mealFromRecipe(r, scale, session) });
      showToast(`Logged ${r.name}`);
      onClose();
    } catch (e: any) { showToast(e?.message || "Couldn't log that meal"); }
    setBusy(false);
  };
  const toGrocery = async () => {
    setBusy(true);
    try { showToast(groceryToast(await addToGrocery(userId, accountUserId, ings.map((i) => `${i.name} (${Math.round(i.grams)} g)`)))); }
    catch (e: any) { showToast(e?.message || "Couldn't update the grocery list"); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-[32px] p-5 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={r.name}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-display text-2xl font-black tracking-tight leading-tight">{r.name}</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-surface-muted text-ink-soft shrink-0"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4 text-[11px] font-bold">
          <span className={`px-2.5 py-1 rounded-full ${DIET_CLS[r.diet]}`}>{DIET_LABEL[r.diet]}</span>
          <span className="px-2.5 py-1 rounded-full bg-surface-muted text-ink-soft">{r.minutes} min</span>
          <span className="px-2.5 py-1 rounded-full bg-surface-muted text-ink-soft">{r.cuisine}</span>
          {r.allergens.length > 0 && <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">Contains {r.allergens.join(", ")}</span>}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-bold text-ink-soft flex-1">Portion</span>
          <button onClick={() => setScale((s) => Math.max(0.5, s - 0.5))} aria-label="Smaller" className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center"><Minus className="w-4 h-4" /></button>
          <span className="w-12 text-center font-black text-lg">{scale}×</span>
          <button onClick={() => setScale((s) => Math.min(6, s + 0.5))} aria-label="Larger" className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center"><Plus className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-5 text-center">
          {[["kcal", k(r.perServing.kcal)], ["Protein", `${k(r.perServing.protein)}g`], ["Carbs", `${k(r.perServing.carbs)}g`], ["Fat", `${k(r.perServing.fat)}g`]].map(([l, v]) => (
            <div key={String(l)} className="rounded-2xl bg-surface-muted py-2.5"><div className="text-[9px] font-bold text-ink-soft uppercase">{l}</div><div className="font-black text-ink">{v}</div></div>
          ))}
        </div>

        <h3 className="text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2">Ingredients</h3>
        <ul className="mb-4 divide-y divide-surface-line">
          {ings.map((i) => <li key={i.foodId} className="flex justify-between py-2 text-sm"><span className="font-medium text-ink">{i.name}</span><span className="font-bold text-ink-soft">{Math.round(i.grams)} g</span></li>)}
        </ul>
        <h3 className="text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2">Method</h3>
        <ol className="mb-5 space-y-2">
          {r.steps.map((s, i) => <li key={i} className="flex gap-3 text-sm font-medium text-ink leading-relaxed"><span className="w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span><span>{s}</span></li>)}
        </ol>

        <div className="flex gap-1.5 mb-3">
          {(["Breakfast", "Lunch", "Snack", "Dinner"] as MealSession[]).map((s) => (
            <button key={s} onClick={() => setSession(s)} className={`flex-1 py-2 rounded-full text-[11px] font-bold uppercase ${session === s ? "bg-ink text-white" : "bg-surface-muted text-ink-soft"}`}>{s}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={toGrocery} disabled={busy} className="px-4 rounded-[16px] bg-surface-muted text-ink font-bold text-sm flex items-center gap-2 disabled:opacity-50" aria-label="Add ingredients to grocery list"><ShoppingBasket className="w-4 h-4" /></button>
          <button onClick={log} disabled={busy} className="flex-1 py-3.5 rounded-[16px] bg-brand text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand/30 disabled:opacity-60"><Check className="w-5 h-5" />Log this meal</button>
        </div>
      </div>
    </div>
  );
}
