import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import BottomNav from "@/components/BottomNav";
import ConnectedAppsClient from "@/components/ConnectedAppsClient";
import { getActor, listProfiles } from "@/lib/access";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ConnectedPage() {
  const actor = await getActor();
  if (!actor) redirect("/auth/login");
  const me = await db.query.users.findFirst({ where: eq(users.id, actor.activeId), columns: { name: true, age: true, weightKg: true, heightCm: true } });
  const profiles = await listProfiles(actor.sessionUserId);
  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-28">
      <div className="pt-16 px-6 max-w-lg mx-auto">
        <ConnectedAppsClient name={me?.name ?? "you"} age={me?.age ?? null} weightKg={me?.weightKg ?? null} heightCm={me?.heightCm ?? null} profiles={profiles.map((p) => ({ id: p.id, name: p.name }))} />
      </div>
      <BottomNav />
    </div>
  );
}
