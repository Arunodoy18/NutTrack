export type MealGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export function gradeMeal(meal: {
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalFiber: number;
  totalSodium?: number;
}): { grade: MealGrade; color: string; textColor: string } {
  const { totalCalories, totalProtein, totalFat, totalFiber, totalSodium = 0 } = meal;

  if (totalCalories <= 0) {
    return { grade: 'B', color: 'bg-yellow-500', textColor: 'text-white' };
  }

  // Base score
  let score = 50;

  // Rewards
  const proteinRatio = totalProtein / totalCalories;
  score += proteinRatio * 1000;
  score += totalFiber * 2;

  // Penalties
  score -= totalFat * 0.5;
  score -= totalSodium * 0.01;

  // Grade mapping
  if (score >= 90) return { grade: 'S', color: 'bg-purple-600', textColor: 'text-white' };
  if (score >= 75) return { grade: 'A', color: 'bg-emerald-600', textColor: 'text-white' };
  if (score >= 60) return { grade: 'B', color: 'bg-yellow-500', textColor: 'text-white' };
  if (score >= 45) return { grade: 'C', color: 'bg-orange-500', textColor: 'text-white' };
  return { grade: 'D', color: 'bg-red-600', textColor: 'text-white' };
}
