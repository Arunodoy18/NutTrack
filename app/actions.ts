"use server";

import { db } from "@/lib/db";
import { dailyGoals, meals, mealItems, users } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkScanRateLimit } from "@/lib/rateLimit";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

async function checkAiAccess() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");
  
  const userId = session.user.id;
  
  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });
  
  const { allowed } = await checkScanRateLimit(userId, userRecord?.isPremium ?? false);
  
  if (!allowed) {
    if (userRecord?.isPremium) {
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
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === "YOUR_OPENAI_API_KEY") {
      return { success: true, insight: getFallbackInsight(todayTotals, dailyGoals) };
    }

    const { calories, protein, fat, fiber } = todayTotals;
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }]
    });
    
    const text = completion.choices[0].message.content;
    if (text) {
      return { success: true, insight: text.trim() };
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
    await checkAiAccess();

    if (base64Image) {
      const sizeInMB = (base64Image.length * 3) / 4 / 1024 / 1024;
      if (sizeInMB > 10) throw new Error("Image exceeds 10MB limit");
      
      if (!base64Image.startsWith("data:image/")) {
        throw new Error("Invalid file type. Only images are allowed.");
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;


    if (!apiKey || apiKey === "YOUR_OPENAI_API_KEY") {
      throw new Error("OPENAI_API_KEY is not configured on the server. Please check your .env configuration.");
    }

    const prompt = `You are a precision nutrition AI embedded in dietBuddy, a calorie tracking app.

The user has uploaded a photo of their meal. Your job is to identify every distinct food item visible on the plate, estimate its portion weight in grams, and return structured nutritional data.

RULES:
- Only identify food items you can see with reasonable confidence. Do not guess invisible items.
- If the image is not a food photo (blurry, non-food subject, error), return { "error": "not_food", "message": "No meal detected in this image." }
- Never hallucinate nutrition values. Use your trained knowledge of USDA nutritional data.
- Weights are estimates — be conservative, not generous. A "medium chicken breast" is 150g, not 250g.
- Always return valid JSON only. No markdown, no explanation, no preamble.

OUTPUT FORMAT (strict JSON):
{
  "meal_name": "Short descriptive name of the whole meal",
  "confidence": 0.87,
  "items": [
    {
      "name": "Grilled Chicken Breast",
      "weight_g": 150,
      "calories": 248,
      "protein_g": 46.5,
      "fat_g": 5.4,
      "carbs_g": 0,
      "fiber_g": 0
    }
  ],
  "totals": {
    "calories": 248,
    "protein_g": 46.5,
    "fat_g": 5.4,
    "carbs_g": 0,
    "fiber_g": 0
  },
  "notes": "Optional notes"
}`;

    const imageUri = base64Image.startsWith("data:image") ? base64Image : `data:image/jpeg;base64,${base64Image}`;

        const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUri } }
          ]
        }
      ]
    });

    const data = { choices: completion.choices };
    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new Error("Failed to get response from OpenAI API");
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
      fiber: Math.round(food.fiber_g || 0),
      estimatedQuantity: `${food.weight_g || 100}g`,
      isManual: false
    }));

    const totals = parsed.totals || { calories: 0, protein_g: 0, fat_g: 0, fiber_g: 0 };

    return {
      success: true,
      analysis: {
        name: parsed.meal_name || "AI Dissected Meal",
        totalCalories: Math.round(totals.calories || items.reduce((acc: number, i: any) => acc + i.calories, 0)),
        totalProtein: Math.round(totals.protein_g || items.reduce((acc: number, i: any) => acc + i.protein, 0)),
        totalFat: Math.round(totals.fat_g || items.reduce((acc: number, i: any) => acc + i.fat, 0)),
        totalFiber: Math.round(totals.fiber_g || items.reduce((acc: number, i: any) => acc + i.fiber, 0)),
        summary: parsed.notes || `AI Scanner identified ${items.length} food items.`,
        items
      }
    };
  } catch (err) {
    console.error("AI scan action error:", err);
    return { success: false, error: String(err) };
  }
}

