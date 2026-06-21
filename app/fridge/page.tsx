"use client";

import React, { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { Camera, Refrigerator } from 'lucide-react';
import FridgeRaider from '@/components/FridgeRaider';

export default function FridgePage() {
  const [isRaiderOpen, setIsRaiderOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-28">
      <div className="pt-16 px-6 max-w-lg mx-auto">
        
        <div className="text-[10px] font-black tracking-widest text-ink-soft uppercase mb-1">
          AI Recipes
        </div>
        <h1 className="text-3xl font-black tracking-tight text-ink mb-8">
          Fridge Raider
        </h1>

        {/* Main Card */}
        <div className="bg-gradient-to-br from-white via-white to-emerald-50 rounded-[40px] p-8 shadow-sm border border-surface-line mb-8 text-center relative overflow-hidden">
          {/* Decorative blur */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/40 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand/10 rounded-full blur-3xl"></div>
          
          <div className="w-16 h-16 bg-[#fff1ec] rounded-[20px] border border-[#ffdfd4] flex items-center justify-center mx-auto mb-6 relative z-10 shadow-sm">
            <Refrigerator className="w-8 h-8 text-brand" />
          </div>
          
          <h2 className="text-xl font-black text-ink mb-3 relative z-10">What's in your fridge?</h2>
          <p className="text-sm font-medium text-ink-soft leading-relaxed mb-8 relative z-10 px-2">
            Snap a photo and Buddy invents macro-friendly recipes from what it sees.
          </p>
          
          <button 
            onClick={() => setIsRaiderOpen(true)}
            className="w-full bg-brand hover:bg-[#e63e00] text-white py-4 rounded-[20px] font-bold shadow-lg shadow-brand/30 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] relative z-10"
          >
            <Camera className="w-5 h-5" />
            Scan my fridge
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <div className="bg-white border border-surface-line rounded-[20px] p-5 flex items-center gap-4 shadow-sm">
            <div className="w-8 h-8 bg-brand/10 text-brand rounded-[12px] flex items-center justify-center font-black text-sm shrink-0">1</div>
            <span className="font-medium text-ink text-sm">Open the fridge door wide</span>
          </div>
          
          <div className="bg-white border border-surface-line rounded-[20px] p-5 flex items-center gap-4 shadow-sm">
            <div className="w-8 h-8 bg-emerald-500/10 text-emerald-600 rounded-[12px] flex items-center justify-center font-black text-sm shrink-0">2</div>
            <span className="font-medium text-ink text-sm">Capture shelves and produce drawer</span>
          </div>
          
          <div className="bg-white border border-surface-line rounded-[20px] p-5 flex items-center gap-4 shadow-sm">
            <div className="w-8 h-8 bg-amber-500/10 text-amber-600 rounded-[12px] flex items-center justify-center font-black text-sm shrink-0">3</div>
            <span className="font-medium text-ink text-sm">Buddy returns 3 macro-balanced recipes</span>
          </div>
        </div>

      </div>

      <BottomNav />
      
      {isRaiderOpen && <FridgeRaider onClose={() => setIsRaiderOpen(false)} />}
    </div>
  );
}
