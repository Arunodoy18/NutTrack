import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, dailyGoals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  computeFullProfile,
  mapProfileGoalToLabel,
  toDailyGoalValues,
} from "@/lib/nutritionEngine";
import { validateProfileInput } from "@/lib/profileValidation";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = validateProfileInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const p = parsed.value;

  // Under-13 profiles must be set up by a parent or guardian.
  if (p.age < 13 && !parsed.parentConfirmed) {
    return NextResponse.json(
      { error: "A parent or guardian must confirm this profile for children under 13." },
      { status: 400 }
    );
  }

  const profile = computeFullProfile(
    p.weightKg,
    p.heightCm,
    p.age,
    p.gender,
    p.activityLevel,
    mapProfileGoalToLabel(p.primaryGoal),
    p.bodyFat
  );

  await db
    .update(users)
    .set({
      name: p.name,
      age: p.age,
      gender: p.gender,
      birthdate: p.birthdate,
      heightCm: p.heightCm,
      weightKg: p.weightKg,
      activityLevel: p.activityLevel,
      bodyFat: p.bodyFat,
      primaryGoal: p.primaryGoal,
      dietaryPreferences: p.dietaryPreferences,
      medicalConditions: p.medicalConditions,
      trainingFrequency: p.trainingFrequency,
      profileComplete: true,
    })
    .where(eq(users.id, userId));

  // Replace goals with the personalised targets (carbs included).
  await db.delete(dailyGoals).where(eq(dailyGoals.userId, userId));
  await db.insert(dailyGoals).values({ userId, ...toDailyGoalValues(profile) });

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
      isChild: profile.isChild,
    },
  });
}
