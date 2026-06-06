/**
 * Nutrition data structure for mapped foods
 */
export interface NutritionData {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  fiber: number;
}

/**
 * Server-side function that interfaces with the USDA FoodData Central API.
 * Takes a food name query, finds the best match, and processes its nutritional details (per 100g).
 *
 * @param foodName Name of the food item to query.
 * @returns An object containing calories, protein, fat, and fiber, or null if not found.
 */
export async function fetchNutritionFromUSDA(foodName: string): Promise<NutritionData | null> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    console.warn("[USDA API] Warning: USDA_API_KEY environment variable is not defined.");
    return null;
  }

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(foodName)}&pageSize=1`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`USDA API responded with status ${response.status}`);
    }

    const data = await response.json();
    const food = data.foods?.[0];
    if (!food) {
      console.log(`[USDA API] No matches found for: "${foodName}"`);
      return null;
    }

    let calories = 0;
    let protein = 0;
    let fat = 0;
    let fiber = 0;

    // Parse USDA nutrient arrays mapping keys to logical macronutrient targets
    if (food.foodNutrients && Array.isArray(food.foodNutrients)) {
      for (const nutrient of food.foodNutrients) {
        const name = (nutrient.nutrientName || "").toLowerCase();
        const id = nutrient.nutrientId;
        const value = Number(nutrient.value) || 0;

        // Map energy/calories, proteins, total lipids/fats, and total dietary fibers
        if (name.includes("energy") || name.includes("calories") || id === 1008) {
          calories = value;
        } else if (name.includes("protein") || id === 1003) {
          protein = value;
        } else if (name.includes("total lipid") || name.includes("fat") || id === 1004) {
          fat = value;
        } else if (name.includes("fiber") || id === 1079) {
          fiber = value;
        }
      }
    }

    return {
      name: food.description || foodName,
      calories: Math.round(calories),
      protein: Math.round(protein),
      fat: Math.round(fat),
      fiber: Math.round(fiber)
    };
  } catch (error) {
    console.error(`[USDA API] Failed fetching nutrition for "${foodName}":`, error);
    return null;
  }
}
