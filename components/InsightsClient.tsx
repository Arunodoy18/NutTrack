"use client";

import React, { useState } from 'react';
import { Flame } from 'lucide-react';

export default function InsightsClient({ 
  dailyTotals, 
  currentGoals, 
  activeStreak 
}: { 
  dailyTotals: any[]; 
  currentGoals: any; 
  activeStreak: number; 
}) {
  const [activeTab, setActiveTab] = useState('Calories');

  // Calculate stats based on active tab
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
      {/* Segmented Control - using local state to avoid server reload */}
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
            <div className="text-[9px] font-bold tracking-widest text-ink-soft uppercase mt-1">Daily Avg {activeTab}</div>
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
  );
}
