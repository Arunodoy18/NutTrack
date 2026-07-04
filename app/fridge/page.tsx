import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import FridgeClient from "./FridgeClient";

export const dynamic = "force-dynamic";

export default async function FridgePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return <FridgeClient />;
}
