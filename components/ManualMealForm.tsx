"use client";

import React, { useState } from "react";
import { Check, PenLine } from "lucide-react";
import { enqueueOp } from "@/lib/offlineQueue";
import { MEAL_SESSIONS, guessMealSession, type MealSession } from "@/lib/offlineTypes";

interface Props {
  /** The profile being tracked. */
  userId: string;
  /** The signed-in account (owns the offline queue). */
  accountUserId?: string;
  /** Called after the meal is safely stored on this device. */
  onSaved: (name: string) => void;
}

const field =
  "w-full bg-white/10 text-white placeholder:text-white/40 rounded-2xl px-4 py-3 text-base font-bold outline-none focus:ring-2 focus:ring-brand border border-white/10";

/**
 * Log a meal by typing it in. Works with no connection: the meal goes into the
 * on-device outbox (shows up instantly) and syncs automatically later.
 */
export default function ManualMealForm({ userId, accountUserId, onSaved }: Props) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [session, setSession] = useState<MealSession>(guessMealSession(Date.now()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const n = (v: string) => (v.trim() === "" ? 0 : Number(v));
  const cal = n(calories);
  const valid =
    name.trim().length > 0 &&
    calories.trim() !== "" &&
    [calories, protein, carbs, fat, fiber].every((v) => v.trim() === "" || (Number(v) >= 0 && Number.isFinite(Number(v)))) &&
    cal <= 20000;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      await enqueueOp({
        userId,
        ownerId: accountUserId ?? userId,
        kind: "meal_manual",
        eatenAt: Date.now(),
        meal: {
          name: name.trim().slice(0, 100),
          mealSession: session,
          totalCalories: Math.round(cal),
          totalProtein: Math.round(n(protein)),
          totalCarbs: Math.round(n(carbs)),
          totalFat: Math.round(n(fat)),
          totalFiber: Math.round(n(fiber)),
        },
      });
      onSaved(name.trim());
    } catch (e: any) {
      setError(e?.message || "Couldn't save on this device. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 overflow-y-auto px-6 pt-24 pb-6 text-white">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
          <PenLine className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-black leading-tight">Log it yourself</h2>
          <p className="text-xs text-white/60 font-medium">Works offline — syncs when you&apos;re back online.</p>
        </div>
      </div>

      <div className="space-y-3">
        <input
          className={field}
          placeholder="What did you eat? e.g. Dal rice"
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          aria-label="Meal name"
        />

        <div className="flex gap-2">
          {MEAL_SESSIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSession(s)}
              className={`flex-1 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all ${
                session === s ? "bg-white text-black" : "bg-white/10 text-white/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            className={`${field} pr-16`}
            placeholder="Calories"
            inputMode="numeric"
            type="number"
            min={0}
            max={20000}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            aria-label="Calories"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/50">kcal</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            ["Protein", protein, setProtein],
            ["Carbs", carbs, setCarbs],
            ["Fat", fat, setFat],
            ["Fibre", fiber, setFiber],
          ].map(([label, value, setter]: any) => (
            <div key={label} className="relative">
              <input
                className={`${field} pr-9`}
                placeholder={label}
                inputMode="numeric"
                type="number"
                min={0}
                max={1000}
                value={value}
                onChange={(e) => setter(e.target.value)}
                aria-label={label}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/50">g</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/45 font-medium">Only calories are required. Macros are optional.</p>

        {error && <p className="text-sm font-bold text-red-400">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={!valid || saving}
          className={`w-full mt-2 py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all ${
            valid && !saving ? "bg-brand text-white shadow-lg shadow-brand/40 active:scale-[0.98]" : "bg-white/10 text-white/40"
          }`}
        >
          <Check className="w-5 h-5" />
          {saving ? "Saving…" : "Save meal"}
        </button>
      </div>
    </div>
  );
}
