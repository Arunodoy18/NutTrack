import { and, desc, eq, gte, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyGoals, groceryList, meals, mealItems, users, waterLogs, weightLogs } from "@/lib/db/schema";
import type { ExportBundle } from "@/lib/exportData";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : "");

/**
 * Everything the account holder owns, and nothing else: the account's own profile plus the managed
 * family profiles whose `parent_id` is that account. Sensitive columns (password, tokens, payment
 * signatures, OTP state) are never selected.
 */
export async function collectExport(opts: {
  accountId: string;
  /** "profile" limits the export to a single person (must belong to the account). */
  profileId?: string;
  rangeDays?: number | null;
  timezone: string;
  includePhotos?: boolean;
}): Promise<ExportBundle> {
  const family = await db.query.users.findMany({
    where: or(eq(users.id, opts.accountId), eq(users.parentId, opts.accountId)),
    columns: {
      id: true, name: true, email: true, relation: true, parentId: true, age: true, gender: true, birthdate: true, heightCm: true,
      weightKg: true, activityLevel: true, primaryGoal: true, dietaryPreferences: true, medicalConditions: true, createdAt: true,
    },
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });

  let people = family;
  if (opts.profileId) people = family.filter((p) => p.id === opts.profileId); // silently empty if it isn't theirs
  const ids = people.map((p) => p.id);
  const since = opts.rangeDays ? new Date(Date.now() - opts.rangeDays * 86_400_000) : null;

  const base = (ids.length ? ids : ["__none__"]) as string[];
  const [goals, mealRows, water, weight, grocery] = await Promise.all([
    db.select().from(dailyGoals).where(inArray(dailyGoals.userId, base)).orderBy(desc(dailyGoals.createdAt)),
    db.query.meals.findMany({
      where: since ? and(inArray(meals.userId, base), gte(meals.timestamp, since)) : inArray(meals.userId, base),
      with: { items: true },
      orderBy: (m, { desc: d }) => [d(m.timestamp)],
    }),
    db.select().from(waterLogs).where(since ? and(inArray(waterLogs.userId, base), gte(waterLogs.timestamp, since)) : inArray(waterLogs.userId, base)).orderBy(desc(waterLogs.timestamp)),
    db.select().from(weightLogs).where(since ? and(inArray(weightLogs.userId, base), gte(weightLogs.timestamp, since)) : inArray(weightLogs.userId, base)).orderBy(desc(weightLogs.timestamp)),
    opts.profileId ? Promise.resolve([]) : db.select().from(groceryList).where(eq(groceryList.userId, opts.accountId)),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    timezone: opts.timezone,
    scope: opts.profileId ? "profile" : "family",
    rangeDays: opts.rangeDays ?? null,
    profiles: people.map((p) => ({
      id: p.id, name: p.name, relation: p.relation, isOwner: p.id === opts.accountId,
      email: p.id === opts.accountId ? p.email : undefined,
      age: p.age, gender: p.gender, birthdate: p.birthdate, heightCm: p.heightCm, weightKg: p.weightKg,
      activityLevel: p.activityLevel, primaryGoal: p.primaryGoal, dietaryPreferences: p.dietaryPreferences,
      medicalConditions: p.medicalConditions, createdAt: iso(p.createdAt),
    })),
    goals: goals.map((g) => ({
      profileId: g.userId, createdAt: iso(g.createdAt), calories: g.calories, protein: g.protein, fat: g.fat, carbs: g.carbs,
      fiber: g.fiber, sodium: g.sodium, iron: g.iron, calcium: g.calcium, vitaminC: g.vitaminC,
    })),
    meals: mealRows.map((m) => ({
      id: m.id, profileId: m.userId, timestamp: iso(m.timestamp), session: m.mealSession, name: m.summary,
      calories: m.totalCalories, protein: m.totalProtein, fat: m.totalFat, carbs: m.totalCarbs, fiber: m.totalFiber,
      sodium: m.totalSodium, iron: m.totalIron, calcium: m.totalCalcium, vitaminC: m.totalVitaminC, potassium: m.totalPotassium,
      hasPhoto: !!m.imagePath,
      photo: opts.includePhotos ? m.imagePath : undefined,
      items: (m.items ?? []).map((i) => ({ name: i.name, quantity: i.estimatedQuantity, calories: i.calories, protein: i.protein, fat: i.fat, carbs: i.carbs, fiber: i.fiber, sodium: i.sodium })),
    })),
    water: water.map((w) => ({ id: w.id, profileId: w.userId, timestamp: iso(w.timestamp), amountMl: w.amountMl })),
    weight: weight.map((w) => ({ id: w.id, profileId: w.userId, timestamp: iso(w.timestamp), weightKg: w.weightKg })),
    groceryList: grocery.map((g) => ({ name: g.ingredientName, purchased: g.isPurchased, addedAt: iso(g.createdAt) })),
  };
}
