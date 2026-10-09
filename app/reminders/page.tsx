import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import ReminderSettingsClient from "@/components/ReminderSettingsClient";
import { getSessionUserId } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const me = await getSessionUserId();
  if (!me) redirect("/auth/login");
  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-28">
      <div className="pt-16 px-6 max-w-lg mx-auto">
        <ReminderSettingsClient />
      </div>
      <BottomNav />
    </div>
  );
}
