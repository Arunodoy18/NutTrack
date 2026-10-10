import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyGoals, users } from "@/lib/db/schema";
import BottomNav from "@/components/BottomNav";
import PlanClient from "@/components/PlanClient";
import { getActor } from "@/lib/access";
import { constraintsFromProfile } from "@/lib/foods";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const actor = await getActor();
  if (!actor) redirect("/auth/login");
  const me = await db.query.users.findFirst({ where: eq(users.id, actor.activeId) });
  if (!me) redirect("/auth/signed-out");
  if (!me.profileComplete) redirect("/setup");
  const [goal] = await db.select().from(dailyGoals).where(eq(dailyGoals.userId, actor.activeId)).orderBy(desc(dailyGoals.createdAt)).limit(1);
  const c = constraintsFromProfile(me.dietaryPreferences, me.medicalConditions);
  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-32">
      <PlanClient
        userId={actor.activeId} accountUserId={actor.sessionUserId} name={me.name?.trim() || "you"} age={me.age ?? 30}
        calories={goal?.calories ?? 2000} protein={goal?.protein ?? 80}
        eats={c.eats} avoid={c.avoid}
      />
      <BottomNav />
    </div>
  );
}
