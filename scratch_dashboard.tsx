"use client";

import React, { useState } from 'react';
import { Sparkles, Camera } from 'lucide-react';
import Image from 'next/image';
import BottomNav from './BottomNav';

export interface FoodItemData {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  fiber: number;
  estimatedQuantity: string;
}

export interface MealLogData {
  id: string;
  timestamp: string;
  summary: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalFiber: number;
  items: FoodItemData[];
}

export interface DashboardProps {
  userId?: string;
  isPremiumUser?: boolean;
  dailyGoals: {
    calories: number;
    protein: number;
    fat: number;
    fiber: number;
  };
  todayTotals: {
    calories: number;
    protein: number;
    fat: number;
    fiber: number;
  };
  todayMeals: MealLogData[];
  activeStreak?: number;
  totalMealsCount?: number;
}

export default function Dashboard({
  userId = "guest-user-uuid",
  isPremiumUser = false,
  dailyGoals = { calories: 2000, protein: 120, fat: 65, fiber: 35 },
  todayTotals = { calories: 990, protein: 53, fat: 39, fiber: 16 },
  todayMeals = [],
  activeStreak = 1,
  totalMealsCount = 0,
}: DashboardProps) {

  const calsPercent = Math.min(100, Math.round((todayTotals.calories / dailyGoals.calories) * 100)) || 0;
  const protPercent = Math.min(100, Math.round((todayTotals.protein / dailyGoals.protein) * 100)) || 0;
  const fatPercent = Math.min(100, Math.round((todayTotals.fat / dailyGoals.fat) * 100)) || 0;
  const fibPercent = Math.min(100, Math.round((todayTotals.fiber / dailyGoals.fiber) * 100)) || 0;

  const calsLeft = Math.max(0, dailyGoals.calories - todayTotals.calories);
  
  // Circular progress math
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  // Make it a half circle arc if we want, or full circle. The screenshot shows a full circle ring.
  const strokeDashoffset = circumference - (calsPercent / 100) * circumference;

  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-28">
      {/* Top Header Section with massive circular progress */}
      <div className="pt-12 pb-8 px-6 bg-white rounded-b-[40px] shadow-[0_8px_32px_rgba(0,0,0,0.03)] border-b border-surface-line relative z-10 flex flex-col items-center">
        
        {/* Massive Circular Progress */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* SVG Ring */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="#F3F4F6"
              strokeWidth="24"
              fill="transparent"
            />
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="#FC4C02"
              strokeWidth="24"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          <div className="text-center z-10 flex flex-col items-center pt-2">
            <span className="text-[72px] font-black leading-none tracking-tight text-ink">
              {todayTotals.calories}
            </span>
            <span className="text-sm font-medium text-ink-soft mt-1">
              of {dailyGoals.calories} kcal
            </span>
            <span className="text-sm font-bold text-ink-faint mt-2 font-mono tracking-widest">
              {calsLeft} kcal left
            </span>
          </div>
        </div>

        {/* 3 Pill Cards (Protein, Fat, Fiber) */}
        <div className="flex w-full gap-3 mt-10 justify-center">
          
          {/* Protein */}
          <div className="flex-1 bg-surface rounded-3xl p-4 border border-surface-line shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-bold text-ink-soft tracking-widest uppercase">Protein</span>
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-black text-ink">{todayTotals.protein}</span>
              <span className="text-sm text-ink-faint">/{dailyGoals.protein}g</span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${protPercent}%` }}></div>
            </div>
          </div>

          {/* Fat */}
          <div className="flex-1 bg-surface rounded-3xl p-4 border border-surface-line shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
              <span className="text-xs font-bold text-ink-soft tracking-widest uppercase">Fat</span>
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-black text-ink">{todayTotals.fat}</span>
              <span className="text-sm text-ink-faint">/{dailyGoals.fat}g</span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${fatPercent}%` }}></div>
            </div>
          </div>

          {/* Fiber */}
          <div className="flex-1 bg-surface rounded-3xl p-4 border border-surface-line shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></div>
              <span className="text-xs font-bold text-ink-soft tracking-widest uppercase">Fiber</span>
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-black text-ink">{todayTotals.fiber}</span>
              <span className="text-sm text-ink-faint">/{dailyGoals.fiber}g</span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#3b82f6] rounded-full" style={{ width: `${fibPercent}%` }}></div>
            </div>
          </div>

        </div>
      </div>

      <div className="px-6 py-8 max-w-lg mx-auto">
        
        {/* Buddy Coach Card */}
        <div className="bg-[#fff1ec] rounded-[24px] p-5 border border-[#ffdfd4] flex gap-4 mb-10 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand/5 rounded-full blur-2xl"></div>
          <div className="w-10 h-10 bg-[#ffe5dc] rounded-2xl flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-brand" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-brand tracking-widest uppercase mb-1">Buddy Coach</span>
            <p className="text-sm font-medium text-ink leading-relaxed">
              You're at {todayTotals.protein}g protein — a chicken or tofu plate at dinner gets you to goal.
            </p>
          </div>
        </div>

        {/* Today's Meals */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-black text-ink">Today's meals</h2>
          <span className="text-xs font-bold text-ink-soft bg-white border border-surface-line px-3 py-1 rounded-full shadow-sm">
            {todayMeals.length} logged
          </span>
        </div>

        <div className="space-y-4">
          {todayMeals.length > 0 ? (
            todayMeals.map(meal => (
              <div key={meal.id} className="bg-white rounded-[24px] p-4 flex items-center gap-4 shadow-sm border border-surface-line hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-16 h-16 bg-surface-muted rounded-2xl flex items-center justify-center shrink-0 border border-surface-line overflow-hidden relative">
                  {/* For now, just show a placeholder icon or image */}
                  <Image 
                    src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop" 
                    alt={meal.summary}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-ink text-base truncate">{meal.summary || "Meal Log"}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs font-medium">
                    <span className="text-ink-soft">{new Date(meal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="text-ink-soft">•</span>
                    <span className="text-emerald-500 font-bold">{meal.totalProtein}g protein</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-lg text-ink leading-none">{meal.totalCalories}</div>
                  <div className="text-[9px] font-bold text-ink-faint uppercase tracking-widest mt-1">Kcal</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-white rounded-[32px] border border-surface-line border-dashed">
              <p className="text-ink-soft font-medium text-sm">No meals logged yet today.</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
