"use server";

import { db } from "@/lib/db";
import { dailyGoals, meals, mealItems } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";

export async function saveDailyGoalsAction(
  userId: string,
  targetValues: {
    calories: number;
    protein: number;
    fat: number;
    fiber: number;
  }
) {
  try {
    await db.insert(dailyGoals).values({
      userId: userId,
      calories: targetValues.calories,
      protein: targetValues.protein,
      fat: targetValues.fat,
      fiber: targetValues.fiber,
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("Failed to save daily goals:", err);
    return { success: false, error: String(err) };
  }
}

export async function saveMealAction(
  userId: string,
  mealData: {
    summary: string;
    totalCalories: number;
    totalProtein: number;
    totalFat: number;
    totalFiber: number;
    items: {
      name: string;
      calories: number;
      protein: number;
      fat: number;
      fiber: number;
      estimatedQuantity: string;
    }[];
  }
) {
  try {
    const [insertedMeal] = await db.insert(meals).values({
      userId: userId,
      summary: mealData.summary,
      totalCalories: mealData.totalCalories,
      totalProtein: mealData.totalProtein,
      totalFat: mealData.totalFat,
      totalFiber: mealData.totalFiber,
      timestamp: new Date(),
    }).returning();

    for (const item of mealData.items) {
      await db.insert(mealItems).values({
        mealId: insertedMeal.id,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        fiber: item.fiber,
        estimatedQuantity: item.estimatedQuantity,
      });
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("Failed to save meal:", err);
    return { success: false, error: String(err) };
  }
}

export async function generateNutritionInsightAction(
  userId: string,
  todayTotals: { calories: number; protein: number; fat: number; fiber: number },
  dailyGoals: { calories: number; protein: number; fat: number; fiber: number }
) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return { success: true, insight: getFallbackInsight(todayTotals, dailyGoals) };
    }

    const { calories, protein, fat, fiber } = todayTotals;
    const gCals = dailyGoals.calories;
    const gProt = dailyGoals.protein;
    const gFat = dailyGoals.fat;
    const gFib = dailyGoals.fiber;

    const prompt = `You are an expert sports nutritionist and dietitian. Based on the user's logged intake today and their goals, formulate exactly ONE encouraging daily tip (max 50 words) about balancing macronutrients.
Intake today:
- Calories: ${calories} kcal (Goal: ${gCals})
- Protein: ${protein}g (Goal: ${gProt})
- Fat: ${fat}g (Goal: ${gFat})
- Fiber: ${fiber}g (Goal: ${gFib})

Make sure the tip is highly actionable, encouraging, and references their exact intake ratio values. Do not output markdown lists, just a single, cohesive paragraph of up to 2-3 sentences max. Do not exceed 50 words.`;

    const modelName = "gemini-3.5-flash"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return { success: true, insight: text.trim() };
      }
    }
    
    return { success: true, insight: getFallbackInsight(todayTotals, dailyGoals) };
  } catch (err) {
    console.error("AI Insight error, doing fallback:", err);
    return { success: true, insight: getFallbackInsight(todayTotals, dailyGoals) };
  }
}

function getFallbackInsight(
  todayTotals: { calories: number; protein: number; fat: number; fiber: number },
  dailyGoals: { calories: number; protein: number; fat: number; fiber: number }
): string {
  const { calories, protein, fat, fiber } = todayTotals;
  const pRatio = protein / (dailyGoals.protein || 1);
  const fRatio = fiber / (dailyGoals.fiber || 1);
  const fatRatio = fat / (dailyGoals.fat || 1);

  if (protein === 0 && calories === 0) {
    return "Ready for a great day? Prioritize a high-protein breakfast like Greek yogurt or organic eggs to stabilize glucose levels and power your cognitive energy all morning.";
  }

  if (pRatio < 0.5) {
    return `Your protein is currently at ${Math.round(pRatio * 100)}% of your benchmark. Incorporating a snack like grass-fed beef jerky, wild salmon, or organic tofu will aid muscle protein synthesis today.`;
  }

  if (fRatio < 0.5) {
    return `You've achieved ${Math.round(pRatio * 100)}% protein, but fiber is lagging. Adding an avocado, a cup of fresh raspberries, or premium chia seeds to your next meal will help slow digestion and feed healthy gut microbes.`;
  }

  if (fatRatio > 1.1) {
    return `Your lipid intake is slightly elevated. For your remaining meals, focus on leaner proteins like turkey breast or egg whites paired with cruciferous vegetables to balance out the calorie density.`;
  }

  return "Excellent macronutrient distribution so far! Keep up the pristine balance by drinking ample water and aiming for another high-fiber dinner to sustain steady glycemic levels.";
}

