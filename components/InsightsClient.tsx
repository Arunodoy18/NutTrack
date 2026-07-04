"use client";

import React, { useState } from 'react';
import { Flame, TrendingUp, Zap, Lock } from 'lucide-react';

/* ─── types ─── */
interface UserMetrics {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: string;
  activityLevel: string;
  primaryGoal: string;
  bodyFat: string;
}

/* ─── TDEE multipliers ─── */
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  Sedentary: 1.2,
  "Lightly active": 1.375,
  "Moderately active": 1.55,
  "Very active": 1.725,
  Athlete: 1.9,
};

/* ─── goal adjustments ─── */
const GOAL_OPTIONS = [
  { label: "Fat loss", adjust: -500, desc: "–500 kcal / day" },
  { label: "Maintenance", adjust: 0, desc: "match your TDEE" },
  { label: "Muscle gain", adjust: 300, desc: "+300 kcal / day" },
  { label: "Surplus", adjust: 500, desc: "+500 kcal / day" },
];

function mapGoalToLabel(goal: string): string {
  if (goal === "Lose weight") return "Fat loss";
  if (goal === "Build muscle") return "Muscle gain";
  if (goal === "Improve health") return "Maintenance";
  return "Maintenance";
}

export default function InsightsClient({ 
  dailyTotals, 
  currentGoals, 
  activeStreak,
  userMetrics,
}: { 
  dailyTotals: any[]; 
  currentGoals: any; 
  activeStreak: number;
  userMetrics: UserMetrics;
}) {
  const [section, setSection] = useState<'trends' | 'analytics'>('trends');
  const [activeTab, setActiveTab] = useState('Calories');
  const [selectedGoal, setSelectedGoal] = useState(() => mapGoalToLabel(userMetrics.primaryGoal));
  const [goldRevealed, setGoldRevealed] = useState(false);

  /* ─── analytics calculations ─── */
  const bmi = userMetrics.weightKg / Math.pow(userMetrics.heightCm / 100, 2);
  const bmiRounded = Math.round(bmi * 10) / 10;
  const bmiLabel = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";

  let bmr: number;
  if (userMetrics.gender === "Male") {
    bmr = 10 * userMetrics.weightKg + 6.25 * userMetrics.heightCm - 5 * userMetrics.age + 5;
  } else {
    bmr = 10 * userMetrics.weightKg + 6.25 * userMetrics.heightCm - 5 * userMetrics.age - 161;
  }
  const bmrRounded = Math.round(bmr);

  const multiplier = ACTIVITY_MULTIPLIERS[userMetrics.activityLevel] ?? 1.55;
  const tdee = Math.round(bmr * multiplier);

  const goalOption = GOAL_OPTIONS.find(g => g.label === selectedGoal) ?? GOAL_OPTIONS[1];
  const dailyTarget = Math.max(1200, tdee + goalOption.adjust);

  // Fat-Free Mass (Boer formula approximation)
  let ffm: number;
  if (userMetrics.gender === "Male") {
    ffm = (0.407 * userMetrics.weightKg) + (0.267 * userMetrics.heightCm) - 19.2;
  } else {
    ffm = (0.252 * userMetrics.weightKg) + (0.473 * userMetrics.heightCm) - 48.3;
  }
  const ffmRounded = Math.round(ffm * 10) / 10;
  const leanMuscle = Math.round(ffm * 0.5 * 10) / 10;

  /* ─── trends calculations ─── */
  let targetValue = currentGoals.calories;
  let unit = 'kcal';
  let avgValue = 0;
  let bestDay = { day: '-', value: 0 };
  let onTargetDays = 0;
  let maxChartValue = 1; 

  dailyTotals.forEach(d => {
    let val = 0;
    if (activeTab === 'Calories') val = d.calories;
    else if (activeTab === 'Protein') val = d.protein;
    else if (activeTab === 'Fat') val = d.fat;
    else if (activeTab === 'Fiber') val = d.fiber;

    avgValue += val;
    if (val > bestDay.value) {
      bestDay = { day: d.day, value: val };
    }

    if (activeTab === 'Calories') {
      targetValue = currentGoals.calories;
      unit = 'kcal';
      if (val >= targetValue * 0.8 && val <= targetValue * 1.2) onTargetDays++;
    } else if (activeTab === 'Protein') {
      targetValue = currentGoals.protein;
      unit = 'g';
      if (val >= targetValue * 0.9) onTargetDays++;
    } else if (activeTab === 'Fat') {
      targetValue = currentGoals.fat;
      unit = 'g';
      if (val >= targetValue * 0.9) onTargetDays++;
    } else if (activeTab === 'Fiber') {
      targetValue = currentGoals.fiber;
      unit = 'g';
      if (val >= targetValue * 0.9) onTargetDays++;
    }

    if (val > maxChartValue) maxChartValue = val;
  });

  if (targetValue > maxChartValue) maxChartValue = targetValue;
  avgValue = Math.round(avgValue / 7);

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
          {/* PRO badge */}
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
        <>
          {/* Segmented Control */}
          <div className="flex bg-white rounded-full p-1 border border-surface-line shadow-sm mb-8">
            {['Calories', 'Protein', 'Fat', 'Fiber'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-center text-xs font-bold py-2.5 rounded-full transition-all ${
                  activeTab === tab 
                  ? 'bg-surface-muted text-ink shadow-sm border border-surface-line/50' 
                  : 'text-ink-soft hover:text-ink hover:bg-surface/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Main Chart Card */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-surface-line mb-4 relative">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="text-4xl font-black text-ink leading-none">{avgValue}</div>
                <div className="text-[9px] font-bold tracking-widest text-ink-soft uppercase mt-1">Daily Avg {unit}</div>
              </div>
              <div className="text-xs font-bold text-ink-soft flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#f08a5d] rounded-full"></span>
                <span className="w-3 h-0.5 bg-[#f08a5d] rounded-full -ml-0.5"></span>
                Target {targetValue}
              </div>
            </div>

            {/* Chart */}
            <div className="h-48 w-full relative flex items-end justify-between px-2 pt-4">
              <div 
                className="absolute left-0 right-0 border-t border-dashed border-[#f08a5d]/60 z-0 transition-all duration-300"
                style={{ bottom: `${(targetValue / maxChartValue) * 100}%` }}
              ></div>
              
              {dailyTotals.map((d, i) => {
                let val = 0;
                if (activeTab === 'Calories') val = d.calories;
                else if (activeTab === 'Protein') val = d.protein;
                else if (activeTab === 'Fat') val = d.fat;
                else if (activeTab === 'Fiber') val = d.fiber;

                const heightPct = Math.max(5, (val / maxChartValue) * 100);
                const isToday = i === 6;

                return (
                  <div key={i} className="relative z-10 w-10 h-full flex flex-col items-center justify-end gap-2 group cursor-pointer">
                    {val > 0 && (
                      <span className="text-[8px] font-bold text-ink-soft mb-1 transition-opacity opacity-0 group-hover:opacity-100 absolute -top-4">{val}</span>
                    )}
                    <div 
                      className={`w-8 rounded-t-lg transition-all duration-300 ease-out ${isToday ? 'bg-brand shadow-[0_4px_12px_rgba(252,76,2,0.3)]' : 'bg-[#d1d5db] group-hover:bg-[#a1a5ab]'}`} 
                      style={{ height: `${heightPct}%` }}
                    ></div>
                    <span className={`text-[10px] font-bold mt-1 ${isToday ? 'text-brand' : 'text-ink-soft'}`}>{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two Mini Cards */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-surface-line transition-all hover:-translate-y-1 hover:shadow-md">
              <div className="text-[9px] font-bold tracking-widest text-ink-soft uppercase mb-2">Best Day</div>
              <div className="text-xl font-black text-ink mb-0.5">{bestDay.day}</div>
              <div className="text-xs font-medium text-ink-soft">{bestDay.value} {unit}</div>
            </div>
            <div className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-surface-line transition-all hover:-translate-y-1 hover:shadow-md">
              <div className="text-[9px] font-bold tracking-widest text-ink-soft uppercase mb-2">On-Target Days</div>
              <div className="text-xl font-black text-emerald-500 mb-0.5 tracking-tight">{onTargetDays}<span className="text-emerald-500/50">/7</span></div>
              <div className="text-xs font-medium text-ink-soft">consistency</div>
            </div>
          </div>

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
        </>
      )}

      {/* ─── ANALYTICS PRO SECTION ─── */}
      {section === 'analytics' && (
        <div className="space-y-4">
          {/* BMI + BMR cards */}
          <div className="flex gap-3">
            <div className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-surface-line">
              <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2">BMI</div>
              <div className="text-4xl font-black text-ink leading-none">{bmiRounded}</div>
              <div className="mt-2">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  bmiLabel === 'Normal' ? 'bg-emerald-50 text-emerald-600' : 
                  bmiLabel === 'Underweight' ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-500'
                }`}>
                  {bmiLabel}
                </span>
              </div>
            </div>
            <div className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-surface-line">
              <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2">BMR</div>
              <div className="text-4xl font-black text-ink leading-none">{bmrRounded}</div>
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

          {/* Goal Setter */}
          <div>
            <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-3 ml-1">
              Set Your Goal
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {GOAL_OPTIONS.map(g => (
                <button
                  key={g.label}
                  onClick={() => setSelectedGoal(g.label)}
                  className={`rounded-[20px] p-4 text-left border transition-all ${
                    selectedGoal === g.label
                      ? 'border-brand bg-brand/5'
                      : 'border-surface-line bg-white hover:border-ink-soft/30'
                  }`}
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
              <span className="text-sm font-bold text-ink">
                Your daily target · {selectedGoal}
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
              <div className="space-y-4 text-left">
                <div>
                  <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-brand uppercase mb-1">Fat-Free Mass</div>
                  <div className="text-3xl font-black text-ink">{ffmRounded} <span className="text-base font-bold text-ink-soft">kg</span></div>
                </div>
                <div className="h-px bg-surface-line" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-1">Lean Muscle Mass</div>
                    <div className="text-xl font-black text-ink">{leanMuscle} <span className="text-xs font-bold text-ink-soft">kg</span></div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-1">Metabolic Health</div>
                    <div className="text-xl font-black text-emerald-500">{bmiLabel === 'Normal' ? 'Optimal' : 'At Risk'}</div>
                  </div>
                </div>
                <div className="h-px bg-surface-line" />
                <div>
                  <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2">Personalized Macro Targets</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                      <div className="text-lg font-black text-ink">{currentGoals.protein}</div>
                      <div className="text-[9px] font-bold text-ink-soft uppercase">Protein</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                      <div className="text-lg font-black text-ink">{currentGoals.fat}</div>
                      <div className="text-[9px] font-bold text-ink-soft uppercase">Fat</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                      <div className="text-lg font-black text-ink">{currentGoals.fiber}</div>
                      <div className="text-[9px] font-bold text-ink-soft uppercase">Fiber</div>
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
