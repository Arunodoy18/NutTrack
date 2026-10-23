import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import FeedbackForm from "@/components/FeedbackForm";
import { getLiveSessionUserId } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  if (!(await getLiveSessionUserId())) redirect("/auth/login");
  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-28">
      <div className="pt-16 px-6 max-w-lg mx-auto"><FeedbackForm /></div>
      <BottomNav />
    </div>
  );
}
