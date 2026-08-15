"use server";

import { db } from "@/lib/db";
import { dailyGoals, meals, mealItems, users, groceryList, payments } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkScanRateLimit } from "@/lib/rateLimit";
import { eq, and, gte, lte } from "drizzle-orm";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { Redis } from "@upstash/redis";

// Groq's API is OpenAI-compatible, so this is the same SDK pointed at a
// different base URL. Handles the text-only AI paths.
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "dummy",
  baseURL: "https://api.groq.com/openai/v1",
});

// Meal/fridge photo analysis runs on Gemini's free tier - Groq has no vision
// models at all, and this avoids OpenAI's paid API entirely. Free tier means
// Google may review/train on submitted photos (see privacy policy update).
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? Redis.fromEnv()
  : null;

const GROQ_MODEL = "openai/gpt-oss-120b";
// gemini-2.5-flash returns 404 "no longer available to new users" on this
// account. gemini-3.7-flash works but hit a transient 503 "high demand"
// under testing (very new model, 08-2026). gemini-3.6-flash was reliable
// across repeated tests and still reads images correctly - safer choice
// for a launched app than the newest-but-flakier release.
const GEMINI_VISION_MODEL = "gemini-3.6-flash";

async function checkAiAccess(overrideUserId?: string) {
  let userId = overrideUserId;
  if (!userId) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");
    userId = session.user.id;
  }
  
  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });
  let isPremium = userRecord?.isPremium ?? false;
  if (userRecord?.createdAt) {
    const ageDays = (Date.now() - new Date(userRecord.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 30) isPremium = true;
  }
  
  const { allowed } = await checkScanRateLimit(userId, isPremium);
  
  if (!allowed) {
    if (isPremium) {
      throw new Error("Premium rate limit exceeded (200 scans/day). Please try again later.");
    } else {
      throw new Error("Rate limit exceeded (5 scans/hour). Please upgrade to premium for more scans.");
    }
  }
  
  return true;
}

export async function saveDailyGoalsAction(
  userId: string,
  targetValues: {
    calories: number;
    protein: number;
    fat: number;
    fiber: number;
    sodium?: number;
    iron?: number;
    calcium?: number;
    vitaminC?: number;
    potassium?: number;
    vitaminE?: number;
    vitaminB12?: number;
  },
  bypassSessionCheck: boolean = false
) {
  try {
    if (!bypassSessionCheck) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user || session.user.id !== userId) {
        throw new Error("Unauthorized: Invalid session or user ID mismatch");
      }
    }

    // Sanitize and bound inputs
    const safeCals = Math.min(Math.max(0, targetValues.calories || 0), 20000);
    const safeProtein = Math.min(Math.max(0, targetValues.protein || 0), 1000);
    const safeFat = Math.min(Math.max(0, targetValues.fat || 0), 1000);
    const safeFiber = Math.min(Math.max(0, targetValues.fiber || 0), 200);
    const safeSodium = Math.min(Math.max(0, targetValues.sodium ?? 2300), 10000);
    const safeIron = Math.min(Math.max(0, targetValues.iron ?? 18), 100);
    const safeCalcium = Math.min(Math.max(0, targetValues.calcium ?? 1000), 5000);
    const safeVitC = Math.min(Math.max(0, targetValues.vitaminC ?? 90), 2000);
    const safePotassium = Math.min(Math.max(0, targetValues.potassium ?? 4700), 15000);
    const safeVitE = Math.min(Math.max(0, targetValues.vitaminE ?? 15), 1000);
    const safeVitB12 = Math.min(Math.max(0, targetValues.vitaminB12 ?? 2), 1000);

    await db.insert(dailyGoals).values({
      userId: userId,
      calories: safeCals,
      protein: safeProtein,
      fat: safeFat,
      fiber: safeFiber,
      sodium: safeSodium,
      iron: safeIron,
      calcium: safeCalcium,
      vitaminC: safeVitC,
      potassium: safePotassium,
      vitaminE: safeVitE,
      vitaminB12: safeVitB12,
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("Failed to save daily goals:", err);
    return { success: false, error: String(err) };
  }
}

// Required by Google Play's User Data policy: apps that allow account
// creation must also let users delete their account and data. All of the
// user's tables (meals, mealItems, dailyGoals, accounts, sessions, payments,
// groceryList) reference users.id with onDelete: "cascade", so deleting the
// user row is enough to remove everything.
export async function deleteAccountAction(userId: string, bypassSessionCheck: boolean = false) {
  try {
    if (!bypassSessionCheck) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id || session.user.id !== userId) {
        return { success: false, error: "Unauthorized" };
      }
    }

    await db.delete(users).where(eq(users.id, userId));
    return { success: true };
  } catch (err) {
    console.error("Failed to delete account:", err);
    return { success: false, error: String(err) };
  }
}

