import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, dailyGoals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/* ─── TDEE multipliers ─── */
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  Sedentary: 1.2,
  "Lightly active": 1.375,
  "Moderately active": 1.55,
  "Very active": 1.725,
  Athlete: 1.9,
};

/* ─── goal adjustment factors ─── */
const GOAL_CALORIE_ADJUST: Record<string, number> = {
  "Lose weight": -500,
  Maintain: 0,
  "Build muscle": 300,
  "Improve health": 0,
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const {
    name,
    age,
    gender,
    birthdate,
    heightCm,
    weightKg,
    activityLevel,
    bodyFat,
    primaryGoal,
    dietaryPreferences,
    medicalConditions,
    trainingFrequency,
  } = body;

  /* ─── basic validation ─── */
  if (!name || !age || !gender || !heightCm || !weightKg || !activityLevel || !primaryGoal) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ageNum = parseInt(age, 10);
  const height = parseInt(heightCm, 10);
  const weight = parseInt(weightKg, 10);

  /* ─── BMR (Mifflin-St Jeor) ─── */
  let bmr: number;
  if (gender === "Male") {
    bmr = 10 * weight + 6.25 * height - 5 * ageNum + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * ageNum - 161;
  }

  /* ─── TDEE ─── */
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55;
  const tdee = Math.round(bmr * multiplier);

  /* ─── Goal-adjusted calories ─── */
  const goalAdjust = GOAL_CALORIE_ADJUST[primaryGoal] ?? 0;
  const targetCalories = Math.round(Math.max(1200, tdee + goalAdjust));

  /* ─── Macro split ─── */
  let proteinG: number;
  let fatG: number;

  if (primaryGoal === "Build muscle") {
    proteinG = Math.round(weight * 2.0);
    fatG = Math.round((targetCalories * 0.25) / 9);
  } else if (primaryGoal === "Lose weight") {
    proteinG = Math.round(weight * 1.8);
    fatG = Math.round((targetCalories * 0.25) / 9);
  } else {
    proteinG = Math.round(weight * 1.4);
    fatG = Math.round((targetCalories * 0.30) / 9);
  }

  const fiberG = gender === "Male" ? 38 : 25;

  /* ─── Save user profile ─── */
  await db
    .update(users)
    .set({
      name,
      age: ageNum,
      gender,
      birthdate: birthdate || null,
      heightCm: height,
      weightKg: weight,
      activityLevel,
      bodyFat: bodyFat || null,
      primaryGoal,
      dietaryPreferences: Array.isArray(dietaryPreferences) ? dietaryPreferences.join(",") : (dietaryPreferences || null),
      medicalConditions: Array.isArray(medicalConditions) ? medicalConditions.join(",") : (medicalConditions || null),
      trainingFrequency: trainingFrequency || null,
      profileComplete: true,
    })
    .where(eq(users.id, userId));

  /* ─── Create personalised daily goals ─── */
  // Delete any existing default goals first
  await db.delete(dailyGoals).where(eq(dailyGoals.userId, userId));

  await db.insert(dailyGoals).values({
    userId,
    calories: targetCalories,
    protein: proteinG,
    fat: fatG,
    fiber: fiberG,
    sodium: 2300,
    iron: 18,
    calcium: 1000,
    vitaminC: 90,
  });

  return NextResponse.json({
    success: true,
    goals: {
      calories: targetCalories,
      protein: proteinG,
      fat: fatG,
      fiber: fiberG,
    },
  });
}
