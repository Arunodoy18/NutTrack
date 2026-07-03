import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { meals, dailyGoals } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import BottomNav from '@/components/BottomNav';
import { calculateActiveStreak } from "@/lib/streak";
import InsightsClient from '@/components/InsightsClient';

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
      dateStr: d.toISOString(),
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

  const activeStreak = calculateActiveStreak(allUserMealTimestamps.map(m => m.timestamp));

  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-40">
      <div className="pt-16 px-6 max-w-lg mx-auto">
        <div className="text-[10px] font-black tracking-widest text-ink-soft uppercase mb-1">
          Last 7 Days
        </div>
        <h1 className="text-3xl font-black tracking-tight text-ink mb-6">
          Your trends
        </h1>

        <InsightsClient 
          dailyTotals={dailyTotals} 
          currentGoals={currentGoals} 
          activeStreak={activeStreak} 
        />

      </div>
      <BottomNav />
    </div>
  );
}