export async function saveMealAction(
  userId: string,
  mealData: {
    summary: string;
    mealSession?: string;
    totalCalories: number;
    totalProtein: number;
    totalFat: number;
    totalCarbs: number;
    totalFiber: number;
    totalSodium?: number;
    totalIron?: number;
    totalCalcium?: number;
    totalVitaminC?: number;
    totalPotassium?: number;
    totalVitaminE?: number;
    totalVitaminB12?: number;
    imageUrl?: string;
    items: {
      name: string;
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
      fiber: number;
      sodium?: number;
      iron?: number;
      calcium?: number;
      vitaminC?: number;
      potassium?: number;
      vitaminE?: number;
      vitaminB12?: number;
      estimatedQuantity: string;
    }[];
  },
  bypassSessionCheck: boolean = false
) {
  try {
    if (!bypassSessionCheck) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user || session.user.id !== userId) {
        throw new Error("Unauthorized: Invalid session or user ID mismatch");
      }
    }

    // Sanitize and bound totals
    const safeTotalCals = Math.min(Math.max(0, mealData.totalCalories || 0), 20000);
    const safeTotalProt = Math.min(Math.max(0, mealData.totalProtein || 0), 1000);
    const safeTotalFat = Math.min(Math.max(0, mealData.totalFat || 0), 1000);
    const safeTotalCarbs = Math.min(Math.max(0, mealData.totalCarbs || 0), 1000);
    const safeTotalFib = Math.min(Math.max(0, mealData.totalFiber || 0), 200);
    const safeTotalSod = Math.min(Math.max(0, mealData.totalSodium || 0), 10000);
    const safeTotalIron = Math.min(Math.max(0, mealData.totalIron || 0), 100);
    const safeTotalCalc = Math.min(Math.max(0, mealData.totalCalcium || 0), 5000);
    const safeTotalVitC = Math.min(Math.max(0, mealData.totalVitaminC || 0), 2000);
    const safeTotalPotassium = Math.min(Math.max(0, mealData.totalPotassium || 0), 15000);
    const safeTotalVitE = Math.min(Math.max(0, mealData.totalVitaminE || 0), 1000);
    const safeTotalVitB12 = Math.min(Math.max(0, mealData.totalVitaminB12 || 0), 1000);

    const [insertedMeal] = await db.insert(meals).values({
      userId: userId,
      summary: mealData.summary || "Meal",
      mealSession: mealData.mealSession || "Snack",
      totalCalories: safeTotalCals,
      totalProtein: safeTotalProt,
      totalFat: safeTotalFat,
      totalCarbs: safeTotalCarbs,
      totalFiber: safeTotalFib,
      totalSodium: safeTotalSod,
      totalIron: safeTotalIron,
      totalCalcium: safeTotalCalc,
      totalVitaminC: safeTotalVitC,
      totalPotassium: safeTotalPotassium,
      totalVitaminE: safeTotalVitE,
      totalVitaminB12: safeTotalVitB12,
      imagePath: mealData.imageUrl,
      timestamp: new Date(),
    }).returning();

    for (const item of mealData.items) {
      if (!item.name || item.name.trim() === "") continue;
      
      const safeItemCals = Math.min(Math.max(0, item.calories || 0), 5000);
      const safeItemProt = Math.min(Math.max(0, item.protein || 0), 500);
      const safeItemFat = Math.min(Math.max(0, item.fat || 0), 500);
      const safeItemCarbs = Math.min(Math.max(0, item.carbs || 0), 500);
      const safeItemFib = Math.min(Math.max(0, item.fiber || 0), 100);
      const safeItemSod = Math.min(Math.max(0, item.sodium || 0), 5000);
      const safeItemIron = Math.min(Math.max(0, item.iron || 0), 100);
      const safeItemCalc = Math.min(Math.max(0, item.calcium || 0), 5000);
      const safeItemVitC = Math.min(Math.max(0, item.vitaminC || 0), 2000);
      const safeItemPotassium = Math.min(Math.max(0, item.potassium || 0), 5000);
      const safeItemVitE = Math.min(Math.max(0, item.vitaminE || 0), 1000);
      const safeItemVitB12 = Math.min(Math.max(0, item.vitaminB12 || 0), 1000);

      await db.insert(mealItems).values({
        mealId: insertedMeal.id,
        name: item.name.trim().substring(0, 100),
        calories: safeItemCals,
        protein: safeItemProt,
        fat: safeItemFat,
        carbs: safeItemCarbs,
        fiber: safeItemFib,
        sodium: safeItemSod,
        iron: safeItemIron,
        calcium: safeItemCalc,
        vitaminC: safeItemVitC,
        potassium: safeItemPotassium,
        vitaminE: safeItemVitE,
        vitaminB12: safeItemVitB12,
        estimatedQuantity: (item.estimatedQuantity || "1 serving").substring(0, 50),
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
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey || apiKey === "YOUR_GROQ_API_KEY") {
      return { success: true, insight: getFallbackInsight(todayTotals, dailyGoals) };
    }

    const { calories, protein, fat, fiber } = todayTotals;

    // Redis Caching Logic
    const dateStr = new Date().toISOString().split('T')[0];
    const cacheKey = `insight:${userId}:${dateStr}:${calories}:${protein}`;
    
    if (redis) {
      const cachedInsight = await redis.get<string>(cacheKey);
      if (cachedInsight) {
        return { success: true, insight: cachedInsight };
      }
    }

    const gCals = dailyGoals.calories;
    const gProt = dailyGoals.protein;
    const gFat = dailyGoals.fat;
    const gFib = dailyGoals.fiber;

    const now = new Date();
    const timeOfDay = now.getHours() + ":" + now.getMinutes().toString().padStart(2, "0");
    const inputData = {
      goals: { calories: gCals, protein_g: gProt, fat_g: gFat, fiber_g: gFib },
      today: { calories, protein_g: protein, fat_g: fat, fiber_g: fiber },
      time_of_day: timeOfDay
    };

    const prompt = `You are a concise, encouraging nutrition coach in dietBuddy.

Given the user's today's nutrition data and their goals, generate one short insight (2-3 sentences max).

Be specific and actionable. Do not give generic advice. Reference their actual numbers.
Do not be preachy or negative. Sound like a knowledgeable friend, not a medical professional.

INPUT (JSON):
${JSON.stringify(inputData, null, 2)}

OUTPUT (plain text, 2-3 sentences):`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }]
    });

    const text = completion.choices[0].message.content;
    if (text) {
      const insightText = text.trim();
      if (redis) {
        // Cache for 3 hours (10800 seconds)
        await redis.set(cacheKey, insightText, { ex: 10800 });
      }
      return { success: true, insight: insightText };
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

export async function analyzeMealImageAction(base64Image: string, overrideUserId?: string) {
  try {
    await checkAiAccess(overrideUserId);

    if (base64Image) {
      const sizeInMB = (base64Image.length * 3) / 4 / 1024 / 1024;
      if (sizeInMB > 10) throw new Error("Image exceeds 10MB limit");
      
      if (base64Image.startsWith("data:") && !base64Image.startsWith("data:image/")) {
        throw new Error("Invalid file type. Only images are allowed.");
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured on the server. Please check your .env configuration.");
    }

    const prompt = `You are a precision nutrition AI embedded in dietBuddy, a calorie tracking app.

The user has uploaded a photo of their meal. Your job is to identify every distinct food item visible on the plate, estimate its portion weight in grams, and return structured nutritional data.

RULES:
- Be highly robust. Even if the image is slightly blurry or poorly lit, try your absolute best to identify the food.
- NON-FOOD IMAGES: If the image is completely pitch black or obviously NOT food (e.g., a picture of a car or a wall), you MUST return an error in this exact JSON format: { "error": "not_food", "message": "good try buddy , try better" }. Do not use any other message for non-food.
- ANY MEAL TYPE: Whether it is a post-workout shake, a bowl of cereal, a pre-workout snack, or a full dinner, you must identify everything crystal clear.
- EXACT MACROS: You must be mathematically perfect. ALWAYS cross-reference your nutrition estimates against USDA FoodData Central values. Use scientifically verified macros per 100g.
- WEIGHT ESTIMATION: Your weight estimates must be extremely precise. Estimate the weight in grams. If you detect a fork, spoon, knife, coin, or hand, use it as a size reference (a standard dinner fork is ~19cm long) to perfectly calculate volume and weight.
- Always return valid JSON only. No markdown, no explanation.

OUTPUT FORMAT (strict JSON):
{
  "meal_name": "Short descriptive name of the whole meal",
  "meal_session": "Breakfast", // Must be one of: Breakfast, Lunch, Dinner, Snack (infer from food type or default to Snack)
  "confidence": 0.87,
  "items": [
    {
      "name": "Grilled Chicken Breast",
      "weight_g": 150,
      "calories": 248,
      "protein_g": 46.5,
      "fat_g": 5.4,
      "carbs_g": 0,
      "fiber_g": 0,
      "sodium_mg": 110,
      "iron_mg": 1.5,
      "calcium_mg": 22,
      "vit_c_mg": 0
    }
  ],
  "totals": {
    "calories": 248,
    "protein_g": 46.5,
    "fat_g": 5.4,
    "carbs_g": 0,
    "fiber_g": 0,
    "sodium_mg": 110,
    "iron_mg": 1.5,
    "calcium_mg": 22,
    "vit_c_mg": 0,
    "potassium_mg": 350,
    "vit_e_mg": 1.2,
    "vit_b12_mcg": 0.5
  },
  "notes": "Short summary of the meal."
}`;

    // Gemini's inlineData wants raw base64 + a separate mimeType, not a data: URI.
    const imageDataMatch = base64Image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    const rawBase64 = imageDataMatch ? imageDataMatch[2] : base64Image;
    const imageMimeType = imageDataMatch ? imageDataMatch[1] : "image/jpeg";

    const response = await gemini.models.generateContent({
      model: GEMINI_VISION_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { data: rawBase64, mimeType: imageMimeType } }
          ]
        }
      ]
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("Failed to get response from Gemini API");
    }

    // Clean JSON string using regex to handle conversational filler
    let cleaned = rawText.trim();
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      cleaned = jsonBlockMatch[1].trim();
    } else {
      const braceMatch = cleaned.match(/\{[\s\S]*\}/);
      if (braceMatch) cleaned = braceMatch[0];
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI response:", cleaned);
      throw new Error("Failed to analyze meal. The AI returned an invalid format. Please try again.");
    }
    
    if (parsed.error) {
      throw new Error(parsed.message || "Invalid meal image.");
    }

    const detectedFoods = parsed.items || [];
    if (detectedFoods.length === 0) {
      throw new Error("No foods could be detected in the image.");
    }

    const items = detectedFoods.map((food: any) => ({
      name: food.name,
      calories: Math.round(food.calories || 0),
      protein: Math.round(food.protein_g || 0),
      fat: Math.round(food.fat_g || 0),
      carbs: Math.round(food.carbs_g || 0),
      fiber: Math.round(food.fiber_g || 0),
      sodium: Math.round(food.sodium_mg || 0),
      iron: Math.round(food.iron_mg || 0),
      calcium: Math.round(food.calcium_mg || 0),
      vitaminC: Math.round(food.vit_c_mg || 0),
      potassium: Math.round(food.potassium_mg || 0),
      vitaminE: Math.round(food.vit_e_mg || 0),
      vitaminB12: Math.round(food.vit_b12_mcg || 0),
      estimatedQuantity: `${food.weight_g || 100}g`,
      isManual: false
    }));

    const totals = parsed.totals || { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, sodium_mg: 0, iron_mg: 0, calcium_mg: 0, vit_c_mg: 0, potassium_mg: 0, vit_e_mg: 0, vit_b12_mcg: 0 };

    return {
      success: true,
      analysis: {
        name: parsed.meal_name || "AI Dissected Meal",
        mealSession: parsed.meal_session || "Snack",
        totalCalories: Math.round(totals.calories || items.reduce((acc: number, i: any) => acc + i.calories, 0)),
        totalProtein: Math.round(totals.protein_g || items.reduce((acc: number, i: any) => acc + i.protein, 0)),
        totalFat: Math.round(totals.fat_g || items.reduce((acc: number, i: any) => acc + i.fat, 0)),
        totalCarbs: Math.round(totals.carbs_g || items.reduce((acc: number, i: any) => acc + i.carbs, 0)),
        totalFiber: Math.round(totals.fiber_g || items.reduce((acc: number, i: any) => acc + i.fiber, 0)),
        totalSodium: Math.round(totals.sodium_mg || items.reduce((acc: number, i: any) => acc + i.sodium, 0)),
        totalIron: Math.round(totals.iron_mg || items.reduce((acc: number, i: any) => acc + i.iron, 0)),
        totalCalcium: Math.round(totals.calcium_mg || items.reduce((acc: number, i: any) => acc + i.calcium, 0)),
        totalVitaminC: Math.round(totals.vit_c_mg || items.reduce((acc: number, i: any) => acc + i.vitaminC, 0)),
        totalPotassium: Math.round(totals.potassium_mg || items.reduce((acc: number, i: any) => acc + i.potassium, 0)),
        totalVitaminE: Math.round(totals.vit_e_mg || items.reduce((acc: number, i: any) => acc + i.vitaminE, 0)),
        totalVitaminB12: Math.round(totals.vit_b12_mcg || items.reduce((acc: number, i: any) => acc + i.vitaminB12, 0)),
        summary: parsed.notes || `AI Scanner identified ${items.length} food items.`,
        items
      }
    };
  } catch (err) {
    console.error("AI scan action error:", err);
    return { success: false, error: String(err) };
  }
}

