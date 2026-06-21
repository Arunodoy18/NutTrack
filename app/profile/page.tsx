"use client";

import React from 'react';
import BottomNav from '@/components/BottomNav';
import { ChevronRight, Zap, Edit2 } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-28">
      <div className="pt-16 px-6 max-w-lg mx-auto">
        
        {/* Header / User Info */}
        <div className="flex items-center gap-5 mb-8">
          <div className="w-20 h-20 bg-brand text-white font-black text-3xl rounded-[28px] flex items-center justify-center shadow-lg shadow-brand/20">
            A
          </div>
          <div>
            <h1 className="text-2xl font-black text-ink tracking-tight mb-1">Arunodoy</h1>
            <p className="text-sm font-bold text-blue-600 underline underline-offset-2 opacity-80 hover:opacity-100 cursor-pointer">
              arunodoy@example.com
            </p>
          </div>
        </div>

        {/* 3 Stats Cards */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 bg-white rounded-[24px] py-4 px-2 text-center shadow-sm border border-surface-line">
            <div className="text-2xl font-black text-brand mb-1">12</div>
            <div className="text-[8px] font-bold tracking-widest text-ink-soft uppercase">Day Streak</div>
          </div>
          <div className="flex-1 bg-white rounded-[24px] py-4 px-2 text-center shadow-sm border border-surface-line">
            <div className="text-2xl font-black text-ink mb-1">84</div>
            <div className="text-[8px] font-bold tracking-widest text-ink-soft uppercase">Meals</div>
          </div>
          <div className="flex-1 bg-white rounded-[24px] py-4 px-2 text-center shadow-sm border border-surface-line">
            <div className="text-2xl font-black text-emerald-500 mb-1">86%</div>
            <div className="text-[8px] font-bold tracking-widest text-ink-soft uppercase">On Goal</div>
          </div>
        </div>

        {/* Daily Goals Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-surface-line mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-ink">Daily goals</h2>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 text-brand rounded-full text-xs font-bold hover:bg-brand/20 transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-brand"></div>
                <span className="text-sm font-medium text-ink-soft">Calories</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-ink text-base">2000</span>
                <span className="text-xs font-bold text-ink-faint">kcal</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-sm font-medium text-ink-soft">Protein</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-ink text-base">120</span>
                <span className="text-xs font-bold text-ink-faint">g</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <span className="text-sm font-medium text-ink-soft">Fat</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-ink text-base">65</span>
                <span className="text-xs font-bold text-ink-faint">g</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-ink-soft">Fiber</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-ink text-base">35</span>
                <span className="text-xs font-bold text-ink-faint">g</span>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Upgrade Card */}
        <div className="bg-gradient-to-br from-[#fc5c16] to-[#e63e00] rounded-[32px] p-6 text-white shadow-xl shadow-brand/20 mb-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <Zap className="w-4 h-4" fill="currentColor" />
            <span className="text-[10px] font-black tracking-widest uppercase">Dietbuddy Premium</span>
          </div>
          <h2 className="text-2xl font-black mb-2 relative z-10">Unlimited AI scans</h2>
          <p className="text-sm text-white/90 font-medium mb-6 relative z-10">
            Deep insights, cloud sync & no daily limits.
          </p>
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black tracking-tight">₹199</span>
              <span className="text-xs font-bold text-white/80">/ lifetime</span>
            </div>
            <button className="bg-white text-brand px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:scale-105 transition-transform">
              Upgrade
            </button>
          </div>
          
          {/* Decorative shapes */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Settings List */}
        <div className="bg-white rounded-[32px] shadow-sm border border-surface-line overflow-hidden mb-6">
          {['Notifications', 'Units & measurements', 'Connected apps'].map((item, i) => (
            <div key={item} className={`flex justify-between items-center p-5 cursor-pointer hover:bg-surface-muted transition-colors ${i !== 2 ? 'border-b border-surface-line' : ''}`}>
              <span className="text-sm font-medium text-ink">{item}</span>
              <ChevronRight className="w-5 h-5 text-ink-soft" />
            </div>
          ))}
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
