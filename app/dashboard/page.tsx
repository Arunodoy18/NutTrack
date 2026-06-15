import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { meals, mealItems, dailyGoals, users } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import Dashboard, { MealLogData, FoodItemData } from "@/components/Dashboard";
import { calculateActiveStreak } from "@/lib/streak";

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
  const isPremium = currentUser?.isPremium || false;

  // 1. Fetch user's Daily Nutrition Goals
  let currentGoals = await db.query.dailyGoals.findFirst({
    where: eq(dailyGoals.userId, userId),
    orderBy: (goals, { desc }) => [desc(goals.createdAt)]
  });

  // If no custom daily goal exists, populate with standard dietary guidelines
  if (!currentGoals) {
    try {
      const [newGoal] = await db.insert(dailyGoals).values({
        userId: userId,
        calories: 2000,
        protein: 80,
        fat: 65,
        fiber: 30,
      }).returning();
      currentGoals = newGoal;
    } catch (err) {
      currentGoals = {
        id: "default-id",
        userId: userId,
        calories: 2000,
        protein: 80,
        fat: 65,
        fiber: 30,
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
      estimatedQuantity: item.estimatedQuantity || "100g"
    }));

    return {
      id: meal.id,
      timestamp: meal.timestamp.toISOString(),
      summary: meal.summary || "No description provided",
      totalCalories: meal.totalCalories,
      totalProtein: meal.totalProtein,
      totalFat: meal.totalFat,
      totalFiber: meal.totalFiber,
      items: mealItemsList
    };
  });

  // 4. Calculate aggregated daily running totals
  const todayTotals = mappedTodayMeals.reduce((acc, meal) => {
    return {
      calories: acc.calories + meal.totalCalories,
      protein: acc.protein + meal.totalProtein,
      fat: acc.fat + meal.totalFat,
      fiber: acc.fiber + meal.totalFiber
    };
  }, { calories: 0, protein: 0, fat: 0, fiber: 0 });

  // 5. Calculate global user streak based on all historic logged meals
  const allUserMeals = await db.query.meals.findMany({
    where: eq(meals.userId, userId),
    orderBy: (mealsTable, { desc }) => [desc(mealsTable.timestamp)]
  });
  const activeStreak = calculateActiveStreak(allUserMeals.map(m => m.timestamp));

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

  // Populate actuals
  allUserMeals.forEach(meal => {
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
      totalMealsCount={allUserMeals.length}
      weeklyData={weeklyData}
    />
  );
}