export async function analyzeMealTextAction(text: string, overrideUserId?: string) {
  try {
    await checkAiAccess(overrideUserId);

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey || apiKey === "YOUR_GROQ_API_KEY") throw new Error("GROQ_API_KEY is missing");

    const prompt = `You are a precise food logging parser for dietBuddy.

The user has described a meal in natural language. Extract every food item mentioned, infer portion sizes from context clues, and return structured nutrition data.

RULES:
- "A bowl of rice" = 200g cooked rice. "A plate of pasta" = 250g cooked pasta. Use standard USDA serving conventions.
- If a quantity is ambiguous, use the most conservative common serving size and flag it.
- Handle compound foods: "butter chicken with naan" = log both items separately.
- If input contains no recognizable food, return { "error": "not_food", "message": "good try buddy , try better" }
- Extract the following micronutrients: sodium (mg), iron (mg), calcium (mg), vitaminC (mg), potassium (mg), vitaminE (mg), and vitaminB12 (mcg).
- Infer meal session (Breakfast, Lunch, Dinner, Snack) from the text (e.g. "morning", "dinner", "evening") or food type, or default to Snack.
- Return valid JSON only.

Text: "${text}"

INPUT EXAMPLE: "I had two scrambled eggs and a slice of whole wheat toast with butter"

OUTPUT FORMAT:
{
  "meal_name": "Scrambled eggs with toast",
  "meal_session": "Breakfast",
  "items": [
    { "name": "Scrambled eggs", "quantity": "2 large eggs", "weight_g": 100, "calories": 182, "protein_g": 12, "fat_g": 14, "carbs_g": 1.4, "fiber_g": 0, "sodium_mg": 280, "iron_mg": 1.8, "calcium_mg": 56, "vitaminC_mg": 0, "potassium_mg": 138, "vitaminE_mg": 1.1, "vitaminB12_mcg": 0.9 },
    { "name": "Whole wheat toast", "quantity": "1 slice", "weight_g": 28, "calories": 69, "protein_g": 3.6, "fat_g": 1, "carbs_g": 12, "fiber_g": 1.9, "sodium_mg": 132, "iron_mg": 0.7, "calcium_mg": 20, "vitaminC_mg": 0, "potassium_mg": 71, "vitaminE_mg": 0.2, "vitaminB12_mcg": 0 },
    { "name": "Butter", "quantity": "1 tsp", "weight_g": 5, "calories": 36, "protein_g": 0, "fat_g": 4, "carbs_g": 0, "fiber_g": 0, "sodium_mg": 32, "iron_mg": 0, "calcium_mg": 1, "vitaminC_mg": 0, "potassium_mg": 1, "vitaminE_mg": 0.1, "vitaminB12_mcg": 0.01 }
  ],
  "totals": { "calories": 287, "protein_g": 15.6, "fat_g": 19, "carbs_g": 13.4, "fiber_g": 1.9, "sodium_mg": 444, "iron_mg": 2.5, "calcium_mg": 77, "vitaminC_mg": 0, "potassium_mg": 210, "vitaminE_mg": 1.4, "vitaminB12_mcg": 0.91 },
  "assumptions": ["Used 2 large eggs as stated", "1 tsp butter assumed for toast"]
}`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }]
    });

    let rawText = completion.choices[0].message.content || "";

    // Clean JSON string using regex to handle conversational filler
    let cleaned = rawText.trim();
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      cleaned = jsonBlockMatch[1].trim();
    } else {
      const braceMatch = cleaned.match(/\{[\s\S]*\}/);
      if (braceMatch) cleaned = braceMatch[0];
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI response (text):", cleaned);
      throw new Error("Failed to analyze meal text. The AI returned an invalid format.");
    }
    
    if (parsed.error === "no_food_detected" || parsed.error) {
      throw new Error(parsed.message || "No recognizable food items found in the text.");
    }
    
    const detectedFoods = parsed.items || [];
    if (detectedFoods.length === 0) throw new Error("No foods detected in the text.");

    const items = detectedFoods.map((food: any) => ({
      name: food.name,
      calories: Math.round(food.calories || 0),
      protein: Math.round(food.protein_g || 0),
      fat: Math.round(food.fat_g || 0),
      carbs: Math.round(food.carbs_g || 0),
      fiber: Math.round(food.fiber_g || 0),
      sodium: Math.round(food.sodium_mg || 0),
      iron: Math.round(food.iron_mg || 0),
      calcium: Math.round(food.calcium_mg || 0),
      vitaminC: Math.round(food.vitaminC_mg || 0),
      potassium: Math.round(food.potassium_mg || 0),
      vitaminE: Math.round(food.vitaminE_mg || 0),
      vitaminB12: Math.round(food.vitaminB12_mcg || 0),
      estimatedQuantity: food.quantity ? `${food.quantity} (${food.weight_g || 100}g)` : `${food.weight_g || 100}g`,
      isManual: false
    }));

    const totals = parsed.totals || { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, sodium_mg: 0, iron_mg: 0, calcium_mg: 0, vitaminC_mg: 0, potassium_mg: 0, vitaminE_mg: 0, vitaminB12_mcg: 0 };

    return {
      success: true,
      analysis: {
        name: parsed.meal_name || "Voice Logged Meal",
        mealSession: parsed.meal_session || "Snack",
        totalCalories: Math.round(totals.calories || items.reduce((acc: number, i: any) => acc + i.calories, 0)),
        totalProtein: Math.round(totals.protein_g || items.reduce((acc: number, i: any) => acc + i.protein, 0)),
        totalFat: Math.round(totals.fat_g || items.reduce((acc: number, i: any) => acc + i.fat, 0)),
        totalCarbs: Math.round(totals.carbs_g || items.reduce((acc: number, i: any) => acc + i.carbs, 0)),
        totalFiber: Math.round(totals.fiber_g || items.reduce((acc: number, i: any) => acc + i.fiber, 0)),
        totalSodium: Math.round(totals.sodium_mg || items.reduce((acc: number, i: any) => acc + i.sodium, 0)),
        totalIron: Math.round(totals.iron_mg || items.reduce((acc: number, i: any) => acc + i.iron, 0)),
        totalCalcium: Math.round(totals.calcium_mg || items.reduce((acc: number, i: any) => acc + i.calcium, 0)),
        totalVitaminC: Math.round(totals.vitaminC_mg || items.reduce((acc: number, i: any) => acc + i.vitaminC, 0)),
        totalPotassium: Math.round(totals.potassium_mg || items.reduce((acc: number, i: any) => acc + i.potassium, 0)),
        totalVitaminE: Math.round(totals.vitaminE_mg || items.reduce((acc: number, i: any) => acc + i.vitaminE, 0)),
        totalVitaminB12: Math.round(totals.vitaminB12_mcg || items.reduce((acc: number, i: any) => acc + i.vitaminB12, 0)),
        summary: parsed.assumptions?.length ? parsed.assumptions.join(" ") : `AI parsed voice input and identified ${items.length} food items.`,
        items
      }
    };
  } catch (err) {
    console.error("AI text scan error:", err);
    return { success: false, error: String(err) };
  }
}

