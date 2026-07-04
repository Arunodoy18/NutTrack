import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, dailyGoals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  computeFullProfile,
  mapProfileGoalToLabel,
} from "@/lib/nutritionEngine";

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

  /* ─── compute full nutrition profile using centralized engine ─── */
  const goalLabel = mapProfileGoalToLabel(primaryGoal);
  const profile = computeFullProfile(
    weight,
    height,
    ageNum,
    gender,
    activityLevel,
    goalLabel,
    bodyFat || null
  );

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
      dietaryPreferences: Array.isArray(dietaryPreferences)
        ? dietaryPreferences.join(",")
        : (dietaryPreferences || null),
      medicalConditions: Array.isArray(medicalConditions)
        ? medicalConditions.join(",")
        : (medicalConditions || null),
      trainingFrequency: trainingFrequency || null,
      profileComplete: true,
    })
    .where(eq(users.id, userId));

  /* ─── Create personalised daily goals ─── */
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
    profile: {
      bmi: profile.bmi,
      bmr: profile.bmr,
      tdee: profile.tdee,
      bodyFatPercent: profile.bodyFatPercent,
      ffm: profile.ffm,
      macros: profile.macros,
      micros: profile.micros,
    },
  });
}
