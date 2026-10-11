import React from 'react';
import { redirect } from 'next/navigation';
import Dashboard from "@/components/Dashboard";
import { getSessionUserId, loadFamilyForDashboard } from "@/lib/access";
import { dailyWaterGoalMl } from "@/lib/hydration";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) redirect("/auth/login");

  // App Shell architecture: render instantly; the client component reads its cache and syncs in the background.
  const fam = await loadFamilyForDashboard(sessionUserId);
  // The signed-in cookie can outlive the account (deleted elsewhere): sign out cleanly.
  if (!fam) redirect("/auth/signed-out");
  const { active: profile, activeId, profiles } = fam;

  return (
    <Dashboard
      userId={activeId}
      accountUserId={sessionUserId}
      userAge={profile.age ?? undefined}
      waterGoalMl={dailyWaterGoalMl(profile.age ?? 30, profile.gender ?? "Male", profile.activityLevel)}
      profiles={profiles}
    />
  );
}
