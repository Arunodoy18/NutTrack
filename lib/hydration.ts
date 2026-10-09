/**
 * Daily drinking-water target, in millilitres.
 * Source: IOM/NASEM Dietary Reference Intakes — Adequate Intake for total WATER from BEVERAGES
 * (the rest comes from food): ages 1–3 0.9 L, 4–8 1.2 L, 9–13 1.8 L (M) / 1.6 L (F),
 * 14–18 2.6 L (M) / 1.8 L (F), adults 3.0 L (M) / 2.2 L (F).
 * Active people need more: +250 ml (moderate) / +500 ml (very active, from age 14).
 */
export function dailyWaterGoalMl(age: number, gender: string, activityLevel?: string | null): number {
  const male = gender === "Male";
  let base: number;
  if (age <= 3) base = 900;
  else if (age <= 8) base = 1200;
  else if (age <= 13) base = male ? 1800 : 1600;
  else if (age <= 18) base = male ? 2600 : 1800;
  else base = male ? 3000 : 2200;

  let bonus = 0;
  if (activityLevel === "Moderately active") bonus = 250;
  else if ((activityLevel === "Very active" || activityLevel === "Athlete") && age >= 14) bonus = 500;
  else if ((activityLevel === "Very active" || activityLevel === "Athlete") && age < 14) bonus = 250;

  return Math.round((base + bonus) / 50) * 50;
}

/** Sensible bounds for one drink (a sip … a large bottle). */
export const MIN_DRINK_ML = 50;
export const MAX_DRINK_ML = 2000;
/** Anything above this in a day is almost certainly a typo (and unsafe to encourage). */
export const MAX_DAILY_WATER_ML = 8000;

export const QUICK_DRINKS = [
  { label: "Sip", ml: 100, emoji: "💧" },
  { label: "Glass", ml: 250, emoji: "🥛" },
  { label: "Bottle", ml: 500, emoji: "🍶" },
] as const;
