import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import BottomNav from "@/components/BottomNav";
import RecipesClient from "@/components/RecipesClient";
import { getActor } from "@/lib/access";
import { constraintsFromProfile } from "@/lib/foods";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const actor = await getActor();
  if (!actor) redirect("/auth/login");
  const me = await db.query.users.findFirst({ where: eq(users.id, actor.activeId) });
  if (!me) redirect("/auth/signed-out");
  if (!me.profileComplete) redirect("/setup");
  const c = constraintsFromProfile(me.dietaryPreferences, me.medicalConditions);
  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-32">
      <RecipesClient userId={actor.activeId} accountUserId={actor.sessionUserId} name={me.name?.trim() || "you"} age={me.age ?? 30} eats={c.eats} avoid={c.avoid} />
      <BottomNav />
    </div>
  );
}
