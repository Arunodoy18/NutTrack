import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, dailyGoals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  computeFullProfile,
  mapProfileGoalToLabel,
  GOAL_ADJUSTMENTS,
} from "@/lib/nutritionEngine";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { goal } = await req.json();

  if (!goal || !GOAL_ADJUSTMENTS.hasOwnProperty(goal)) {
    return NextResponse.json(
      { error: "Invalid goal. Use: Fat loss, Maintenance, Muscle gain, Surplus" },
      { status: 400 }
    );
  }

  /* ─── Fetch user's stored metrics ─── */
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !user.weightKg || !user.heightCm || !user.age || !user.gender || !user.activityLevel) {
    return NextResponse.json(
      { error: "Profile incomplete. Complete setup first." },
      { status: 400 }
    );
  }

  /* ─── Recalculate everything with the new goal ─── */
  const profile = computeFullProfile(
    user.weightKg,
    user.heightCm,
    user.age,
    user.gender,
    user.activityLevel,
    goal,
    user.bodyFat || null
  );

  /* ─── Update user's primary goal ─── */
  // Map goal label back to profile goal format
  let profileGoal: string;
  if (goal === "Fat loss") profileGoal = "Lose weight";
  else if (goal === "Muscle gain") profileGoal = "Build muscle";
  else if (goal === "Surplus") profileGoal = "Build muscle";
  else profileGoal = "Maintain";

  await db
    .update(users)
    .set({ primaryGoal: profileGoal })
    .where(eq(users.id, userId));

  /* ─── Replace daily goals with recalculated targets ─── */
  await db.delete(dailyGoals).where(eq(dailyGoals.userId, userId));

  await db.insert(dailyGoals).values({
    userId,
    calories: profile.macros.calories,
    protein: profile.macros.proteinG,
    fat: profile.macros.fatG,
    fiber: profile.macros.fiberG,
    sodium: profile.micros.sodium,
    iron: profile.micros.iron,
    calcium: profile.micros.calcium,
    vitaminC: profile.micros.vitaminC,
  });

  return NextResponse.json({
    success: true,
    dailyTarget: profile.macros.calories,
    macros: profile.macros,
    micros: profile.micros,
  });
}
