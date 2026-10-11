import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import UnitsClient from "@/components/UnitsClient";
import { getSessionUserId } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  if (!(await getSessionUserId())) redirect("/auth/login");
  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-28">
      <div className="pt-16 px-6 max-w-lg mx-auto"><UnitsClient /></div>
      <BottomNav />
    </div>
  );
}
