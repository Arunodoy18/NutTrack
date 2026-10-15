"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Search, Users, CalendarDays, Play, RotateCcw, Check, Plus, X, Baby, Droplets, ShieldCheck } from "lucide-react";
import { searchFoods, portionOf, type Food, type Diet, type Allergen } from "@/lib/foods";
import { generatePlan } from "@/lib/foods/planner";
import { getRecipe, filterRecipes, RECIPES } from "@/lib/foods/recipes";
import { computeFullProfile } from "@/lib/nutritionEngine";
import { dailyWaterGoalMl } from "@/lib/hydration";

/* A live, tappable copy of Nura's real engines (food database, nutrition targets, meal planner) so people can try the
   app on the page instead of reading about it. Nothing here is sent anywhere. */

type Tab = "scan" | "search" | "family" | "plan";
const TABS: { id: Tab; label: string; icon: typeof Camera }[] = [
  { id: "scan", label: "Scan a plate", icon: Camera },
  { id: "search", label: "Search a food", icon: Search },
  { id: "family", label: "Family targets", icon: Users },
  { id: "plan", label: "Meal plan", icon: CalendarDays },
];

const PERSONAS = [
  { id: "aarav", name: "Aarav", age: 8, gender: "Male", kg: 26, cm: 128, act: "Moderately active", emoji: "🧒" },
  { id: "meera", name: "Meera", age: 14, gender: "Female", kg: 48, cm: 158, act: "Moderately active", emoji: "👧" },
  { id: "asha", name: "Asha", age: 35, gender: "Female", kg: 62, cm: 165, act: "Lightly active", emoji: "👩" },
  { id: "rohan", name: "Rohan", age: 40, gender: "Male", kg: 82, cm: 175, act: "Lightly active", emoji: "👨" },
  { id: "dadi", name: "Dadi", age: 68, gender: "Female", kg: 58, cm: 152, act: "Sedentary", emoji: "👵" },
];
const GOALS = ["Lose weight", "Maintain", "Build muscle"] as const;
const DIETS: { id: "any" | Diet; label: string }[] = [{ id: "any", label: "Anything" }, { id: "vegetarian", label: "Vegetarian" }, { id: "egg", label: "Eggetarian" }, { id: "vegan", label: "Vegan" }];
const ALLERGENS: { id: Allergen; label: string }[] = [{ id: "peanut", label: "Peanut" }, { id: "milk", label: "Milk" }, { id: "gluten", label: "Gluten" }, { id: "egg", label: "Egg" }];
const SUGGEST = ["paneer", "dosa", "banana", "dal", "biryani"];
const PLATE_QUERIES: [string, number][] = [["tofu", 120], ["boiled egg", 100], ["sweet corn", 50], ["cucumber", 60], ["tomato", 60], ["lettuce", 30]];

const ring = (pct: number) => 2 * Math.PI * 54 * (1 - Math.min(1, Math.max(0, pct)));

