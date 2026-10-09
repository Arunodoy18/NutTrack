import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { meals, dailyGoals, users } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import BottomNav from '@/components/BottomNav';
import { calculateActiveStreak } from "@/lib/streak";
import InsightsClient from '@/components/InsightsClient';
import { computeFullProfile, mapProfileGoalToLabel } from "@/lib/nutritionEngine";

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

  // Gate: force profile setup for incomplete profiles
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });
  if (!currentUser?.profileComplete) {
    redirect("/setup");
  }

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
      carbs: 250,
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
      carbs: 0,
      fiber: 0
    };
  });

  last7DaysMeals.forEach(meal => {
    const mealDate = new Date(meal.timestamp);
    // Find matching day in our array
    const dayObj = dailyTotals.find(d => {
      const dDate = new Date(d.dateStr);
      return dDate.getDate() === mealDate.getDate() && 
             dDate.getMonth() === mealDate.getMonth();
    });
    if (dayObj) {
      dayObj.calories += meal.totalCalories;
      dayObj.protein += meal.totalProtein;
      dayObj.fat += meal.totalFat;
      dayObj.carbs += meal.totalCarbs || 0;
      dayObj.fiber += meal.totalFiber;
    }
  });

  const allUserMealTimestamps = await db.query.meals.findMany({
    where: eq(meals.userId, userId),
    columns: { timestamp: true },
    orderBy: (mealsTable, { desc }) => [desc(mealsTable.timestamp)]
  });

  const activeStreak = calculateActiveStreak(allUserMealTimestamps.map(m => m.timestamp));

  // 3. Compute full analytics profile server-side using centralized engine
  const goalLabel = mapProfileGoalToLabel(currentUser?.primaryGoal || "Maintain");
  const fullProfile = computeFullProfile(
    currentUser?.weightKg ?? 70,
    currentUser?.heightCm ?? 170,
    currentUser?.age ?? 25,
    (currentUser?.gender as string) ?? "Male",
    (currentUser?.activityLevel as string) ?? "Moderately active",
    goalLabel,
    currentUser?.bodyFat || null
  );

  // Serialize for client (strip non-serializable values)
  const analyticsProfile = {
    bmi: fullProfile.bmi,
    bmr: fullProfile.bmr,
    tdee: fullProfile.tdee,
    bodyFatPercent: fullProfile.bodyFatPercent,
    ffm: fullProfile.ffm,
    leanMuscleMass: fullProfile.leanMuscleMass,
    metabolicHealth: fullProfile.metabolicHealth,
    isChild: fullProfile.isChild,
    macros: fullProfile.macros,
    micros: fullProfile.micros,
    currentGoalLabel: goalLabel,
  };

  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-40">
      <div className="pt-16 px-6 max-w-lg mx-auto">
        <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-ink-soft uppercase mb-1">
          Your Trends &amp; Analytics
        </div>
        <h1 className="text-3xl font-black tracking-tight text-ink mb-6">
          Insights
        </h1>

        <InsightsClient 
          dailyTotals={dailyTotals} 
          currentGoals={currentGoals} 
          activeStreak={activeStreak}
          analyticsProfile={analyticsProfile}
        />

      </div>
      <BottomNav />
    </div>
  );
}
