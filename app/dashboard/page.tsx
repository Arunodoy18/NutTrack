import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { meals, mealItems, dailyGoals, users } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import Dashboard, { MealLogData, FoodItemData } from "@/components/Dashboard";
import { calculateActiveStreak } from "@/lib/streak";
import { computeFullProfile, mapProfileGoalToLabel } from "@/lib/nutritionEngine";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/auth/login");
  }

  // App Shell architecture: render instantly using JWT userId.
  // The client component will handle reading from cache and background syncing.
  // Tiny single-column lookup so kids get age-appropriate coaching copy.
  const profile = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { age: true },
  });

  // The signed-in cookie can outlive the account (deleted elsewhere): sign out cleanly.
  if (!profile) {
    redirect("/auth/signed-out");
  }

  return <Dashboard userId={userId} userAge={profile.age ?? undefined} />;
}
