import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { meals, dailyGoals } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import BottomNav from '@/components/BottomNav';
import { Flame } from 'lucide-react';
import { calculateActiveStreak } from "@/lib/streak";

export const dynamic = "force-dynamic";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  
  const userId = session.user.id;
  const activeTab = (searchParams.tab as string) || 'Calories';

  // 1. Fetch user's Daily Nutrition Goals
  let currentGoals = await db.query.dailyGoals.findFirst({
    where: eq(dailyGoals.userId, userId),
    orderBy: (goals, { desc }) => [desc(goals.createdAt)]
  });

  if (!currentGoals) {
    currentGoals = {
      calories: 2000,
      protein: 80,
      fat: 65,
      fiber: 30,
    } as any;
  }

  // 2. Fetch meals for the last 7 days
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const last7DaysMeals = await db.query.meals.findMany({
    where: and(
      eq(meals.userId, userId),
      gte(meals.timestamp, sevenDaysAgo),
      lte(meals.timestamp, today)
    )
  });

  // Calculate daily totals for the last 7 days
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyTotals = Array(7).fill(0).map((_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    return {
      date: d,
      day: daysOfWeek[d.getDay()],
      calories: 0,
      protein: 0,
      fat: 0,
      fiber: 0
    };
  });

  last7DaysMeals.forEach(meal => {
    const mealDate = new Date(meal.timestamp);
    // Find matching day in our array
    const dayObj = dailyTotals.find(d => 
      d.date.getDate() === mealDate.getDate() && 
      d.date.getMonth() === mealDate.getMonth()
    );
    if (dayObj) {
      dayObj.calories += meal.totalCalories;
      dayObj.protein += meal.totalProtein;
      dayObj.fat += meal.totalFat;
      dayObj.fiber += meal.totalFiber;
    }
  });

  // Calculate stats based on active tab
  let targetValue = currentGoals!.calories;
  let unit = 'kcal';
  let avgValue = 0;
  let bestDay = { day: '-', value: 0 };
  let onTargetDays = 0;

  let maxChartValue = 1; // Prevent division by zero

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
      targetValue = currentGoals!.calories;
      unit = 'kcal';
      // For calories, "on target" might mean within 10% of goal, but let's just say reaching it for simplicity or > 80%
      if (val >= targetValue * 0.8 && val <= targetValue * 1.2) onTargetDays++;
    } else if (activeTab === 'Protein') {
      targetValue = currentGoals!.protein;
      unit = 'g';
      if (val >= targetValue * 0.9) onTargetDays++;
    } else if (activeTab === 'Fat') {
      targetValue = currentGoals!.fat;
      unit = 'g';
      if (val >= targetValue * 0.9) onTargetDays++;
    } else if (activeTab === 'Fiber') {
      targetValue = currentGoals!.fiber;
      unit = 'g';
      if (val >= targetValue * 0.9) onTargetDays++;
    }

    if (val > maxChartValue) maxChartValue = val;
  });

  if (targetValue > maxChartValue) maxChartValue = targetValue;
  
  avgValue = Math.round(avgValue / 7);

  // 3. Fetch all meals to calculate streak
  const allUserMealTimestamps = await db.query.meals.findMany({
    where: eq(meals.userId, userId),
    columns: { timestamp: true },
    orderBy: (mealsTable, { desc }) => [desc(mealsTable.timestamp)]
  });
  const activeStreak = calculateActiveStreak(allUserMealTimestamps.map(m => m.timestamp));

  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-28">
      <div className="pt-16 px-6 max-w-lg mx-auto">
        <div className="text-[10px] font-black tracking-widest text-ink-soft uppercase mb-1">
          Last 7 Days
        </div>
        <h1 className="text-3xl font-black tracking-tight text-ink mb-6">
          Your trends
        </h1>

        {/* Segmented Control - using Next.js links to avoid client component requirement for state */}
        <div className="flex bg-white rounded-full p-1 border border-surface-line shadow-sm mb-8">
          {['Calories', 'Protein', 'Fat', 'Fiber'].map(tab => (
            <a
              key={tab}
              href={`/insights?tab=${tab}`}
              className={`flex-1 text-center text-xs font-bold py-2.5 rounded-full transition-all ${
                activeTab === tab 
                ? 'bg-surface-muted text-ink shadow-sm border border-surface-line/50' 
                : 'text-ink-soft hover:text-ink hover:bg-surface/50'
              }`}
            >
              {tab}
            </a>
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

          {/* Simple Mock Bar Chart SVG with REAL DATA */}
          <div className="h-48 w-full relative flex items-end justify-between px-2">
            {/* Target Line */}
            <div 
              className="absolute left-0 right-0 border-t border-dashed border-[#f08a5d]/60 z-0"
              style={{ bottom: `${(targetValue / maxChartValue) * 100}%` }}
            ></div>
            
            {/* Bars */}
            {dailyTotals.map((d, i) => {
              let val = 0;
              if (activeTab === 'Calories') val = d.calories;
              else if (activeTab === 'Protein') val = d.protein;
              else if (activeTab === 'Fat') val = d.fat;
              else if (activeTab === 'Fiber') val = d.fiber;

              const heightPct = Math.max(5, (val / maxChartValue) * 100);
              const isToday = i === 6;

              return (
                <div key={i} className="relative z-10 w-10 flex flex-col items-center gap-3">
                  <div 
                    className={`w-8 rounded-t-lg transition-all ${isToday ? 'bg-brand shadow-[0_4px_12px_rgba(252,76,2,0.3)]' : 'bg-[#d1d5db]'}`} 
                    style={{ height: `${heightPct}%` }}
                  ></div>
                  <span className={`text-[10px] font-bold ${isToday ? 'text-brand' : 'text-ink-soft'}`}>{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Two Mini Cards */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-surface-line">
            <div className="text-[9px] font-bold tracking-widest text-ink-soft uppercase mb-2">Best Day</div>
            <div className="text-xl font-black text-ink mb-0.5">{bestDay.day}</div>
            <div className="text-xs font-medium text-ink-soft">{bestDay.value} {unit}</div>
          </div>
          <div className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-surface-line">
            <div className="text-[9px] font-bold tracking-widest text-ink-soft uppercase mb-2">On-Target Days</div>
            <div className="text-xl font-black text-emerald-500 mb-0.5 tracking-tight">{onTargetDays}<span className="text-emerald-500/50">/7</span></div>
            <div className="text-xs font-medium text-ink-soft">consistency</div>
          </div>
        </div>

        {/* Streak Card */}
        <div className="bg-[#fff1ec] rounded-[24px] p-5 border border-[#ffdfd4] flex items-center gap-4 shadow-sm relative overflow-hidden">
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

      <BottomNav />
    </div>
  );
}
