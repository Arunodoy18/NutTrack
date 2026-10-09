import { getActiveProfileId } from "@/lib/access";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, dailyGoals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  computeFullProfile,
  GOAL_ADJUSTMENTS,
  isChildAge,
  toDailyGoalValues,
} from "@/lib/nutritionEngine";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = await getActiveProfileId(session.user.id);

  let goal: string | undefined;
  try {
    ({ goal } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

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

  // Children and teens are on a healthy-growth plan only.
  if (isChildAge(user.age) && goal !== "Maintenance") {
    return NextResponse.json(
      { error: "Weight-change goals aren't available for under-18 profiles." },
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
  else profileGoal = isChildAge(user.age) ? "Healthy growth" : "Maintain";

  await db
    .update(users)
    .set({ primaryGoal: profileGoal })
    .where(eq(users.id, userId));

  /* ─── Replace daily goals with recalculated targets ─── */
  await db.delete(dailyGoals).where(eq(dailyGoals.userId, userId));

  await db.insert(dailyGoals).values({ userId, ...toDailyGoalValues(profile) });

  return NextResponse.json({
    success: true,
    dailyTarget: profile.macros.calories,
    macros: profile.macros,
    micros: profile.micros,
  });
}