// ==========================================
// GROCERY LIST ACTIONS
// ==========================================

export async function addIngredientsToGroceryListAction(ingredients: string[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { success: false, error: "Unauthorized" };
    
    const userId = session.user.id;
    
    // Check which ones already exist for this user to avoid duplicates
    const existing = await db.query.groceryList.findMany({
      where: eq(groceryList.userId, userId)
    });
    const existingNames = existing.map(e => e.ingredientName.toLowerCase());
    
    const newIngredients = ingredients.filter(ing => !existingNames.includes(ing.toLowerCase()));
    
    if (newIngredients.length > 0) {
      const inserts = newIngredients.map(ing => ({
        userId,
        ingredientName: ing,
        isPurchased: false
      }));
      await db.insert(groceryList).values(inserts);
      revalidatePath("/dashboard");
    }
    
    return { success: true, added: newIngredients.length };
  } catch (error: any) {
    console.error("Error adding to grocery list:", error);
    return { success: false, error: error.message };
  }
}

export async function getGroceryListAction() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { success: false, error: "Unauthorized" };
    
    const list = await db.query.groceryList.findMany({
      where: eq(groceryList.userId, session.user.id),
      orderBy: (items, { desc }) => [desc(items.createdAt)]
    });
    
    return { success: true, list };
  } catch (error: any) {
    console.error("Error fetching grocery list:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// AI ADVISOR ACTIONS
// ==========================================

export async function updateDietaryPreferencesAction(preferences: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { success: false, error: "Unauthorized" };
    
    await db.update(users)
      .set({ dietaryPreferences: preferences })
      .where(eq(users.id, session.user.id));
      
    return { success: true };
  } catch (error: any) {
    console.error("Error updating dietary preferences:", error);
    return { success: false, error: error.message };
  }
}

export async function chatWithAIAdvisorAction(message: string, history: { role: 'user' | 'assistant', content: string }[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;
    
    // Fetch user context
    const userDoc = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: { dailyGoals: true }
    });
    
    const preferences = userDoc?.dietaryPreferences || "No specific preferences set.";
    const goals = userDoc?.dailyGoals?.[0];
    
    let goalsContext = "No daily goals set.";
    if (goals) {
      goalsContext = `Calories: ${goals.calories}kcal, Protein: ${goals.protein}g, Fat: ${goals.fat}g, Fiber: ${goals.fiber}g.`;
    }

    const systemPrompt = `You are the NutTrack AI Meal Advisor, a smart, encouraging, and highly knowledgeable personal nutritionist.
Your job is to provide specific, actionable, and scientifically sound dietary advice to the user.

USER CONTEXT:
Dietary Preferences: ${preferences}
Daily Macro Goals: ${goalsContext}

RULES:
1. ALWAYS respect the user's Dietary Preferences. If they are vegan, NEVER suggest meat. If allergic to nuts, WARN against them.
2. Provide concise, friendly answers. Avoid massive walls of text. Use bullet points when suggesting meals.
3. Factor in their Daily Macro Goals when suggesting foods.
4. If they ask a non-food related question, politely pivot back to nutrition.`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return { 
      success: true, 
      reply: completion.choices[0].message.content,
      preferences: userDoc?.dietaryPreferences // Send back to update UI if needed
    };
  } catch (error: any) {
    console.error("Error chatting with AI advisor:", error);
    return { success: false, error: "Failed to connect to AI Advisor." };
  }
}

