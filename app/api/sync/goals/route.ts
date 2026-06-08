import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyGoals, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, calories, protein, fat, fiber } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    // Ensure user exists in database
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

    // Check if there is an existing goal
    const existingGoal = await db.query.dailyGoals.findFirst({
      where: eq(dailyGoals.userId, userId),
      orderBy: [desc(dailyGoals.createdAt)],
    });

    let savedGoal;
    if (existingGoal) {
      // Update existing goal to avoid infinite creation of rows
      const [updated] = await db
        .update(dailyGoals)
        .set({
          calories: calories || 2000,
          protein: protein || 80,
          fat: fat || 65,
          fiber: fiber || 30,
          createdAt: new Date(),
        })
        .where(eq(dailyGoals.id, existingGoal.id))
        .returning();
      savedGoal = updated;
    } else {
      // Create new goal row
      const [inserted] = await db
        .insert(dailyGoals)
        .values({
          userId: userId,
          calories: calories || 2000,
          protein: protein || 80,
          fat: fat || 65,
          fiber: fiber || 30,
        })
        .returning();
      savedGoal = inserted;
    }

    return NextResponse.json({
      success: true,
      goals: {
        calories: savedGoal.calories,
        protein: savedGoal.protein,
        fat: savedGoal.fat,
        fiber: savedGoal.fiber,
      },
    });
  } catch (err) {
    console.error("Goals sync error:", err);
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

    // Fetch the latest goal
    const latestGoal = await db.query.dailyGoals.findFirst({
      where: eq(dailyGoals.userId, userId),
      orderBy: [desc(dailyGoals.createdAt)],
    });

    if (!latestGoal) {
      // Return default goals if none found
      return NextResponse.json({
        success: true,
        goals: {
          calories: 2000,
          protein: 80,
          fat: 65,
          fiber: 30,
        },
      });
    }

    return NextResponse.json({
      success: true,
      goals: {
        calories: latestGoal.calories,
        protein: latestGoal.protein,
        fat: latestGoal.fat,
        fiber: latestGoal.fiber,
      },
    });
  } catch (err) {
    console.error("Goals get sync error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
