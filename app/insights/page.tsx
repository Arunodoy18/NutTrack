"use client";

import React, { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { Flame } from 'lucide-react';

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState('Calories');

  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-28">
      <div className="pt-16 px-6 max-w-lg mx-auto">
        <div className="text-[10px] font-black tracking-widest text-ink-soft uppercase mb-1">
          Last 7 Days
        </div>
        <h1 className="text-3xl font-black tracking-tight text-ink mb-6">
          Your trends
        </h1>

        {/* Segmented Control */}
        <div className="flex bg-white rounded-full p-1 border border-surface-line shadow-sm mb-8">
          {['Calories', 'Protein', 'Fat', 'Fiber'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-xs font-bold py-2.5 rounded-full transition-all ${
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
              <div className="text-4xl font-black text-ink leading-none">1780</div>
              <div className="text-[9px] font-bold tracking-widest text-ink-soft uppercase mt-1">Daily Avg Kcal</div>
            </div>
            <div className="text-xs font-bold text-ink-soft flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#f08a5d] rounded-full"></span>
              <span className="w-3 h-0.5 bg-[#f08a5d] rounded-full -ml-0.5"></span>
              Target 2000
            </div>
          </div>

          {/* Simple Mock Bar Chart SVG */}
          <div className="h-48 w-full relative flex items-end justify-between px-2">
            {/* Target Line */}
            <div className="absolute top-12 left-0 right-0 border-t border-dashed border-[#f08a5d]/60 z-0"></div>
            
            {/* Bars */}
            {[
              { day: 'Mon', h: '60%' },
              { day: 'Tue', h: '85%' },
              { day: 'Wed', h: '55%' },
              { day: 'Thu', h: '70%' },
              { day: 'Fri', h: '95%' },
              { day: 'Sat', h: '50%' },
            ].map((b, i) => (
              <div key={i} className="relative z-10 w-10 flex flex-col items-center gap-3">
                <div className="w-8 bg-[#d1d5db] rounded-t-lg transition-all" style={{ height: b.h }}></div>
                <span className="text-[10px] font-bold text-ink-soft">{b.day}</span>
              </div>
            ))}
            {/* Active Bar */}
            <div className="relative z-10 w-10 flex flex-col items-center gap-3">
              <div className="w-8 bg-brand rounded-t-lg shadow-[0_4px_12px_rgba(252,76,2,0.3)] transition-all" style={{ height: '45%' }}></div>
              <span className="text-[10px] font-bold text-brand">Sun</span>
            </div>
          </div>
        </div>

        {/* Two Mini Cards */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-surface-line">
            <div className="text-[9px] font-bold tracking-widest text-ink-soft uppercase mb-2">Best Day</div>
            <div className="text-xl font-black text-ink mb-0.5">Fri</div>
            <div className="text-xs font-medium text-ink-soft">2200 kcal</div>
          </div>
          <div className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-surface-line">
            <div className="text-[9px] font-bold tracking-widest text-ink-soft uppercase mb-2">On-Target Days</div>
            <div className="text-xl font-black text-emerald-500 mb-0.5 tracking-tight">4<span className="text-emerald-500/50">/7</span></div>
            <div className="text-xs font-medium text-ink-soft">consistency</div>
          </div>
        </div>

        {/* Streak Card */}
        <div className="bg-[#fff1ec] rounded-[24px] p-5 border border-[#ffdfd4] flex items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <Flame className="w-5 h-5 text-brand" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-sm font-bold text-ink">12-day logging streak</span>
            <p className="text-xs font-medium text-ink-soft leading-relaxed mt-0.5">
              Your longest yet. Keep it alive tonight.
            </p>
          </div>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
