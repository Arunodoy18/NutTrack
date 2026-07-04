import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { meals, mealItems, dailyGoals, users } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import Dashboard, { MealLogData, FoodItemData } from "@/components/Dashboard";
import { calculateActiveStreak } from "@/lib/streak";
import { computeFullProfile, mapProfileGoalToLabel } from "@/lib/nutritionEngine";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/auth/login");
  }

  // Fetch the current user to check premium status
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  // Gate: force profile setup for incomplete profiles
  if (!currentUser?.profileComplete) {
    redirect("/setup");
  }

  let isPremium = currentUser?.isPremium || false;
  let isTrialActive = false;
  
  if (currentUser?.createdAt) {
    const accountAgeDays = (Date.now() - new Date(currentUser.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays <= 30) {
      isPremium = true;
      isTrialActive = true;
    }
  }

  if (isPremium && !isTrialActive && currentUser?.premiumSince) {
    const premiumDate = new Date(currentUser.premiumSince);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    if (premiumDate < ninetyDaysAgo) {
      isPremium = false;
    }
  }

  // 1. Fetch user's Daily Nutrition Goals
  let currentGoals = await db.query.dailyGoals.findFirst({
    where: eq(dailyGoals.userId, userId),
    orderBy: (goals, { desc }) => [desc(goals.createdAt)]
  });

  // If no custom daily goal exists, calculate from user's stored metrics
  if (!currentGoals) {
    const goalLabel = mapProfileGoalToLabel(currentUser?.primaryGoal || "Maintain");
    const profile = computeFullProfile(
      currentUser?.weightKg ?? 70,
      currentUser?.heightCm ?? 170,
      currentUser?.age ?? 25,
      (currentUser?.gender as string) ?? "Male",
      (currentUser?.activityLevel as string) ?? "Moderately active",
      goalLabel,
      currentUser?.bodyFat || null
    );

    try {
      const [newGoal] = await db.insert(dailyGoals).values({
        userId: userId,
        calories: profile.macros.calories,
        protein: profile.macros.proteinG,
        fat: profile.macros.fatG,
        fiber: profile.macros.fiberG,
        sodium: profile.micros.sodium,
        iron: profile.micros.iron,
        calcium: profile.micros.calcium,
        vitaminC: profile.micros.vitaminC,
      }).returning();
      currentGoals = newGoal;
    } catch (err) {
      currentGoals = {
        id: "fallback",
        userId: userId,
        calories: profile.macros.calories,
        protein: profile.macros.proteinG,
        fat: profile.macros.fatG,
        fiber: profile.macros.fiberG,
        sodium: profile.micros.sodium,
        iron: profile.micros.iron,
        calcium: profile.micros.calcium,
        vitaminC: profile.micros.vitaminC,
        createdAt: new Date()
      };
    }
  }

  // 2. Fetch all meals logged TODAY
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const rawTodayMeals = await db.query.meals.findMany({
    where: and(
      eq(meals.userId, userId),
      gte(meals.timestamp, startOfDay),
      lte(meals.timestamp, endOfDay)
    ),
    with: {
      items: true
    },
    orderBy: (mealsTable, { desc }) => [desc(mealsTable.timestamp)]
  });

  // 3. Map database relations to client Dashboard components props
  const mappedTodayMeals: MealLogData[] = rawTodayMeals.map((meal) => {
    const mealItemsList: FoodItemData[] = (meal.items || []).map((item) => ({
      id: item.id,
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      fat: item.fat,
      fiber: item.fiber,
      sodium: item.sodium || 0,
      iron: item.iron || 0,
      calcium: item.calcium || 0,
      vitaminC: item.vitaminC || 0,
      estimatedQuantity: item.estimatedQuantity || "100g"
    }));

    return {
      id: meal.id,
      timestamp: meal.timestamp.toISOString(),
      summary: meal.summary || "No description provided",
      imageUrl: meal.imagePath || undefined,
      totalCalories: meal.totalCalories,
      totalProtein: meal.totalProtein,
      totalFat: meal.totalFat,
      totalFiber: meal.totalFiber,
      totalSodium: meal.totalSodium || 0,
      totalIron: meal.totalIron || 0,
      totalCalcium: meal.totalCalcium || 0,
      totalVitaminC: meal.totalVitaminC || 0,
      items: mealItemsList
    } as any;
  });

  // 4. Calculate aggregated daily running totals
  const todayTotals = mappedTodayMeals.reduce((acc, meal: any) => {
    return {
      calories: acc.calories + meal.totalCalories,
      protein: acc.protein + meal.totalProtein,
      fat: acc.fat + meal.totalFat,
      fiber: acc.fiber + meal.totalFiber,
      sodium: acc.sodium + (meal.totalSodium || 0),
      iron: acc.iron + (meal.totalIron || 0),
      calcium: acc.calcium + (meal.totalCalcium || 0),
      vitaminC: acc.vitaminC + (meal.totalVitaminC || 0),
    };
  }, { calories: 0, protein: 0, fat: 0, fiber: 0, sodium: 0, iron: 0, calcium: 0, vitaminC: 0 });

  // 5. Calculate global user streak based on all historic logged meals
  // Efficient query: Only fetch the timestamp column to avoid loading massive arrays into memory
  const allUserMealTimestamps = await db.query.meals.findMany({
    where: eq(meals.userId, userId),
    columns: { timestamp: true },
    orderBy: (mealsTable, { desc }) => [desc(mealsTable.timestamp)]
  });
  const activeStreak = calculateActiveStreak(allUserMealTimestamps.map(m => m.timestamp));

  // 6. Calculate 7-day weekly data for analytics charts
  const weeklyDataMap = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Initialize last 7 days with 0s
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = d.toDateString();
    weeklyDataMap.set(dateStr, { name: dayName, Calories: 0, Protein: 0, Fats: 0, Fiber: 0 });
  }

  // Fetch only recent meals to build the chart, omitting heavy nested relations
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentMealsForChart = await db.query.meals.findMany({
    where: and(
      eq(meals.userId, userId),
      gte(meals.timestamp, sevenDaysAgo)
    ),
    columns: { timestamp: true, totalCalories: true, totalProtein: true, totalFat: true, totalFiber: true }
  });

  // Populate actuals
  recentMealsForChart.forEach(meal => {
    const mDate = new Date(meal.timestamp);
    mDate.setHours(0, 0, 0, 0);
    const mDateStr = mDate.toDateString();
    
    if (weeklyDataMap.has(mDateStr)) {
      const dayData = weeklyDataMap.get(mDateStr);
      dayData.Calories += meal.totalCalories;
      dayData.Protein += meal.totalProtein;
      dayData.Fats += meal.totalFat;
      dayData.Fiber += meal.totalFiber;
    }
  });

  const weeklyData = Array.from(weeklyDataMap.values());

  return (
    <Dashboard 
      userId={userId}
      isPremiumUser={isPremium}
      dailyGoals={{
        calories: currentGoals.calories,
        protein: currentGoals.protein,
        fat: currentGoals.fat,
        fiber: currentGoals.fiber,
      }}
      todayTotals={todayTotals}
      todayMeals={mappedTodayMeals}
      activeStreak={activeStreak}
      totalMealsCount={allUserMealTimestamps.length}
    />
  );
}