export async function analyzeMealTextAction(text: string) {
  try {
    await checkAiAccess();

    const apiKey = process.env.OPENAI_API_KEY;


    if (!apiKey || apiKey === "YOUR_OPENAI_API_KEY") throw new Error("OPENAI_API_KEY is missing");

    const prompt = `You are a precise food logging parser for dietBuddy.

The user has described a meal in natural language. Extract every food item mentioned, infer portion sizes from context clues, and return structured nutrition data.

RULES:
- "A bowl of rice" = 200g cooked rice. "A plate of pasta" = 250g cooked pasta. Use standard USDA serving conventions.
- If a quantity is ambiguous, use the most conservative common serving size and flag it.
- Handle compound foods: "butter chicken with naan" = log both items separately.
- If input contains no recognizable food, return { "error": "no_food_detected" }
- Return valid JSON only.

Text: "${text}"

INPUT EXAMPLE: "I had two scrambled eggs and a slice of whole wheat toast with butter"

OUTPUT FORMAT:
{
  "meal_name": "Scrambled eggs with toast",
  "items": [
    { "name": "Scrambled eggs", "quantity": "2 large eggs", "weight_g": 100, "calories": 182, "protein_g": 12, "fat_g": 14, "carbs_g": 1.4, "fiber_g": 0 },
    { "name": "Whole wheat toast", "quantity": "1 slice", "weight_g": 28, "calories": 69, "protein_g": 3.6, "fat_g": 1, "carbs_g": 12, "fiber_g": 1.9 },
    { "name": "Butter", "quantity": "1 tsp", "weight_g": 5, "calories": 36, "protein_g": 0, "fat_g": 4, "carbs_g": 0, "fiber_g": 0 }
  ],
  "totals": { "calories": 287, "protein_g": 15.6, "fat_g": 19, "carbs_g": 13.4, "fiber_g": 1.9 },
  "assumptions": ["Used 2 large eggs as stated", "1 tsp butter assumed for toast"]
}`;

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }]
    });

    let rawText = completion.choices[0].message.content || "";
    
    // Clean JSON string
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
    else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    
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
      fiber: Math.round(food.fiber_g || 0),
      estimatedQuantity: food.quantity ? `${food.quantity} (${food.weight_g || 100}g)` : `${food.weight_g || 100}g`,
      isManual: false
    }));

    const totals = parsed.totals || { calories: 0, protein_g: 0, fat_g: 0, fiber_g: 0 };

    return {
      success: true,
      analysis: {
        name: parsed.meal_name || "Voice Logged Meal",
        totalCalories: Math.round(totals.calories || items.reduce((acc: number, i: any) => acc + i.calories, 0)),
        totalProtein: Math.round(totals.protein_g || items.reduce((acc: number, i: any) => acc + i.protein, 0)),
        totalFat: Math.round(totals.fat_g || items.reduce((acc: number, i: any) => acc + i.fat, 0)),
        totalFiber: Math.round(totals.fiber_g || items.reduce((acc: number, i: any) => acc + i.fiber, 0)),
        summary: parsed.assumptions?.length ? parsed.assumptions.join(" ") : `AI parsed voice input and identified ${items.length} food items.`,
        items
      }
    };
  } catch (err) {
    console.error("AI text scan error:", err);
    return { success: false, error: String(err) };
  }
}

export async function analyzeFridgeImageAction(base64Image: string) {
  try {
    await checkAiAccess();

    if (base64Image) {
      const sizeInMB = (base64Image.length * 3) / 4 / 1024 / 1024;
      if (sizeInMB > 10) throw new Error("Image exceeds 10MB limit");
      
      if (!base64Image.startsWith("data:image/")) {
        throw new Error("Invalid file type. Only images are allowed.");
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;


    if (!apiKey || apiKey === "YOUR_OPENAI_API_KEY") {
      throw new Error("OPENAI_API_KEY is missing. Please configure your .env file.");
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

OUTPUT FORMAT:
{
  "ingredients_found": ["eggs", "spinach", "feta cheese", "olive oil", "garlic"],
  "recipes": [
    {
      "name": "Spinach & Feta Omelette",
      "prep_time_min": 10,
      "servings": 1,
      "difficulty": "easy",
      "macros_per_serving": {
        "calories": 340,
        "protein_g": 24,
        "fat_g": 22,
        "carbs_g": 4,
        "fiber_g": 1
      },
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

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanBase64}` } }
          ]
        }
      ]
    });

    const rawText = completion.choices[0].message.content;
    
    if (!rawText) throw new Error("Failed to get response from AI");

    let cleaned = rawText.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
    else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
    cleaned = cleaned.trim();

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
