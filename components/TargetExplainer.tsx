"use client";

import React from "react";
import { X } from "lucide-react";
import { ACTIVITY_MULTIPLIERS, GOAL_ADJUSTMENTS, computeFullProfile, isChildAge, mapProfileGoalToLabel } from "@/lib/nutritionEngine";

export interface TargetBasis { weightKg: number; heightCm: number; age: number; gender: string; activityLevel: string; goal: string }

/** Shows, in plain steps, exactly how today's calorie target was built, and how to check it against real life. */
export default function TargetExplainer({ basis, shown, onClose, onEdit }: { basis: TargetBasis; shown: number; onClose: () => void; onEdit: () => void }) {
  const child = isChildAge(basis.age);
  const label = mapProfileGoalToLabel(basis.goal);
  const p = computeFullProfile(basis.weightKg, basis.heightCm, basis.age, basis.gender, basis.activityLevel, basis.goal);
  const factor = ACTIVITY_MULTIPLIERS[basis.activityLevel] ?? 1.55;
  const adj = child ? 0 : GOAL_ADJUSTMENTS[label] ?? 0;
  const worked = p.macros.calories;
  const stale = Math.abs(worked - shown) > 25;

  const Step = ({ n, title, value, body }: { n: number; title: string; value: string; body: string }) => (
    <li className="flex gap-3">
      <span className="w-7 h-7 shrink-0 rounded-full bg-brand/10 text-brand text-xs font-black flex items-center justify-center mt-0.5">{n}</span>
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-3"><span className="font-bold text-ink text-sm">{title}</span><span className="font-black text-ink tabular-nums text-sm shrink-0">{value}</span></div>
        <p className="mt-0.5 text-xs text-ink-soft leading-relaxed">{body}</p>
      </div>
    </li>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={onClose} role="dialog" aria-modal="true" aria-label="How your calorie target is worked out">
      <div className="w-full max-w-lg max-h-[88%] overflow-y-auto rounded-t-[32px] bg-white px-6 pt-5 pb-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-widest text-brand uppercase">Your daily target</p>
            <h2 className="font-display text-3xl font-black text-ink leading-tight">{shown} kcal</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
        <p className="mt-2 text-xs text-ink-soft leading-relaxed">Built from your details: {basis.age} years, {basis.gender.toLowerCase()}, {basis.heightCm} cm, {basis.weightKg} kg, &ldquo;{basis.activityLevel.toLowerCase()}&rdquo;.</p>

        <ol className="mt-5 space-y-4">
          {child ? (
            <>
              <Step n={1} title="Energy for growing" value={`${p.tdee} kcal`} body="For under-18s Nura uses the Institute of Medicine's energy equation for children and teens. It includes the extra energy growth needs." />
              <Step n={2} title="No dieting targets" value="+0" body="Children and teens never get a weight-loss or bulking target. The goal is steady growth and enough fuel to play." />
            </>
          ) : (
            <>
              <Step n={1} title="Resting burn (BMR)" value={`${p.bmr} kcal`} body="What your body uses just to stay alive, lying still. Mifflin–St Jeor equation, the standard used by dietitians." />
              <Step n={2} title={`× ${factor} for "${basis.activityLevel}"`} value={`${p.tdee} kcal`} body="Your maintenance: roughly what you burn in a normal day, including moving around and exercise." />
              <Step n={3} title={label === "Maintenance" ? "Goal: maintain weight" : `Goal: ${label.toLowerCase()}`} value={`${adj > 0 ? "+" : ""}${adj} kcal`} body={adj < 0 ? "A moderate deficit, about 0.45 kg (1 lb) a week. Never below a safe floor." : adj > 0 ? "A small surplus so extra food goes to muscle, not just fat." : "Eating at maintenance keeps your weight steady."} />
            </>
          )}
        </ol>
        {stale && <p className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 leading-relaxed">These details work out to <b>{worked} kcal</b>, but your saved target is <b>{shown}</b>. It was set when you last saved your profile. Tap &ldquo;Edit my details&rdquo; and save to recalculate.</p>}

        <div className="mt-6 rounded-2xl bg-surface-muted p-4">
          <h3 className="font-black text-ink text-sm">Is it right for you? Check it for real</h3>
          <ol className="mt-2 list-decimal pl-4 space-y-1.5 text-xs text-ink-soft leading-relaxed">
            <li>Eat close to your target for <b className="text-ink">2–3 weeks</b> and weigh yourself the same time each week (Insights shows your trend).</li>
            <li>{child ? "A growing child should gain weight and height steadily. Check with their doctor, not the scale alone." : <>If your goal is to <b className="text-ink">maintain</b> and your weight stays within ±0.5 kg, the number is right for your body.</>}</li>
            {!child && <li>Gaining or losing faster than you want? Edit your details and pick the <b className="text-ink">next activity level down or up</b>. Each step moves the target by about 200 kcal.</li>}
            <li>Pick your activity level by your <b className="text-ink">normal week</b>, not your best one. Most people choose one level too high, and that makes the target look too generous.</li>
          </ol>
        </div>
        <p className="mt-3 text-[11px] text-ink-faint leading-relaxed">This is an estimate, not medical advice. If you have a health condition, are pregnant, or are unsure, ask a doctor or dietitian.</p>

        <div className="mt-5 flex gap-2">
          <button onClick={onEdit} className="flex-1 rounded-2xl bg-brand text-white font-bold py-3 shadow-lg shadow-brand/30 active:scale-[0.98] transition-transform">Edit my details</button>
          <button onClick={onClose} className="flex-1 rounded-2xl bg-surface-muted text-ink font-bold py-3 active:scale-[0.98] transition-transform">Close</button>
        </div>
      </div>
    </div>
  );
}
