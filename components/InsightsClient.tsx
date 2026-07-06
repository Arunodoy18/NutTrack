"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, TrendingUp, Zap, Lock, Loader2 } from 'lucide-react';
import TrendsChart from './TrendsChart';

/* ─── types ─── */
interface AnalyticsProfile {
  bmi: { value: number; label: string };
  bmr: number;
  tdee: number;
  bodyFatPercent: number;
  ffm: number;
  leanMuscleMass: number;
  metabolicHealth: string;
  macros: { calories: number; proteinG: number; fatG: number; carbsG: number; fiberG: number };
  micros: { sodium: number; iron: number; calcium: number; vitaminC: number };
  currentGoalLabel: string;
}

/* ─── goal options ─── */
const GOAL_OPTIONS = [
  { label: "Fat loss", adjust: -500, desc: "–500 kcal / day" },
  { label: "Maintenance", adjust: 0, desc: "match your TDEE" },
  { label: "Muscle gain", adjust: 300, desc: "+300 kcal / day" },
  { label: "Surplus", adjust: 500, desc: "+500 kcal / day" },
];

export default function InsightsClient({ 
  dailyTotals, 
  currentGoals, 
  activeStreak,
  analyticsProfile,
}: { 
  dailyTotals: any[]; 
  currentGoals: any; 
  activeStreak: number;
  analyticsProfile: AnalyticsProfile;
}) {
  const router = useRouter();
  const [section, setSection] = useState<'trends' | 'analytics'>('trends');
  const [activeTab, setActiveTab] = useState('Calories');
  const [selectedGoal, setSelectedGoal] = useState(analyticsProfile.currentGoalLabel);
  const [goldRevealed, setGoldRevealed] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [dailyTarget, setDailyTarget] = useState(analyticsProfile.macros.calories);

  /* ─── Wire goal setter to the database ─── */
  const handleGoalChange = async (goalLabel: string) => {
    if (goalLabel === selectedGoal || savingGoal) return;
    setSelectedGoal(goalLabel);
    setSavingGoal(true);

    try {
      const res = await fetch("/api/insights/update-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goalLabel }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDailyTarget(data.dailyTarget);
        // Refresh server data so dashboard picks up new goals
        router.refresh();
      }
    } catch (e) {
      // Revert on error
      setSelectedGoal(analyticsProfile.currentGoalLabel);
    } finally {
      setSavingGoal(false);
    }
  };

  // Removed old trend calculations as TrendsChart handles it now.

  /* ─── Shorthand for server-computed analytics ─── */
  const { bmi, bmr, tdee, bodyFatPercent, ffm, leanMuscleMass, metabolicHealth, macros, micros } = analyticsProfile;

  return (
    <>
      {/* ─── SECTION SWITCHER ─── */}
      <div className="flex gap-3 mb-6">
        {/* Your Trends tab */}
        <button
          onClick={() => setSection('trends')}
          className={`flex-1 rounded-[20px] p-4 border transition-all text-left ${
            section === 'trends'
              ? 'bg-white border-surface-line shadow-sm'
              : 'bg-surface-muted/50 border-transparent hover:bg-surface-muted'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-ink" />
            <span className="text-sm font-black text-ink">Your Trends</span>
          </div>
          <span className="text-[10px] font-medium text-ink-soft">Streak · best day · targets</span>
        </button>

        {/* Analytics PRO tab */}
        <button
          onClick={() => setSection('analytics')}
          className={`flex-1 rounded-[20px] p-4 border transition-all text-left relative ${
            section === 'analytics'
              ? 'bg-brand/5 border-brand/30 shadow-sm'
              : 'bg-brand/5 border-brand/10 hover:border-brand/20'
          }`}
        >
          <span className="absolute top-3 right-3 text-[8px] font-black tracking-widest text-brand bg-brand/10 px-2 py-0.5 rounded-full uppercase">
            Pro
          </span>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-brand" />
            <span className="text-sm font-black text-ink">Analytics</span>
          </div>
          <span className="text-[10px] font-medium text-ink-soft">BMR · TDEE · gold metric</span>
        </button>
      </div>

      {/* ─── YOUR TRENDS SECTION ─── */}
      {section === 'trends' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <TrendsChart initialRange={30} />
          
          {/* Spacer before Streak Card */}
          <div className="h-6"></div>

          {/* Streak Card */}
          <div className="bg-[#fff1ec] rounded-[24px] p-5 border border-[#ffdfd4] flex items-center gap-4 shadow-sm relative overflow-hidden mb-10 transition-all hover:-translate-y-1 hover:shadow-md cursor-default">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <Flame className="w-5 h-5 text-brand" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-sm font-bold text-ink">{activeStreak}-day logging streak</span>
              <p className="text-xs font-medium text-ink-soft leading-relaxed mt-0.5">
                Your longest yet. Keep it alive tonight.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── ANALYTICS PRO SECTION ─── */}
      {section === 'analytics' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* BMI + BMR cards */}
          <div className="flex gap-3">
            <div className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-surface-line">
              <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2">BMI</div>
              <div className="text-4xl font-black text-ink leading-none">{bmi.value}</div>
              <div className="mt-2">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  bmi.label === 'Normal' ? 'bg-emerald-50 text-emerald-600' : 
                  bmi.label === 'Underweight' ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-500'
                }`}>
                  {bmi.label}
                </span>
              </div>
            </div>
            <div className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-surface-line">
              <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2">BMR</div>
              <div className="text-4xl font-black text-ink leading-none">{bmr}</div>
              <div className="text-xs font-medium text-ink-soft mt-2">kcal at rest / day</div>
            </div>
          </div>

          {/* TDEE Hero Card */}
          <div className="bg-gradient-to-br from-brand to-[#e63e00] rounded-[24px] p-6 shadow-lg shadow-brand/20 text-white">
            <div className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase opacity-80 mb-2">
              Total Daily Energy · TDEE
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[56px] font-black leading-none tracking-tighter">{tdee}</span>
              <span className="text-base font-bold opacity-80">kcal / day</span>
            </div>
            <p className="text-sm font-medium opacity-80 mt-3 leading-relaxed">
              The calories you burn daily. Everything below is built from this number.
            </p>
          </div>

          {/* Body Fat % info card */}
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-surface-line">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-1">Body Fat %</div>
                <div className="text-2xl font-black text-ink">{bodyFatPercent}%</div>
              </div>
              <div className="text-right">
                <div className="text-[8px] font-mono font-bold tracking-wider text-ink-faint uppercase">Deurenberg eq.</div>
                <div className="text-[10px] font-medium text-ink-soft mt-0.5">1.20×BMI + 0.23×Age – 10.8×Sex – 5.4</div>
              </div>
            </div>
          </div>

          {/* Goal Setter */}
          <div>
            <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-3 ml-1">
              Set Your Goal
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {GOAL_OPTIONS.map(g => (
                <button
                  key={g.label}
                  onClick={() => handleGoalChange(g.label)}
                  disabled={savingGoal}
                  className={`rounded-[20px] p-4 text-left border transition-all active:scale-[0.98] ${
                    selectedGoal === g.label
                      ? 'border-brand bg-brand/5'
                      : 'border-surface-line bg-white hover:border-ink-soft/30'
                  } ${savingGoal ? 'opacity-70' : ''}`}
                >
                  <div className={`text-sm font-bold ${selectedGoal === g.label ? 'text-brand' : 'text-ink'}`}>
                    {g.label}
                  </div>
                  <div className="text-[11px] font-medium text-ink-soft mt-0.5">{g.desc}</div>
                </button>
              ))}
            </div>

            {/* Live daily target */}
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-sm font-bold text-ink flex items-center gap-2">
                Your daily target · {selectedGoal}
                {savingGoal && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />}
              </span>
              <span className="text-2xl font-black text-brand tracking-tight">{dailyTarget}</span>
            </div>
          </div>

          {/* Gold Metric Card */}
          <button
            onClick={() => setGoldRevealed(!goldRevealed)}
            className="w-full rounded-[24px] p-6 border border-brand/15 bg-gradient-to-br from-[#fff8f5] to-[#fff1ec] text-center transition-all hover:shadow-md active:scale-[0.99]"
          >
            {!goldRevealed ? (
              <>
                <Lock className="w-6 h-6 text-brand/40 mx-auto mb-3" />
                <div className="text-base font-black text-ink">Unlock the gold metric</div>
                <p className="text-xs font-medium text-ink-soft mt-1 leading-relaxed">
                  Tap to reveal your Fat-Free Mass — the metric no other app gives you.
                </p>
              </>
            ) : (
              <div className="space-y-4 text-left animate-in fade-in slide-in-from-top-4 duration-300">
                <div>
                  <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-brand uppercase mb-1">Fat-Free Mass</div>
                  <div className="text-3xl font-black text-ink">{ffm} <span className="text-base font-bold text-ink-soft">kg</span></div>
                  <div className="text-[10px] font-medium text-ink-soft mt-0.5">
                    Weight × (1 – {bodyFatPercent}% / 100)
                  </div>
                </div>
                <div className="h-px bg-surface-line" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-1">Lean Muscle Mass</div>
                    <div className="text-xl font-black text-ink">{leanMuscleMass} <span className="text-xs font-bold text-ink-soft">kg</span></div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-1">Metabolic Health</div>
                    <div className={`text-xl font-black ${metabolicHealth === 'Optimal' ? 'text-emerald-500' : metabolicHealth === 'At Risk' ? 'text-amber-500' : 'text-red-500'}`}>
                      {metabolicHealth}
                    </div>
                  </div>
                </div>
                <div className="h-px bg-surface-line" />
                <div>
                  <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2">Personalized Daily Targets</div>
                  
                  {/* Macros Row */}
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                      <div className="text-lg font-black text-ink">{macros.proteinG}</div>
                      <div className="text-[8px] font-bold text-ink-soft uppercase">Protein</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                      <div className="text-lg font-black text-ink">{macros.carbsG}</div>
                      <div className="text-[8px] font-bold text-ink-soft uppercase">Carbs</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                      <div className="text-lg font-black text-ink">{macros.fatG}</div>
                      <div className="text-[8px] font-bold text-ink-soft uppercase">Fat</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                      <div className="text-lg font-black text-ink">{macros.fiberG}</div>
                      <div className="text-[8px] font-bold text-ink-soft uppercase">Fiber</div>
                    </div>
                  </div>

                  {/* Micros Row */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                      <div className="text-[13px] font-black text-ink leading-tight">&lt;{micros.sodium}</div>
                      <div className="text-[8px] font-bold text-ink-soft uppercase mt-0.5">Sodium<br/><span className="text-[7px] text-ink-faint">mg</span></div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                      <div className="text-[13px] font-black text-ink leading-tight">{micros.iron}</div>
                      <div className="text-[8px] font-bold text-ink-soft uppercase mt-0.5">Iron<br/><span className="text-[7px] text-ink-faint">mg</span></div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                      <div className="text-[13px] font-black text-ink leading-tight">{micros.calcium}</div>
                      <div className="text-[8px] font-bold text-ink-soft uppercase mt-0.5">Calcium<br/><span className="text-[7px] text-ink-faint">mg</span></div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                      <div className="text-[13px] font-black text-ink leading-tight">{micros.vitaminC}</div>
                      <div className="text-[8px] font-bold text-ink-soft uppercase mt-0.5">Vit C<br/><span className="text-[7px] text-ink-faint">mg</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </button>

          {/* Bottom spacer */}
          <div className="h-6" />
        </div>
      )}
    </>
  );
}