export async function toggleGroceryItemAction(itemId: string, isPurchased: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { success: false, error: "Unauthorized" };
    
    await db.update(groceryList)
      .set({ isPurchased })
      .where(and(eq(groceryList.id, itemId), eq(groceryList.userId, session.user.id)));
      
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error toggling grocery item:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteGroceryItemAction(itemId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { success: false, error: "Unauthorized" };
    
    await db.delete(groceryList)
      .where(and(eq(groceryList.id, itemId), eq(groceryList.userId, session.user.id)));
      
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting grocery item:", error);
    return { success: false, error: error.message };
  }
}

export async function analyzeFridgeImageAction(base64Image: string, overrideUserId?: string) {
  try {
    await checkAiAccess(overrideUserId);

    if (base64Image) {
      const sizeInMB = (base64Image.length * 3) / 4 / 1024 / 1024;
      if (sizeInMB > 10) throw new Error("Image exceeds 10MB limit");
      
      if (!base64Image.startsWith("data:image/")) {
        throw new Error("Invalid file type. Only images are allowed.");
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is missing. Please configure your .env file.");
    }

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `You are an expert macro-focused chef AI embedded in dietBuddy.

The user has uploaded a photo of their fridge or pantry. Your job is:
1. Identify all visible raw ingredients with reasonable confidence
2. Generate exactly 3 complete recipes using ONLY those ingredients
3. Each recipe must be realistic to cook and macro-optimized (high protein preferred)
4. Include full step-by-step instructions and nutrition per serving

RULES:
- Only use ingredients actually visible in the image. Do not invent ingredients.
- If the image shows no identifiable ingredients, return { "error": "no_ingredients" }
- Recipes must be practical — 30 minutes or less unless stated.
- Always return valid JSON only. No markdown, no preamble.
- For UI demo purposes, ensure one recipe has matchStatus "perfect", one has "warn" (with sodiumHigh: true), and one has "dim" (e.g. vegan: false for a vegan user).

OUTPUT FORMAT:
{
  "ingredients_found": ["eggs", "spinach", "feta cheese", "olive oil", "garlic"],
  "recipes": [
    {
      "name": "Spinach & Feta Omelette",
      "description": "A quick and healthy high-protein breakfast.",
      "calories": 340,
      "protein": 24,
      "fat": 22,
      "fiber": 1,
      "sodium": 450,
      "iron": 3,
      "calcium": 250,
      "tags": ["High Protein", "Quick"],
      "veg": true,
      "vegan": false,
      "sodiumHigh": false,
      "matchStatus": "perfect",
      "ingredients_used": ["3 eggs", "50g spinach", "30g feta", "1 tsp olive oil", "1 garlic clove"],
      "steps": [
        "Whisk eggs with salt and pepper.",
        "Sauté garlic in olive oil for 30 seconds.",
        "Add spinach, cook until wilted.",
        "Pour eggs over, cook on medium heat.",
        "Add feta, fold omelette, serve immediately."
      ]
    }
  ]
}`;

    const response = await gemini.models.generateContent({
      model: GEMINI_VISION_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { data: cleanBase64, mimeType: "image/jpeg" } }
          ]
        }
      ]
    });

    const rawText = response.text;

    if (!rawText) throw new Error("Failed to get response from AI");

    // Clean JSON string using regex to handle conversational filler
    let cleaned = rawText.trim();
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      cleaned = jsonBlockMatch[1].trim();
    } else {
      const braceMatch = cleaned.match(/\{[\s\S]*\}/);
      if (braceMatch) cleaned = braceMatch[0];
    }

    const parsed = JSON.parse(cleaned);
    
    if (parsed.error === "no_ingredients") {
      throw new Error("No identifiable ingredients found in the image.");
    }

    return {
      success: true,
      data: parsed
    };
  } catch (err) {
    console.error("AI Fridge scan error:", err);
    return { success: false, error: String(err) };
  }
}

