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

export async function analyzeMealImageAction(base64Image: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const usdaKey = process.env.USDA_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured on the server. Please check your .env configuration.");
    }
    if (!usdaKey || usdaKey === "YOUR_USDA_API_KEY") {
      throw new Error("USDA_API_KEY is not configured on the server. Please check your .env configuration.");
    }

    const prompt = `Analyze this meal image. Identify all visible food items. Return ONLY valid JSON.
    Format:
    {
      "foods": [
        {
          "name": "Chicken Breast",
          "estimatedQuantity": "150g"
        }
      ]
    }`;

    const modelName = "gemini-3.5-flash"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }]
      })
    });

    if (!geminiRes.ok) {
      throw new Error(`Gemini API returned status ${geminiRes.status}`);
    }

    const data = await geminiRes.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Failed to get response from Gemini API");
    }

    // Clean JSON string
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.substring(7);
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.substring(3);
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    const detectedFoods = parsed.foods || [];

    if (detectedFoods.length === 0) {
      throw new Error("No foods could be detected in the image.");
    }

    // Query USDA API in parallel for each food item
    const items = await Promise.all(
      detectedFoods.map(async (food: any) => {
        try {
          const usdaUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(usdaKey)}&query=${encodeURIComponent(food.name)}&pageSize=1`;
          const usdaRes = await fetch(usdaUrl);
          if (!usdaRes.ok) {
            throw new Error(`USDA API returned status ${usdaRes.status}`);
          }
          const usdaData = await usdaRes.json();
          const match = usdaData.foods?.[0];

          let calories = 0;
          let protein = 0;
          let fat = 0;
          let fiber = 0;

          if (match && match.foodNutrients) {
            for (const nut of match.foodNutrients) {
              const name = (nut.nutrientName || "").toLowerCase();
              const val = Number(nut.value) || 0;
              const id = nut.nutrientId;

              if (name.includes("energy") || name.includes("calories") || id === 1008) {
                calories = val;
              } else if (name.includes("protein") || id === 1003) {
                protein = val;
              } else if (name.includes("lipid") || name.includes("fat") || id === 1004) {
                fat = val;
              } else if (name.includes("fiber") || id === 1079) {
                fiber = val;
              }
            }
          }

          // Parse quantity (e.g. 150g)
          let grams = 100;
          const matchGrams = food.estimatedQuantity.match(/(\d+)\s*(g|gram)/i);
          if (matchGrams) {
            grams = parseFloat(matchGrams[1]) || 100;
          } else {
            const digitOnly = food.estimatedQuantity.match(/\d+/);
            if (digitOnly) {
              const parsedNum = parseFloat(digitOnly[0]);
              if (parsedNum <= 5000) grams = parsedNum;
            }
          }

          const scale = grams / 100.0;

          return {
            name: match?.description || food.name,
            calories: Math.round(calories * scale),
            protein: Math.round(protein * scale),
            fat: Math.round(fat * scale),
            fiber: Math.round(fiber * scale),
            estimatedQuantity: food.estimatedQuantity,
            isManual: false
          };
        } catch (itemErr) {
          console.error(`Error fetching USDA for item ${food.name}:`, itemErr);
          // Fallback to generic estimation if USDA fails
          return {
            name: food.name,
            calories: 150,
            protein: 5,
            fat: 4,
            fiber: 2,
            estimatedQuantity: food.estimatedQuantity,
            isManual: false
          };
        }
      })
    );

    const totalCalories = items.reduce((acc, item) => acc + item.calories, 0);
    const totalProtein = items.reduce((acc, item) => acc + item.protein, 0);
    const totalFat = items.reduce((acc, item) => acc + item.fat, 0);
    const totalFiber = items.reduce((acc, item) => acc + item.fiber, 0);

    return {
      success: true,
      analysis: {
        name: "AI Dissected Meal",
        totalCalories,
        totalProtein,
        totalFat,
        totalFiber,
        summary: `AI Scanner identified ${items.length} food items. Calorie estimates matched against USDA Food Database guidelines.`,
        items
      }
    };
  } catch (err) {
    console.error("AI scan action error:", err);
    return { success: false, error: String(err) };
  }
}


