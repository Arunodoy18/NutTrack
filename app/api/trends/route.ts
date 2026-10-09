import { getActiveProfileId } from "@/lib/access";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { meals, dailyGoals } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = await getActiveProfileId(session.user.id);

    const { searchParams } = new URL(request.url);
    const range = parseInt(searchParams.get("range") || "30", 10);
    const validRange = Math.min(Math.max(1, range), 365); // Cap to 1 year max

    // 1. Fetch user's Daily Nutrition Goals
    const storedGoals = await db.query.dailyGoals.findFirst({
      where: eq(dailyGoals.userId, userId),
      orderBy: (goals, { desc }) => [desc(goals.createdAt)]
    });

    // Fallbacks if somehow no goals set
    const currentGoals = storedGoals ?? {
      calories: 2000, protein: 80, fat: 65, carbs: 250, fiber: 30,
      sodium: 2300, iron: 18, calcium: 1000, vitaminC: 90,
      potassium: 4700, vitaminE: 15, vitaminB12: 2,
    };

    // 2. Fetch meals for the last `validRange` days
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - (validRange - 1));
    pastDate.setHours(0, 0, 0, 0);

    const rangeMeals = await db.query.meals.findMany({
      where: and(
        eq(meals.userId, userId),
        gte(meals.timestamp, pastDate),
        lte(meals.timestamp, today)
      )
    });

    // 3. Aggregate daily totals
    const dailyTotals = Array.from({ length: validRange }).map((_, i) => {
      const d = new Date(pastDate);
      d.setDate(d.getDate() + i);
      const dayFormat = d.toLocaleDateString("en-US", { weekday: 'short' });
      return {
        dateStr: d.toISOString().split("T")[0],
        day: dayFormat, // 'Sun', 'Mon', etc.
        timestamp: d.getTime(),
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
        sodium: 0,
        potassium: 0,
        iron: 0,
        vitaminC: 0,
        vitaminE: 0,
        vitaminB12: 0,
        calcium: 0,
      };
    });

    rangeMeals.forEach(meal => {
      const mealDateStr = new Date(meal.timestamp).toISOString().split("T")[0];
      const dayObj = dailyTotals.find(d => d.dateStr === mealDateStr);
      if (dayObj) {
        dayObj.calories += meal.totalCalories;
        dayObj.protein += meal.totalProtein;
        dayObj.fat += meal.totalFat;
        dayObj.carbs += meal.totalCarbs || 0;
        dayObj.fiber += meal.totalFiber;
        dayObj.sodium += meal.totalSodium || 0;
        dayObj.potassium += meal.totalPotassium || 0;
        dayObj.iron += meal.totalIron || 0;
        dayObj.vitaminC += meal.totalVitaminC || 0;
        dayObj.vitaminE += meal.totalVitaminE || 0;
        dayObj.vitaminB12 += meal.totalVitaminB12 || 0;
        dayObj.calcium += meal.totalCalcium || 0;
      }
    });

    return NextResponse.json({
      success: true,
      range: validRange,
      goals: {
        calories: currentGoals.calories,
        protein: currentGoals.protein,
        fat: currentGoals.fat,
        carbs: currentGoals.carbs,
        fiber: currentGoals.fiber,
        sodium: currentGoals.sodium,
        potassium: currentGoals.potassium,
        iron: currentGoals.iron,
        vitaminC: currentGoals.vitaminC,
        vitaminE: currentGoals.vitaminE,
        vitaminB12: currentGoals.vitaminB12,
        calcium: currentGoals.calcium,
      },
      data: dailyTotals
    });

  } catch (err: any) {
    console.error("GET /api/trends error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
