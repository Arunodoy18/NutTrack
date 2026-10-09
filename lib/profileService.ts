import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, dailyGoals } from "@/lib/db/schema";
import { computeFullProfile, mapProfileGoalToLabel, toDailyGoalValues } from "@/lib/nutritionEngine";
import type { ValidProfile } from "@/lib/profileValidation";

export const AVATARS = ["🙂", "😎", "🧒", "👧", "👦", "👩", "👨", "🧓", "🐻", "🦊", "🐼", "🦁"] as const;
export const RELATIONS = ["self", "child", "partner", "parent", "other"] as const;
export type Relation = (typeof RELATIONS)[number];

/** Saves a validated profile and regenerates that person's targets (carbs included). */
export async function saveProfileAndGoals(targetId: string, p: ValidProfile) {
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
    .where(eq(users.id, targetId));

  await db.delete(dailyGoals).where(eq(dailyGoals.userId, targetId));
  await db.insert(dailyGoals).values({ userId: targetId, ...toDailyGoalValues(profile) });
  return profile;
}
