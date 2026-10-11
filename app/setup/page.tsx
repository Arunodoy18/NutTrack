import React from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import ProfileSetup from "@/components/ProfileSetup";
import { getActor } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function SetupPage(props: { searchParams: Promise<{ edit?: string }> }) {
  const searchParams = await props.searchParams;
  const actor = await getActor();
  if (!actor) {
    redirect("/auth/login");
  }

  const currentUser = await db.query.users.findFirst({ where: eq(users.id, actor.activeId) });
  if (!currentUser) {
    redirect("/auth/signed-out");
  }

  const editing = searchParams.edit === "1";
  // Finished profiles skip setup, unless the person asked to edit it.
  if (currentUser.profileComplete && !editing) {
    redirect("/dashboard");
  }

  const split = (v: string | null) => (v ? v.split(",").map((x) => x.trim()).filter(Boolean) : []);
  const initial = {
    name: currentUser.name ?? "",
    age: currentUser.age != null ? String(currentUser.age) : "",
    gender: currentUser.gender ?? "",
    birthdate: currentUser.birthdate ?? "",
    heightCm: currentUser.heightCm != null ? String(currentUser.heightCm) : "",
    weightKg: currentUser.weightKg != null ? String(currentUser.weightKg) : "",
    activityLevel: currentUser.activityLevel ?? "",
    bodyFat: currentUser.bodyFat ?? "",
    primaryGoal: currentUser.primaryGoal ?? "",
    dietaryPreferences: split(currentUser.dietaryPreferences),
    medicalConditions: split(currentUser.medicalConditions),
    trainingFrequency: currentUser.trainingFrequency ?? "",
  };

  return <ProfileSetup initial={initial} editing={editing} managed={!!currentUser.parentId} />;
}