// ==========================================
// MANUAL PAYMENT ACTIONS
// ==========================================

export async function verifyManualPaymentAction(utr: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;

    // MVP: Basic length validation for a UPI UTR (typically 12 digits)
    if (!utr || utr.trim().length < 12) {
      return { success: false, error: "Invalid Transaction ID. Please enter the full 12-digit UTR number." };
    }

    // 1. Record the manual payment as pending/verified
    // Note: We use Razorpay's table but flag it differently since it's a manual entry
    const dummyOrderId = `qr_order_${Date.now()}`;
    await db.insert(payments).values({
      userId,
      razorpayOrderId: dummyOrderId,
      razorpayPaymentId: utr,
      razorpaySignature: "manual_qr_verified",
      amount: 29900,
      status: "paid", // MVP: trust the user input
    });

    // 2. Upgrade the user to Premium
    await db.update(users)
      .set({ isPremium: true, premiumSince: new Date() })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error: any) {
    console.error("Error verifying manual payment:", error);
    return { success: false, error: error.message };
  }
}

export async function lookupBarcodeAction(barcode: string) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();

    if (data.status !== 1) {
      return { success: false, error: "Product not found in OpenFoodFacts database." };
    }

    const p = data.product;
    const name = p.product_name || "Unknown Product";
    const nutriments = p.nutriments || {};
    
    // We try to get per 100g, or serving, default to 0
    const calories = Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0);
    const protein = Math.round(nutriments['proteins_100g'] || nutriments['proteins'] || 0);
    const fat = Math.round(nutriments['fat_100g'] || nutriments['fat'] || 0);
    const carbs = Math.round(nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0);
    const fiber = Math.round(nutriments['fiber_100g'] || nutriments['fiber'] || 0);

    const analysis = {
      name,
      totalCalories: calories,
      totalProtein: protein,
      totalFat: fat,
      totalCarbs: carbs,
      totalFiber: fiber,
      items: [
        {
          name,
          calories,
          protein,
          fat,
          carbs,
          fiber,
        }
      ]
    };

    return { success: true, analysis };
  } catch (err: any) {
    console.error("Barcode lookup error:", err);
    return { success: false, error: err.message || "Failed to lookup barcode" };
  }
}

