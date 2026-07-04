import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import FridgeClient from "./FridgeClient";

export const dynamic = "force-dynamic";

export default async function FridgePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  // Gate: force profile setup for incomplete profiles
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  });
  if (!currentUser?.profileComplete) {
    redirect("/setup");
  }

  return <FridgeClient />;
}
