import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meals, mealItems, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, meals: clientMeals } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    // Ensure user exists in database to satisfy foreign keys
    let dbUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!dbUser) {
      await db.insert(users).values({
        id: userId,
        name: "Sync User",
        email: `${userId}@sync.dietbuddy.com`,
      });
    }

    // Process each incoming meal
    if (clientMeals && Array.isArray(clientMeals)) {
      for (const meal of clientMeals) {
        // Check if meal already exists
        const existingMeal = await db.query.meals.findFirst({
          where: eq(meals.id, meal.id),
        });

        if (!existingMeal) {
          // Insert new meal
          await db.insert(meals).values({
            id: meal.id,
            userId: userId,
            timestamp: new Date(meal.timestamp),
            totalCalories: meal.analysis.totalCalories || 0,
            totalProtein: meal.analysis.totalProtein || 0,
            totalFat: meal.analysis.totalFat || 0,
            totalFiber: meal.analysis.totalFiber || 0,
            summary: meal.analysis.summary || "",
            imagePath: meal.imagePath || null,
          });

          // Insert nested meal items
          if (meal.analysis.foods && Array.isArray(meal.analysis.foods)) {
            for (const item of meal.analysis.foods) {
              await db.insert(mealItems).values({
                mealId: meal.id,
                name: item.name,
                calories: item.calories || 0,
                protein: item.protein || 0,
                fat: item.fat || 0,
                fiber: item.fiber || 0,
                isManual: item.isManual || false,
                estimatedQuantity: item.estimatedQuantity || "100g",
              });
            }
          }
        }
      }
    }

    // Fetch all meals for this user to return updated cloud history
    const allDbMeals = await db.query.meals.findMany({
      where: eq(meals.userId, userId),
      with: {
        items: true,
      },
      orderBy: (m, { desc }) => [desc(m.timestamp)],
    });

    // Map database models to SavedMeal client structure
    const mappedMeals = allDbMeals.map((meal) => {
      const foods = (meal.items || []).map((item) => ({
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        fiber: item.fiber,
        isManual: item.isManual,
        estimatedQuantity: item.estimatedQuantity || "100g",
      }));

      return {
        id: meal.id,
        timestamp: new Date(meal.timestamp).getTime(),
        imagePath: meal.imagePath,
        analysis: {
          totalCalories: meal.totalCalories,
          totalProtein: meal.totalProtein,
          totalFat: meal.totalFat,
          totalFiber: meal.totalFiber,
          summary: meal.summary || "",
          foods: foods,
        },
      };
    });

    return NextResponse.json({ success: true, meals: mappedMeals });
  } catch (err) {
    console.error("Meals sync error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    // Fetch all meals for this user
    const allDbMeals = await db.query.meals.findMany({
      where: eq(meals.userId, userId),
      with: {
        items: true,
      },
      orderBy: (m, { desc }) => [desc(m.timestamp)],
    });

    const mappedMeals = allDbMeals.map((meal) => {
      const foods = (meal.items || []).map((item) => ({
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        fiber: item.fiber,
        isManual: item.isManual,
        estimatedQuantity: item.estimatedQuantity || "100g",
      }));

      return {
        id: meal.id,
        timestamp: new Date(meal.timestamp).getTime(),
        imagePath: meal.imagePath,
        analysis: {
          totalCalories: meal.totalCalories,
          totalProtein: meal.totalProtein,
          totalFat: meal.totalFat,
          totalFiber: meal.totalFiber,
          summary: meal.summary || "",
          foods: foods,
        },
      };
    });

    return NextResponse.json({ success: true, meals: mappedMeals });
  } catch (err) {
    console.error("Meals get sync error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