// ==========================================
// APP SHELL DATA FETCHING
// ==========================================

export async function getDashboardDataAction(userId: string, bypassSessionCheck: boolean = false) {
  try {
    if (!bypassSessionCheck) {
      const session = await getServerSession(authOptions);
      if (!session || session.user?.id !== userId) return { success: false, error: "Unauthorized" };
    }

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!currentUser) return { success: false, error: "User not found" };

    // Premium Check
    let isPremium = currentUser.isPremium || false;
    let isTrialActive = false;
    if (currentUser.createdAt) {
      const accountAgeDays = (Date.now() - new Date(currentUser.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAgeDays <= 30) {
        isPremium = true;
        isTrialActive = true;
      }
    }
    if (isPremium && !isTrialActive && currentUser.premiumSince) {
      const premiumDate = new Date(currentUser.premiumSince);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      if (premiumDate < ninetyDaysAgo) isPremium = false;
    }

    // Goals Check
    let currentGoals = await db.query.dailyGoals.findFirst({
      where: eq(dailyGoals.userId, userId),
      orderBy: (goals, { desc }) => [desc(goals.createdAt)]
    });

    if (!currentGoals) {
      // Return defaults if none exist
      currentGoals = {
        id: "fallback",
        userId: userId,
        calories: 2000,
        protein: 80,
        fat: 65,
        carbs: 250,
        fiber: 30,
        sodium: 2300,
        iron: 18,
        calcium: 1000,
        vitaminC: 90,
        potassium: 4700,
        vitaminE: 15,
        vitaminB12: 2,
        createdAt: new Date()
      };
    }

    // Date precomputations
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Parallel DB fetch
    const [rawTodayMeals, allUserMealTimestamps, recentMealsForChart] = await Promise.all([
      db.query.meals.findMany({
        where: and(
          eq(meals.userId, userId),
          gte(meals.timestamp, startOfDay),
          lte(meals.timestamp, endOfDay)
        ),
        with: { items: true },
        orderBy: (mealsTable, { desc }) => [desc(mealsTable.timestamp)]
      }),
      db.query.meals.findMany({
        where: eq(meals.userId, userId),
        columns: { timestamp: true },
        orderBy: (mealsTable, { desc }) => [desc(mealsTable.timestamp)]
      }),
      db.query.meals.findMany({
        where: and(
          eq(meals.userId, userId),
          gte(meals.timestamp, sevenDaysAgo)
        ),
        columns: { timestamp: true, totalCalories: true, totalProtein: true, totalFat: true, totalCarbs: true, totalFiber: true }
      }),
    ]);

    // Map today meals
    const mappedTodayMeals = rawTodayMeals.map((meal) => {
      const mealItemsList = (meal.items || []).map((item) => ({
        id: item.id,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs || 0,
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
        totalCarbs: meal.totalCarbs || 0,
        totalFiber: meal.totalFiber,
        totalSodium: meal.totalSodium || 0,
        totalIron: meal.totalIron || 0,
        totalCalcium: meal.totalCalcium || 0,
        totalVitaminC: meal.totalVitaminC || 0,
        totalPotassium: meal.totalPotassium || 0,
        totalVitaminE: meal.totalVitaminE || 0,
        totalVitaminB12: meal.totalVitaminB12 || 0,
        items: mealItemsList
      };
    });

    // Map Totals
    const todayTotals = mappedTodayMeals.reduce((acc, meal: any) => {
      return {
        calories: acc.calories + meal.totalCalories,
        protein: acc.protein + meal.totalProtein,
        fat: acc.fat + meal.totalFat,
        carbs: acc.carbs + (meal.totalCarbs || 0),
        fiber: acc.fiber + meal.totalFiber,
        sodium: acc.sodium + (meal.totalSodium || 0),
        potassium: acc.potassium + (meal.totalPotassium || 0),
        iron: acc.iron + (meal.totalIron || 0),
        calcium: acc.calcium + (meal.totalCalcium || 0),
        vitaminC: acc.vitaminC + (meal.totalVitaminC || 0),
        vitaminE: acc.vitaminE + (meal.totalVitaminE || 0),
        vitaminB12: acc.vitaminB12 + (meal.totalVitaminB12 || 0),
      };
    }, { 
      calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0,
      sodium: 0, potassium: 0, iron: 0, calcium: 0, vitaminC: 0, vitaminE: 0, vitaminB12: 0 
    });

    // Weekly Chart
    const weeklyDataMap = new Map();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = d.toDateString();
      weeklyDataMap.set(dateStr, { name: dayName, Calories: 0, Protein: 0, Fats: 0, Carbs: 0, Fiber: 0 });
    }

    recentMealsForChart.forEach(meal => {
      const mDate = new Date(meal.timestamp);
      mDate.setHours(0, 0, 0, 0);
      const mDateStr = mDate.toDateString();
      if (weeklyDataMap.has(mDateStr)) {
        const dayData = weeklyDataMap.get(mDateStr);
        dayData.Calories += meal.totalCalories;
        dayData.Protein += meal.totalProtein;
        dayData.Fats += meal.totalFat;
        dayData.Carbs += meal.totalCarbs || 0;
        dayData.Fiber += meal.totalFiber;
      }
    });

    const weeklyData = Array.from(weeklyDataMap.values());

    return {
      success: true,
      data: {
        isPremium,
        currentGoals: {
          calories: currentGoals.calories,
          protein: currentGoals.protein,
          fat: currentGoals.fat,
          carbs: currentGoals.carbs || 0,
          fiber: currentGoals.fiber || 0,
          sodium: currentGoals.sodium || 2300,
          potassium: currentGoals.potassium || 4700,
          iron: currentGoals.iron || 18,
          calcium: currentGoals.calcium || 1000,
          vitaminC: currentGoals.vitaminC || 90,
          vitaminE: currentGoals.vitaminE || 15,
          vitaminB12: currentGoals.vitaminB12 || 2,
        },
        todayTotals,
        todayMeals: mappedTodayMeals,
        allUserMealTimestamps: allUserMealTimestamps.map(m => m.timestamp.toISOString()),
        weeklyData
      }
    };

  } catch (err: any) {
    console.error("Dashboard fetch error:", err);
    return { success: false, error: err.message };
  }
}
