"use server";

import { db } from "@/lib/db";
import { dailyGoals, meals, mealItems, users, groceryList } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkScanRateLimit } from "@/lib/rateLimit";
import { eq, and } from "drizzle-orm";
import OpenAI from "openai";
import { Redis } from "@upstash/redis";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy",
});

const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? Redis.fromEnv()
  : null;

const AI_MODEL = "gpt-4o";

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
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
- ALWAYS cross-reference your nutrition estimates against USDA FoodData Central values. Use scientifically verified macros per 100g, not rough guesses.
- Weights are estimates — be conservative, not generous. A "medium chicken breast" is 150g, not 250g.
- REFERENCE OBJECTS: If you detect a fork, spoon, knife, coin, or hand in the image, use it as a size reference to more accurately estimate the dimensions and weight of the food portions. A standard dinner fork is ~19cm long. A standard teaspoon is ~13cm.
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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
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
