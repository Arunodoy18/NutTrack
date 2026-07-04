/**
 * nutritionEngine.ts — Centralized clinical-grade nutrition calculation module.
 *
 * Every formula is cited to its published source. No magic numbers.
 * This file is the SINGLE SOURCE OF TRUTH for all nutrition math in the app.
 */

/* ═══════════════════════════════════════════════════════════════════════════
 * CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Harris-Benedict / Mifflin-St Jeor activity multipliers (dimensionless). */
export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  Sedentary: 1.2,          // Little or no exercise
  "Lightly active": 1.375, // Light exercise 1–3 days/week
  "Moderately active": 1.55, // Moderate exercise 3–5 days/week
  "Very active": 1.725,    // Hard exercise 6–7 days/week
  Athlete: 1.9,            // Very hard exercise, physical job, 2× training
};

/** Goal-specific calorie adjustments (kcal/day). */
export const GOAL_ADJUSTMENTS: Record<string, number> = {
  "Fat loss": -500,
  Maintenance: 0,
  "Muscle gain": 300,
  Surplus: 500,
};

/** Map user-facing primary goals from profile setup to goal labels. */
export function mapProfileGoalToLabel(goal: string): string {
  if (goal === "Lose weight") return "Fat loss";
  if (goal === "Build muscle") return "Muscle gain";
  if (goal === "Improve health") return "Maintenance";
  if (goal === "Maintain") return "Maintenance";
  return "Maintenance";
}

