import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, meals, dailyGoals, weightLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import BottomNav from '@/components/BottomNav';
import { ChevronRight, Zap, Edit2 } from 'lucide-react';
import { calculateActiveStreak } from "@/lib/streak";
import Link from 'next/link';
import ComingSoon from '@/components/ComingSoon';
import LogoutButton from '@/components/LogoutButton';
import DeleteAccountButton from '@/components/DeleteAccountButton';
import ProfileHeaderClient from '@/components/ProfileHeaderClient';
import { computeFullProfile, mapProfileGoalToLabel } from "@/lib/nutritionEngine";
import { getActiveProfileId, listProfiles } from "@/lib/access";
import { getUserTz } from "@/lib/tzServer";
import FamilySection from "@/components/FamilySection";
import WeightTracker from "@/components/WeightTracker";
import ExportSection from "@/components/ExportSection";
import PremiumInterest from "@/components/PremiumInterest";
import { peekScans } from "@/lib/scanQuota";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  
  const accountId = session.user.id;
  const userId = await getActiveProfileId(accountId); // who is being tracked
  const scanQuota = await peekScans(accountId, await getUserTz()); // the allowance belongs to the account
  const profiles = await listProfiles(accountId);
  
  // Fetch user data
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  const weightHistory = await db.query.weightLogs.findMany({
    where: eq(weightLogs.userId, userId),
    orderBy: (t, { desc }) => [desc(t.timestamp)],
    limit: 180,
  });

  // Gate: force profile setup for incomplete profiles
  if (!currentUser?.profileComplete) {
    redirect("/setup");
  }
  // Plan and free trial belong to the ACCOUNT, shared by the whole family.
  const accountRow = currentUser?.parentId
    ? await db.query.users.findFirst({ where: eq(users.id, currentUser.parentId) })
    : currentUser;
  let isPremium = accountRow?.isPremium || false;
  let isTrialActive = false;
  let trialDaysLeft = 0;
  
  if (accountRow?.createdAt) {
    const ageDays = (Date.now() - new Date(accountRow.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 30) {
      isPremium = true;
      isTrialActive = true;
      trialDaysLeft = Math.ceil(30 - ageDays);
    }
  }

  // Fetch all meals to calculate streak and total count
  const allUserMealTimestamps = await db.query.meals.findMany({
    where: eq(meals.userId, userId),
    columns: { timestamp: true },
    orderBy: (mealsTable, { desc }) => [desc(mealsTable.timestamp)]
  });
  
  const activeStreak = calculateActiveStreak(allUserMealTimestamps.map(m => m.timestamp), await getUserTz());
  const totalMeals = allUserMealTimestamps.length;
  
  // Calculate "On Goal" percentage (mock metric based on recent streak)
  // For a real metric, we'd compare daily totals to goals over time
  const onGoalPercentage = totalMeals > 0 ? Math.min(100, Math.max(10, activeStreak * 5 + 40)) : 0;

  // Fetch daily goals
  let currentGoals = await db.query.dailyGoals.findFirst({
    where: eq(dailyGoals.userId, userId),
    orderBy: (goals, { desc }) => [desc(goals.createdAt)]
  });

  if (!currentGoals) {
    currentGoals = {
      calories: 2000,
      protein: 80,
      fat: 65,
      fiber: 30,
    } as any;
  }

  const name = currentUser?.name || session.user.name || "User";
  // Family members have no login of their own — show who manages them instead.
  const email = currentUser?.parentId ? `Managed by ${accountRow?.name?.trim() || "you"}` : currentUser?.email || session.user.email || "No email";
  const initial = name.charAt(0).toUpperCase();

  // Compute analytics profile
  const goalLabel = mapProfileGoalToLabel(currentUser?.primaryGoal || "Maintain");
  const fullProfile = computeFullProfile(
    currentUser?.weightKg ?? 70,
    currentUser?.heightCm ?? 170,
    currentUser?.age ?? 25,
    (currentUser?.gender as string) ?? "Male",
    (currentUser?.activityLevel as string) ?? "Moderately active",
    goalLabel,
    currentUser?.bodyFat || null
  );

  const analyticsProfile = {
    bmi: fullProfile.bmi,
    bmr: fullProfile.bmr,
    tdee: fullProfile.tdee,
    ffm: fullProfile.ffm,
  };

  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-28">
      <div className="pt-16 px-6 max-w-lg mx-auto">
        
        {/* Header / User Info Client Component */}
        <ProfileHeaderClient 
          name={name}
          email={email}
          initial={initial}
          image={session.user.image}
          analyticsProfile={analyticsProfile}
        />

        {/* 3 Stats Cards */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 bg-white rounded-[24px] py-4 px-2 text-center shadow-sm border border-surface-line">
            <div className="text-2xl font-black text-brand mb-1">{activeStreak}</div>
            <div className="text-[8px] font-bold tracking-widest text-ink-soft uppercase">Day Streak</div>
          </div>
          <div className="flex-1 bg-white rounded-[24px] py-4 px-2 text-center shadow-sm border border-surface-line">
            <div className="text-2xl font-black text-ink mb-1">{totalMeals}</div>
            <div className="text-[8px] font-bold tracking-widest text-ink-soft uppercase">Meals</div>
          </div>
          <div className="flex-1 bg-white rounded-[24px] py-4 px-2 text-center shadow-sm border border-surface-line">
            <div className="text-2xl font-black text-emerald-500 mb-1">{onGoalPercentage}%</div>
            <div className="text-[8px] font-bold tracking-widest text-ink-soft uppercase">On Goal</div>
          </div>
        </div>

        {/* Daily Goals Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-surface-line mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-ink">Daily goals</h2>
            <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 text-brand rounded-full text-xs font-bold hover:bg-brand/20 transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-brand"></div>
                <span className="text-sm font-medium text-ink-soft">Calories</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-ink text-base">{currentGoals!.calories}</span>
                <span className="text-xs font-bold text-ink-faint">kcal</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-sm font-medium text-ink-soft">Protein</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-ink text-base">{currentGoals!.protein}</span>
                <span className="text-xs font-bold text-ink-faint">g</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <span className="text-sm font-medium text-ink-soft">Fat</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-ink text-base">{currentGoals!.fat}</span>
                <span className="text-xs font-bold text-ink-faint">g</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-ink-soft">Fiber</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-ink text-base">{currentGoals!.fiber}</span>
                <span className="text-xs font-bold text-ink-faint">g</span>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Upgrade Card */}
        <div className="bg-gradient-to-br from-[#fc5c16] to-[#e63e00] rounded-[32px] p-6 text-white shadow-xl shadow-brand/20 mb-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <Zap className="w-4 h-4" fill="currentColor" />
            <span className="text-[10px] font-black tracking-widest uppercase">Nura Free</span>
          </div>
          <h2 className="text-2xl font-black mb-2 relative z-10">{scanQuota.remaining} of {scanQuota.limit} AI scans left today</h2>
          <p className="text-sm text-white/90 font-medium relative z-10">
            Every feature is yours to use. Photo, typing/voice and fridge scans are limited each day; search, barcode, recipes, plans, water and weight are unlimited.
          </p>
          <div className="mt-4 relative z-10"><PremiumInterest /></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Settings List */}
        <div className="bg-white rounded-[32px] shadow-sm border border-surface-line overflow-hidden mb-2">
          <Link href="/reminders" className="flex justify-between items-center p-5 hover:bg-surface-muted transition-colors border-b border-surface-line">
            <span className="text-sm font-medium text-ink">Reminders &amp; notifications</span>
            <ChevronRight className="w-5 h-5 text-ink-soft" />
          </Link>
          <Link href="/connected" className="flex justify-between items-center p-5 hover:bg-surface-muted transition-colors border-b border-surface-line">
            <span className="text-sm font-medium text-ink">Activity &amp; connected apps</span>
            <ChevronRight className="w-5 h-5 text-ink-soft" />
          </Link>
          <Link href="/units" className="flex justify-between items-center p-5 hover:bg-surface-muted transition-colors border-b border-surface-line">
            <span className="text-sm font-medium text-ink">Units &amp; measurements</span>
            <ChevronRight className="w-5 h-5 text-ink-soft" />
          </Link>
          <Link href="/feedback" className="flex justify-between items-center p-5 hover:bg-surface-muted transition-colors">
            <span className="text-sm font-medium text-ink">Send feedback</span>
            <ChevronRight className="w-5 h-5 text-ink-soft" />
          </Link>
        </div>

        <WeightTracker
          userId={userId}
          accountUserId={accountId}
          logs={weightHistory.map((w) => ({ id: w.id, weightKg: w.weightKg, timestamp: w.timestamp.toISOString() }))}
          profileWeightKg={currentUser?.weightKg ?? null}
          isChild={(currentUser?.age ?? 30) < 18}
          goal={currentUser?.primaryGoal ?? null}
          name={name}
        />

        <FamilySection profiles={profiles} activeId={userId} />

        <ExportSection profiles={profiles} activeId={userId} />

        {/* Logout Button */}
        <LogoutButton />

        {/* Delete Account */}
        <DeleteAccountButton userId={accountId} />

      </div>

      <BottomNav />
    </div>
  );
}