export default function LiveDemo() {
  const reduced = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("scan");
  const [touched, setTouched] = useState(false); // the visitor took over: stop the automatic tour
  const [touring, setTouring] = useState(false);
  // Two independent sets of timers: the plate-scan animation and the automatic tour. Replaying the scan must not cancel the tour.
  const scanTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tourTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const laterScan = (ms: number, fn: () => void) => { scanTimers.current.push(setTimeout(fn, ms)); };
  const later = (ms: number, fn: () => void) => { tourTimers.current.push(setTimeout(fn, ms)); };
  const clearScan = () => { scanTimers.current.forEach(clearTimeout); scanTimers.current = []; };
  const clearTour = () => { tourTimers.current.forEach(clearTimeout); tourTimers.current = []; };

  /* ── scan ── */
  const [phase, setPhase] = useState(0); // 0 idle · 1 scanning · 2 identifying · 3 result · 4 logged
  const [revealed, setRevealed] = useState(0);
  const plate = useMemo(() => PLATE_QUERIES.map(([q, g]) => { const f = searchFoods(q, 1)[0]; return f ? { food: f, p: portionOf(f, g) } : null; }).filter(Boolean) as { food: Food; p: ReturnType<typeof portionOf> }[], []);
  const plateTotal = useMemo(() => plate.reduce((a, x) => ({ kcal: a.kcal + x.p.kcal, protein: a.protein + x.p.protein, carbs: a.carbs + x.p.carbs, fat: a.fat + x.p.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [plate]);
  const runScan = useCallback(() => {
    clearScan(); setPhase(1); setRevealed(0);
    const fast = reduced.current;
    laterScan(fast ? 0 : 1900, () => setPhase(2));
    plate.forEach((_, i) => laterScan((fast ? 0 : 1900) + (fast ? 0 : 450 * (i + 1)), () => setRevealed(i + 1)));
    laterScan((fast ? 0 : 1900) + (fast ? 0 : 450 * plate.length + 500), () => setPhase(3));
  }, [plate]);

  /* ── search ── */
  const [query, setQuery] = useState("");
  const results = useMemo(() => (query.trim() ? searchFoods(query, 6) : []), [query]);
  const [picked, setPicked] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [tray, setTray] = useState<{ food: Food; grams: number }[]>([]);
  const pickFood = (f: Food) => { setPicked(f); setGrams(f.servings[0]?.grams ?? 100); };
  const addToTray = () => { if (picked) { setTray((t) => [...t, { food: picked, grams }].slice(-6)); setPicked(null); setQuery(""); } };
  const trayTotal = tray.reduce((a, x) => a + portionOf(x.food, x.grams).kcal, 0);

  /* ── family ── */
  const [who, setWho] = useState("asha");
  const [goal, setGoal] = useState<(typeof GOALS)[number]>("Maintain");
  const person = PERSONAS.find((p) => p.id === who)!;
  const child = person.age < 18;
  const prof = useMemo(() => computeFullProfile(person.kg, person.cm, person.age, person.gender, person.act, child ? "Maintain" : goal), [person, goal, child]);
  const water = dailyWaterGoalMl(person.age, person.gender, person.act);

  /* ── plan ── */
  const [diet, setDiet] = useState<"any" | Diet>("any");
  const [avoid, setAvoid] = useState<Allergen[]>([]);
  const [day, setDay] = useState(0);
  const [seed, setSeed] = useState("demo");
  const planProfile = useMemo(() => computeFullProfile(62, 165, 35, "Female", "Lightly active", "Maintain"), []);
  const pool = useMemo(() => filterRecipes(RECIPES, { eats: diet, avoid, age: 35 }).length, [diet, avoid]);
  const plan = useMemo(() => generatePlan({ targets: { calories: planProfile.macros.calories, protein: planProfile.macros.proteinG }, constraints: { eats: diet, avoid, age: 35 }, seed, days: 7 }), [planProfile, diet, avoid, seed]);
  const toggleAvoid = (a: Allergen) => setAvoid((l) => (l.includes(a) ? l.filter((x) => x !== a) : [...l, a]));

  /* ── automatic tour ("watch") ── */
  const stopTour = useCallback(() => { setTouring(false); clearTour(); }, []);
  const startTour = useCallback(() => {
    clearTour(); clearScan(); setTouring(true); setTouched(false);
    setTab("scan"); setPhase(0); setQuery(""); setPicked(null); setTray([]); setWho("asha"); setDiet("any"); setAvoid([]);
    const f = reduced.current ? 0.01 : 1;
    later(300 * f, () => { setTab("scan"); runScan(); });
    later(9500 * f, () => setPhase(4));                                  // the tour taps "Log meal"
    later(12500 * f, () => { setTab("search"); setQuery(""); });
    "paneer".split("").forEach((_, i) => later((13200 + i * 140) * f, () => setQuery("paneer".slice(0, i + 1))));
    later(14800 * f, () => { const x = searchFoods("paneer", 1)[0]; if (x) pickFood(x); });
    later(16200 * f, () => setGrams(150));
    later(17400 * f, () => { setTray([{ food: searchFoods("paneer", 1)[0], grams: 150 }]); setPicked(null); setQuery(""); });
    later(19500 * f, () => { setTab("family"); setWho("aarav"); });
    later(21300 * f, () => setWho("asha"));
    later(23100 * f, () => setWho("dadi"));
    later(25000 * f, () => { setTab("plan"); setDiet("any"); setAvoid([]); });
    later(26500 * f, () => setDiet("vegan"));
    later(28000 * f, () => setAvoid(["peanut"]));
    later(30500 * f, () => setTouring(false));
  }, [runScan]);

  useEffect(() => { reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false; }, []);
  // First view: play the plate scan on its own so there is something to watch right away.
  useEffect(() => { if (tab === "scan" && phase === 0 && !touched && !touring) { const t = setTimeout(runScan, 700); return () => clearTimeout(t); } }, [tab, phase, touched, touring, runScan]);
  useEffect(() => () => { clearScan(); clearTour(); }, []);

  // Any touch, key press or click inside the demo hands control to the visitor.
  const takeOver = (e?: React.SyntheticEvent) => {
    if (e && (e.target as HTMLElement | null)?.closest?.("[data-tour-toggle]")) return; // the tour button handles itself
    if (touring) stopTour();
    setTouched(true);
  };

  const select = (t: Tab) => { takeOver(); setTab(t); if (t === "scan" && phase === 0) runScan(); };

  const goal2 = 2556;
  const logged = phase === 4 ? Math.round(plateTotal.kcal) : 0;
  const trayP = tray.reduce((a, x) => { const p = portionOf(x.food, x.grams); return { protein: a.protein + p.protein, carbs: a.carbs + p.carbs, fat: a.fat + p.fat }; }, { protein: 0, carbs: 0, fat: 0 });

  const chip = (on: boolean) => `shrink-0 rounded-full border px-3 py-2 text-xs font-bold transition ${on ? "border-brand bg-brand text-white" : "border-surface-line bg-white text-ink"}`;

  return (
    <div ref={root} onPointerDownCapture={(e) => takeOver(e)} onKeyDownCapture={(e) => takeOver(e)} className="mx-auto max-w-5xl px-4">
      <style>{`
        @keyframes nl-scan{0%{top:2%}100%{top:96%}}
        @keyframes nl-pop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}
        .nl-pop{animation:nl-pop .35s ease both}
        .nl-laser{animation:nl-scan 1.9s ease-in-out both}
        @media (prefers-reduced-motion: reduce){.nl-pop,.nl-laser{animation:none}}
      `}</style>

      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[1fr_340px] md:grid-rows-[auto_1fr] md:gap-x-8 md:gap-y-4">
        {/* tabs + options (on a phone these sit right above the demo phone so both stay on screen) */}
        <div className="order-1 min-w-0 md:col-start-1 md:row-start-1">
          <div role="tablist" aria-label="Try Nura" className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] md:flex-wrap">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => select(id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 text-sm font-bold transition ${tab === id ? "border-ink bg-ink text-white" : "border-surface-line bg-white text-ink"}`}>
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-3xl border border-surface-line bg-white p-5">
            {tab === "scan" && (
              <div>
                <h3 className="font-black">Point at a plate. Get the numbers.</h3>
                <p className="mt-1 text-sm font-medium text-ink-soft">Watch Nura find each food on this bowl and add up the nutrition from its food database. Then tap <b className="text-ink">Log meal</b> to see your day fill up.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => { takeOver(); setPhase(0); runScan(); }} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white"><RotateCcw className="h-4 w-4" aria-hidden /> Replay</button>
                </div>
              </div>
            )}
            {tab === "search" && (
              <div>
                <h3 className="font-black">Search 158 foods, even with typos</h3>
                <p className="mt-1 text-sm font-medium text-ink-soft">Tap a suggestion or type in the phone. Pick a food, choose a portion, and build a meal.</p>
                <div className="mt-3 flex flex-wrap gap-2">{SUGGEST.map((s) => <button key={s} onClick={() => { setQuery(s); setPicked(null); }} className={chip(query === s)}>{s}</button>)}</div>
              </div>
            )}
            {tab === "family" && (
              <div>
                <h3 className="font-black">Everyone gets targets that fit them</h3>
                <p className="mt-1 text-sm font-medium text-ink-soft">Pick a family member. Children get growth-based targets, never a weight-loss deficit.</p>
                <div className="mt-3 flex flex-wrap gap-2">{PERSONAS.map((p) => <button key={p.id} onClick={() => setWho(p.id)} className={chip(who === p.id)}>{p.emoji} {p.name} · {p.age}</button>)}</div>
                {!child && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-ink-soft">Goal</span>{GOALS.map((g) => <button key={g} onClick={() => setGoal(g)} className={chip(goal === g)}>{g}</button>)}</div>}
              </div>
            )}
            {tab === "plan" && (
              <div>
                <h3 className="font-black">A week of meals that are safe for you</h3>
                <p className="mt-1 text-sm font-medium text-ink-soft">Choose a diet and any allergies. The plan rebuilds instantly and will never include a recipe with an allergen you avoid.</p>
                <div className="mt-3 flex flex-wrap gap-2">{DIETS.map((d) => <button key={d.id} onClick={() => setDiet(d.id)} className={chip(diet === d.id)}>{d.label}</button>)}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-ink-soft">Avoid</span>{ALLERGENS.map((a) => <button key={a.id} onClick={() => toggleAvoid(a.id)} className={chip(avoid.includes(a.id))}>{a.label}</button>)}</div>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {pool} of {RECIPES.length} recipes fit</p>
              </div>
            )}
          </div>

        </div>

        {/* tour */}
        <div className="order-first min-w-0 md:order-none md:col-start-1 md:row-start-2 md:self-start">
          <div className="flex flex-wrap items-center gap-3">
            <button data-tour-toggle onClick={() => (touring ? stopTour() : startTour())} className="inline-flex items-center gap-2 rounded-full border-2 border-brand px-5 py-3 text-sm font-bold text-brand">
              {touring ? <><X className="h-4 w-4" aria-hidden /> Stop the tour</> : <><Play className="h-4 w-4" aria-hidden /> Watch the 30-second tour</>}
            </button>
            <span className="text-xs font-medium text-ink-soft">Runs on real app logic. Nothing you do here is saved or sent.</span>
          </div>
        </div>

        {/* phone */}
        <div className="order-2 min-w-0 md:col-start-2 md:row-span-2 md:row-start-1">
          <div className="relative mx-auto h-[560px] w-[300px] overflow-hidden rounded-[44px] border-[9px] border-ink bg-surface shadow-2xl shadow-ink/25">
            <div className="absolute left-1/2 top-2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-ink" aria-hidden />
            <div className="flex h-full flex-col pt-9">
              <div className="flex items-center justify-between px-4 pb-2">
                <span className="font-display text-lg font-black">Nu<span className="text-brand">ra</span></span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-ink-soft">{tab === "scan" ? "Scanner" : tab === "search" ? "Manual" : tab === "family" ? "Family" : "Plan"}</span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 [scrollbar-width:none]">
                {tab === "scan" && (
                  <div>
                    {phase < 3 && (
                      <div className="relative overflow-hidden rounded-3xl bg-ink">
                        <img src="/landing/plate.webp" alt="A salad bowl with tofu, eggs, corn and vegetables" width={280} height={280} className="block aspect-square w-full object-cover" />
                        {phase === 1 && <div className="nl-laser pointer-events-none absolute inset-x-0 h-0.5 bg-brand shadow-[0_0_16px_4px_rgba(252,76,2,.7)]" aria-hidden />}
                        <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white">{phase === 0 ? "Ready" : phase === 1 ? "Analysing…" : "Identifying foods…"}</div>
                      </div>
                    )}
                    {phase >= 2 && (
                      <div className={phase >= 3 ? "" : "mt-3"}>
                        {phase >= 3 && <div className="nl-pop rounded-3xl bg-white p-4 text-center"><div className="text-[10px] font-black uppercase tracking-widest text-ink-soft">Salad bowl · lunch</div><div className="mt-1 font-display text-5xl font-black">{Math.round(plateTotal.kcal)}<span className="ml-1 text-base font-bold text-ink-soft">kcal</span></div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-black">
                            <div className="rounded-2xl bg-emerald-50 p-2 text-emerald-700">Protein<br /><span className="text-base">{Math.round(plateTotal.protein)}g</span></div>
                            <div className="rounded-2xl bg-amber-50 p-2 text-amber-700">Fat<br /><span className="text-base">{Math.round(plateTotal.fat)}g</span></div>
                            <div className="rounded-2xl bg-violet-50 p-2 text-violet-700">Carbs<br /><span className="text-base">{Math.round(plateTotal.carbs)}g</span></div>
                          </div></div>}
                        <ul className="mt-2 space-y-1.5">
                          {plate.slice(0, revealed).map(({ food, p }) => (
                            <li key={food.id} className="nl-pop flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-xs"><span className="min-w-0 truncate font-bold">{food.name}<span className="ml-1 font-medium text-ink-soft">{Math.round(p.grams)} g</span></span><span className="ml-2 shrink-0 font-black">{p.kcal} kcal</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {phase === 3 && <button onClick={() => { takeOver(); setPhase(4); }} className="nl-pop mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-sm font-black text-white"><Check className="h-4 w-4" aria-hidden /> Log meal</button>}
                    {phase === 4 && (
                      <div className="nl-pop mt-3 rounded-3xl bg-white p-4 text-center">
                        <div className="text-xs font-black text-emerald-700">Logged to lunch ✓</div>
                        <svg viewBox="0 0 120 120" className="mx-auto mt-2 h-36 w-36" role="img" aria-label={`${logged} of ${goal2} calories`}>
                          <circle cx="60" cy="60" r="54" fill="none" stroke="#E7E7EB" strokeWidth="9" />
                          <circle cx="60" cy="60" r="54" fill="none" stroke="#FC4C02" strokeWidth="9" strokeLinecap="round" strokeDasharray={2 * Math.PI * 54} strokeDashoffset={ring(logged / goal2)} transform="rotate(-90 60 60)" style={{ transition: reduced.current ? "none" : "stroke-dashoffset 1.1s ease" }} />
                          <text x="60" y="58" textAnchor="middle" className="fill-ink" fontSize="22" fontWeight="900">{logged}</text>
                          <text x="60" y="74" textAnchor="middle" fill="#6B6B76" fontSize="9" fontWeight="700">of {goal2} kcal</text>
                        </svg>
                        <div className="text-[11px] font-bold text-ink-soft">{goal2 - logged} kcal left today</div>
                      </div>
                    )}
                  </div>
                )}

                {tab === "search" && (
                  <div>
                    <label className="flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm"><Search className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                      <input value={query} onChange={(e) => { setQuery(e.target.value); setPicked(null); }} placeholder="roti, dal, banana, paneer…" className="w-full bg-transparent font-medium outline-none" aria-label="Search foods" /></label>
                    {!picked && results.length > 0 && (
                      <ul className="mt-2 space-y-1.5">{results.map((f) => (
                        <li key={f.id}><button onClick={() => pickFood(f)} className="nl-pop w-full rounded-2xl bg-white px-3 py-2.5 text-left"><div className="text-sm font-black leading-tight">{f.name}</div><div className="text-[11px] font-medium text-ink-soft">{f.per100.kcal} kcal · P {f.per100.protein} · C {f.per100.carbs} · F {f.per100.fat} per 100 g</div></button></li>
                      ))}</ul>
                    )}
                    {!picked && !query && <p className="mt-6 px-2 text-center text-xs font-medium text-ink-soft">Try typing <b className="text-ink">“panner”</b> or <b className="text-ink">“dosa”</b>. Typos are forgiven.</p>}
                    {picked && (() => { const p = portionOf(picked, grams); return (
                      <div className="nl-pop mt-2 rounded-3xl bg-white p-4">
                        <div className="text-sm font-black">{picked.name}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">{picked.servings.slice(0, 3).map((s) => <button key={s.label} onClick={() => setGrams(s.grams)} className={chip(grams === s.grams)}>{s.label}</button>)}</div>
                        <input type="range" min={10} max={500} step={5} value={grams} onChange={(e) => setGrams(Number(e.target.value))} className="mt-3 w-full accent-brand" aria-label="Grams" />
                        <div className="flex items-end justify-between"><span className="text-xs font-bold text-ink-soft">{grams} g</span><span className="font-display text-3xl font-black">{p.kcal}<span className="ml-1 text-sm font-bold text-ink-soft">kcal</span></span></div>
                        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[10px] font-black"><div className="rounded-xl bg-emerald-50 py-1.5 text-emerald-700">P {p.protein}g</div><div className="rounded-xl bg-amber-50 py-1.5 text-amber-700">F {p.fat}g</div><div className="rounded-xl bg-violet-50 py-1.5 text-violet-700">C {p.carbs}g</div></div>
                        <button onClick={addToTray} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-ink py-3 text-sm font-black text-white"><Plus className="h-4 w-4" aria-hidden /> Add to meal</button>
                      </div>); })()}
                    {tray.length > 0 && (
                      <div className="nl-pop mt-3 rounded-3xl bg-white p-3">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-ink-soft"><span>Your meal</span><button onClick={() => setTray([])} className="font-bold normal-case tracking-normal text-brand">Clear</button></div>
                        <ul className="mt-1 space-y-1">{tray.map((x, i) => <li key={i} className="flex justify-between text-xs"><span className="truncate font-bold">{x.food.name} <span className="font-medium text-ink-soft">{x.grams} g</span></span><span className="ml-2 font-black">{portionOf(x.food, x.grams).kcal}</span></li>)}</ul>
                        <div className="mt-2 flex items-end justify-between border-t border-dashed border-surface-line pt-2"><span className="text-[11px] font-bold text-ink-soft">P {Math.round(trayP.protein)}g · C {Math.round(trayP.carbs)}g · F {Math.round(trayP.fat)}g</span><span className="font-display text-2xl font-black">{trayTotal} kcal</span></div>
                      </div>
                    )}
                  </div>
                )}

                {tab === "family" && (
                  <div className="nl-pop" key={who + goal}>
                    <div className="rounded-3xl bg-white p-4 text-center">
                      <div className="text-5xl" aria-hidden>{person.emoji}</div>
                      <div className="mt-1 text-lg font-black">{person.name}</div>
                      <div className="text-xs font-medium text-ink-soft">{person.age} years · {person.gender === "Male" ? "boy/man" : "girl/woman"} · {person.kg} kg · {person.cm} cm</div>
                      {child && <div className="mx-auto mt-2 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700"><Baby className="h-3 w-3" aria-hidden /> Growth targets · no weight-loss goal</div>}
                    </div>
                    <div className="mt-2 rounded-3xl bg-white p-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-ink-soft">Daily target</div>
                      <div className="font-display text-5xl font-black">{prof.macros.calories}<span className="ml-1 text-base font-bold text-ink-soft">kcal</span></div>
                      {[["Protein", prof.macros.proteinG, "bg-emerald-500"], ["Carbs", prof.macros.carbsG, "bg-violet-500"], ["Fat", prof.macros.fatG, "bg-amber-500"], ["Fibre", prof.macros.fiberG, "bg-lime-600"]].map(([n, v, c]) => (
                        <div key={n as string} className="mt-2"><div className="flex justify-between text-[11px] font-black"><span>{n}</span><span>{v as number} g</span></div><div className="mt-0.5 h-2 rounded-full bg-surface-line"><div className={`h-2 rounded-full ${c} transition-all duration-700`} style={{ width: `${Math.min(100, ((v as number) / (n === "Carbs" ? 400 : n === "Protein" ? 160 : n === "Fat" ? 120 : 45)) * 100)}%` }} /></div></div>
                      ))}
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-sky-700"><Droplets className="h-4 w-4" aria-hidden /> {(water / 1000).toFixed(2)} L water a day</div>
                    </div>
                  </div>
                )}

                {tab === "plan" && (
                  <div>
                    <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none]">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => <button key={d} onClick={() => setDay(i)} className={`shrink-0 rounded-2xl px-3 py-2 text-[11px] font-black ${day === i ? "bg-ink text-white" : "bg-white text-ink"}`}>{d}</button>)}</div>
                    <div className="rounded-2xl bg-white px-3 py-2 text-[11px] font-black">{Math.round(plan[day].totals.kcal)} kcal <span className="font-medium text-ink-soft">of {planProfile.macros.calories} · P {Math.round(plan[day].totals.protein)}g</span></div>
                    <ul className="mt-2 space-y-2">
                      {plan[day].meals.map((m) => { const r = getRecipe(m.recipeId); return (
                        <li key={m.slot + m.recipeId} className="nl-pop rounded-3xl bg-white p-3">
                          <div className="text-[10px] font-black uppercase tracking-widest text-brand">{m.slot}</div>
                          <div className="text-sm font-black leading-tight">{r?.name}</div>
                          <div className="mt-0.5 flex items-center justify-between text-[11px] font-medium text-ink-soft"><span>{Math.round(m.kcal)} kcal · P {Math.round(m.protein)}g · {m.scale}× portion</span></div>
                        </li>); })}
                    </ul>
                    <button onClick={() => setSeed(Math.random().toString(36).slice(2, 7))} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white py-3 text-xs font-black"><RotateCcw className="h-3.5 w-3.5" aria-hidden /> New week</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs font-medium text-ink-soft" aria-live="polite">{touring ? "Tour running — tap anything to take over" : "Tap and try it yourself"}</p>
        </div>
      </div>
    </div>
  );
}
