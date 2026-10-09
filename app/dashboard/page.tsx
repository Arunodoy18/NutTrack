import React from 'react';
import { redirect } from 'next/navigation';
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Dashboard from "@/components/Dashboard";
import { getActor, listProfiles } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await getActor();
  if (!actor) {
    redirect("/auth/login");
  }

  // App Shell architecture: render instantly; the client component reads its cache and syncs in the background.
  // Tiny lookups so kids get age-appropriate coaching and the family switcher has what it needs.
  const [profile, profiles] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, actor.activeId), columns: { age: true } }),
    listProfiles(actor.sessionUserId),
  ]);

  // The signed-in cookie can outlive the account (deleted elsewhere): sign out cleanly.
  if (!profile) {
    redirect("/auth/signed-out");
  }

  return (
    <Dashboard
      userId={actor.activeId}
      accountUserId={actor.sessionUserId}
      userAge={profile.age ?? undefined}
      profiles={profiles}
    />
  );
}