/* ═══════════════════════════════════════════════════════════════════════════
 * BMI — WHO Standard
 * Source: WHO Technical Report Series 894 (2000)
 * Formula: weight(kg) / height(m)²
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface BMIResult {
  value: number;
  label: "Underweight" | "Normal" | "Overweight" | "Obese";
}

export function calculateBMI(weightKg: number, heightCm: number): BMIResult {
  const heightM = heightCm / 100;
  const value = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  let label: BMIResult["label"];
  if (value < 18.5) label = "Underweight";
  else if (value < 25) label = "Normal";
  else if (value < 30) label = "Overweight";
  else label = "Obese";
  return { value, label };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * BMR — Mifflin-St Jeor Equation
 * Source: Mifflin MD et al., Am J Clin Nutr 1990;51:241-7
 * Male:   10 × weight(kg) + 6.25 × height(cm) – 5 × age(y) + 5
 * Female: 10 × weight(kg) + 6.25 × height(cm) – 5 × age(y) – 161
 * ═══════════════════════════════════════════════════════════════════════════ */

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: string
): number {
  if (gender === "Male") {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * TDEE — Total Daily Energy Expenditure
 * Formula: BMR × Activity Factor
 * ═══════════════════════════════════════════════════════════════════════════ */

export function calculateTDEE(bmr: number, activityLevel: string): number {
  const factor = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55;
  return Math.round(bmr * factor);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Body Fat % — Deurenberg Equation
 * Source: Deurenberg P et al., Br J Nutr 1991;65:105-14
 * Formula: 1.20 × BMI + 0.23 × Age – 10.8 × Sex – 5.4
 *   where Sex = 1 for Male, 0 for Female
 *
 * Note: This is an estimate. Accuracy ± 4% for adults 18–70.
 * ═══════════════════════════════════════════════════════════════════════════ */

export function estimateBodyFatPercent(
  bmi: number,
  age: number,
  gender: string
): number {
  const sexFactor = gender === "Male" ? 1 : 0;
  const bf = 1.2 * bmi + 0.23 * age - 10.8 * sexFactor - 5.4;
  return Math.round(Math.max(3, Math.min(60, bf)) * 10) / 10;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Fat-Free Mass (FFM)
 * Formula: Weight(kg) × (1 – BodyFat% / 100)
 * Source: Standard clinical body composition formula
 *
 * If user provided a body fat category from setup, we map it to a midpoint %.
 * Otherwise we use the Deurenberg estimate.
 * ═══════════════════════════════════════════════════════════════════════════ */

const BODY_FAT_CATEGORY_MAP: Record<string, number> = {
  "Low (<15%)": 12,
  "Average (15–24%)": 19.5,
  "High (25–31%)": 28,
  "Very high (32%+)": 36,
};

export function resolveBodyFatPercent(
  userBodyFatCategory: string | null | undefined,
  bmi: number,
  age: number,
  gender: string
): number {
  if (userBodyFatCategory && BODY_FAT_CATEGORY_MAP[userBodyFatCategory] !== undefined) {
    return BODY_FAT_CATEGORY_MAP[userBodyFatCategory];
  }
  return estimateBodyFatPercent(bmi, age, gender);
}

export function calculateFFM(weightKg: number, bodyFatPercent: number): number {
  return Math.round(weightKg * (1 - bodyFatPercent / 100) * 10) / 10;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Macronutrient Targets
 * Sources:
 *   Protein: ISSN Position Stand — 1.4–2.2 g/kg depending on goal
 *   Fat: AHA guidelines — 25–30% of total calories ÷ 9 cal/g
 *   Carbs: Balance method — remaining calories ÷ 4 cal/g
 *   Fiber: IOM / FDA DV — Male 38g, Female 25g
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface MacroTargets {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
}

export function calculateMacroTargets(
  tdee: number,
  goal: string,
  weightKg: number,
  gender: string
): MacroTargets {
  const adjustment = GOAL_ADJUSTMENTS[goal] ?? 0;
  const calories = Math.round(Math.max(1200, tdee + adjustment));

  // Protein: g/kg based on goal
  let proteinPerKg: number;
  if (goal === "Muscle gain" || goal === "Surplus") {
    proteinPerKg = 2.0; // ISSN: 1.6–2.2 for hypertrophy
  } else if (goal === "Fat loss") {
    proteinPerKg = 1.8; // Higher protein preserves lean mass in deficit
  } else {
    proteinPerKg = 1.4; // Maintenance / general health
  }
  const proteinG = Math.round(weightKg * proteinPerKg);

  // Fat: 25% of calories for deficit/muscle, 30% for maintenance
  const fatPct = (goal === "Fat loss" || goal === "Muscle gain") ? 0.25 : 0.30;
  const fatG = Math.round((calories * fatPct) / 9);

  // Carbs: remaining calories ÷ 4
  const proteinCals = proteinG * 4;
  const fatCals = fatG * 9;
  const carbCals = Math.max(0, calories - proteinCals - fatCals);
  const carbsG = Math.round(carbCals / 4);

  // Fiber: IOM recommendation
  const fiberG = gender === "Male" ? 38 : 25;

  return { calories, proteinG, fatG, carbsG, fiberG };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Micronutrient RDIs — Age/Sex-Specific
 * Source: NIH Office of Dietary Supplements / FDA Daily Values (2020)
 *
 * Simplified to key tracked nutrients. Values in standard units.
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface MicroTargets {
  sodium: number;    // mg
  iron: number;      // mg
  calcium: number;   // mg
  vitaminC: number;  // mg
}

export function calculateMicroTargets(age: number, gender: string): MicroTargets {
  // Sodium: AHA recommends <2300mg for all adults
  const sodium = 2300;

  // Iron: Male 8mg, Female (pre-menopause <51) 18mg, Female (51+) 8mg
  let iron: number;
  if (gender === "Male") {
    iron = 8;
  } else {
    iron = age < 51 ? 18 : 8;
  }

  // Calcium: 19–50 = 1000mg, 51–70 Male = 1000mg, 51–70 Female = 1200mg, 71+ = 1200mg
  let calcium: number;
  if (age <= 50) {
    calcium = 1000;
  } else if (age <= 70) {
    calcium = gender === "Male" ? 1000 : 1200;
  } else {
    calcium = 1200;
  }

  // Vitamin C: Male 90mg, Female 75mg
  const vitaminC = gender === "Male" ? 90 : 75;

  return { sodium, iron, calcium, vitaminC };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * FULL PIPELINE — One-call to compute everything from raw user metrics
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface FullNutritionProfile {
  bmi: BMIResult;
  bmr: number;
  tdee: number;
  bodyFatPercent: number;
  ffm: number;
  leanMuscleMass: number;
  macros: MacroTargets;
  micros: MicroTargets;
  metabolicHealth: "Optimal" | "At Risk" | "High Risk";
}

export function computeFullProfile(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: string,
  activityLevel: string,
  goal: string,
  userBodyFatCategory?: string | null
): FullNutritionProfile {
  const bmi = calculateBMI(weightKg, heightCm);
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  const bodyFatPercent = resolveBodyFatPercent(userBodyFatCategory, bmi.value, age, gender);
  const ffm = calculateFFM(weightKg, bodyFatPercent);
  const leanMuscleMass = Math.round(ffm * 0.5 * 10) / 10; // ~50% of FFM is skeletal muscle
  const macros = calculateMacroTargets(tdee, goal, weightKg, gender);
  const micros = calculateMicroTargets(age, gender);

  let metabolicHealth: FullNutritionProfile["metabolicHealth"];
  if (bmi.label === "Normal") metabolicHealth = "Optimal";
  else if (bmi.label === "Overweight") metabolicHealth = "At Risk";
  else metabolicHealth = "High Risk";

  return { bmi, bmr, tdee, bodyFatPercent, ffm, leanMuscleMass, macros, micros, metabolicHealth };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * BUDDY COACH — Dynamic Heuristics Engine
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export function generateBuddyCoachTip(
  todayTotals: DailyTotals,
  dailyGoals: DailyGoals,
  currentTime: Date = new Date()
): string {
  const hour = currentTime.getHours();
  
  // Calculate remaining amounts (can be negative if over)
  const remCals = dailyGoals.calories - todayTotals.calories;
  const remProtein = dailyGoals.protein - todayTotals.protein;
  const remFiber = dailyGoals.fiber - todayTotals.fiber;

  // Meal context based on time of day
  let nextMeal = "your next meal";
  if (hour >= 5 && hour < 11) nextMeal = "breakfast";
  else if (hour >= 11 && hour < 15) nextMeal = "lunch";
  else if (hour >= 15 && hour < 18) nextMeal = "an afternoon snack";
  else if (hour >= 18 && hour < 22) nextMeal = "dinner";

  // Check if they are completely done / over
  if (remCals <= -200) {
    return "You're slightly over your calorie target for today. Focus on hydration and rest to recover!";
  }

  // Priority 1: Huge calorie gap early in day
  if (hour >= 14 && todayTotals.calories < (dailyGoals.calories * 0.3)) {
    return `You've eaten very little today! Make sure to grab a substantial ${nextMeal} to keep your energy levels stable.`;
  }

  // Priority 2: Missing protein
  if (remProtein > 30) {
    return `You're missing ${remProtein}g of protein. A chicken breast, tofu scramble, or protein shake for ${nextMeal} will close the gap perfectly.`;
  } else if (remProtein > 10 && remProtein <= 30) {
    return `You're just ${remProtein}g of protein away from your goal! Add some greek yogurt or nuts to ${nextMeal}.`;
  }

  // Priority 3: Missing fiber
  if (remFiber > 15) {
    return `Don't forget your micronutrients! You still need ${remFiber}g of fiber. Try adding leafy greens, beans, or chia seeds to ${nextMeal}.`;
  }

  // Priority 4: Nearing the end of the day, looking good
  if (hour >= 19 && remCals > 0 && remCals < 400) {
    return `You're winding down the day perfectly. You have ${remCals} kcal left — perfect for a light evening snack.`;
  }

  // Fallback: General encouragement based on progress
  const progress = (todayTotals.calories / dailyGoals.calories) * 100;
  if (progress < 50) {
    return `You're at ${Math.round(progress)}% of your daily calories. Keep fueling up for the rest of the day!`;
  } else if (progress >= 100) {
    return `Incredible job! You hit your calorie target for the day. Rest up and get ready for tomorrow.`;
  } else {
    return `You're doing great! You have ${remCals} kcal left. Keep making smart choices for ${nextMeal}.`;
  }
}
