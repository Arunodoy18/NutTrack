import { NextResponse } from "next/server";
import { authenticateMobile, isAuthenticated } from "@/lib/mobileAuth";
import { saveDailyGoalsAction } from "@/app/actions";
import { db } from "@/lib/db";
import { dailyGoals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { readJson } from "@/lib/sanitize";
export async function GET(req: Request) {
  try {
    const authResult = await authenticateMobile(req);
    if (!isAuthenticated(authResult)) return authResult;

    const userId = authResult.sub;
    
    let currentGoals = await db.query.dailyGoals.findFirst({
      where: eq(dailyGoals.userId, userId),
      orderBy: (goals, { desc }) => [desc(goals.createdAt)]
    });

    if (!currentGoals) {
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

    return NextResponse.json({ success: true, data: currentGoals });
  } catch (error: any) {
    console.error("Mobile Get Goals Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await authenticateMobile(req);
    if (!isAuthenticated(authResult)) return authResult;

    const userId = authResult.sub;
    const body = await readJson(req);

    const result = await saveDailyGoalsAction(userId, body, true);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mobile Save Goals Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
