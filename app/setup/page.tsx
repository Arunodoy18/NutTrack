import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import ProfileSetup from "@/components/ProfileSetup";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  // If profile is already complete, skip to dashboard
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!currentUser) {
    redirect("/auth/signed-out");
  }

  if (currentUser.profileComplete) {
    redirect("/dashboard");
  }

  return <ProfileSetup />;
}
