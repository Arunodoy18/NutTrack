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

/** Youngest and oldest ages the engine supports. Under 2 needs a paediatrician. */
export const MIN_SUPPORTED_AGE = 2;
export const MAX_SUPPORTED_AGE = 120;

/** Anyone under 18 gets paediatric targets (growth, never weight loss). */
export function isChildAge(age: number): boolean {
  return age < 18;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * BMI — WHO Standard
 * Source: WHO Technical Report Series 894 (2000)
 * Formula: weight(kg) / height(m)²
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface BMIResult {
  value: number;
  label: "Underweight" | "Normal" | "Overweight" | "Obese" | "Growing";
}

/**
 * Adult cut-offs (WHO) only apply from 18. Children are classified by
 * BMI-for-age percentile (CDC/WHO growth charts), which needs a clinician,
 * so for under-18s we report the value but label it "Growing" instead of
 * mislabelling a healthy child as under/overweight.
 */
export function calculateBMI(weightKg: number, heightCm: number, age = 30): BMIResult {
  const heightM = heightCm / 100;
  const value = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  let label: BMIResult["label"];
  if (isChildAge(age)) label = "Growing";
  else if (value < 18.5) label = "Underweight";
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
 * Paediatric energy — IOM Dietary Reference Intakes (2005), EER equations
 * Ages 2: (89 × wt − 100) + 20          (13–35 months equation, +20 growth)
 * Ages 3–8:  Boys 88.5 − 61.9·age + PA·(26.7·wt + 903·ht_m) + 20
 *            Girls 135.3 − 30.8·age + PA·(10·wt + 934·ht_m) + 20
 * Ages 9–17: same equations, +25 kcal growth allowance
 * PA = physical-activity coefficient (sedentary … very active)
 * ═══════════════════════════════════════════════════════════════════════════ */

const CHILD_PA: Record<"Male" | "Female", Record<string, number>> = {
  Male: { Sedentary: 1.0, "Lightly active": 1.13, "Moderately active": 1.26, "Very active": 1.42, Athlete: 1.42 },
  Female: { Sedentary: 1.0, "Lightly active": 1.16, "Moderately active": 1.31, "Very active": 1.56, Athlete: 1.56 },
};

export function calculateChildEER(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: string,
  activityLevel: string
): number {
  if (age < 3) return Math.round(89 * weightKg - 100 + 20);
  const boy = gender === "Male";
  const pa = CHILD_PA[boy ? "Male" : "Female"][activityLevel] ?? (boy ? 1.26 : 1.31);
  const heightM = heightCm / 100;
  const growth = age <= 8 ? 20 : 25;
  const eer = boy
    ? 88.5 - 61.9 * age + pa * (26.7 * weightKg + 903 * heightM) + growth
    : 135.3 - 30.8 * age + pa * (10 * weightKg + 934 * heightM) + growth;
  return Math.round(eer);
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
  gender: string,
  age = 30
): MacroTargets {
  /* ─── Children & teens: growth, never a deficit ─── */
  if (isChildAge(age)) {
    const calories = Math.round(Math.min(3500, Math.max(900, tdee)));
    // Protein RDA (IOM): 2–3y 13g, 4–8y 19g, 9–13y 34g, 14–17y 52g (M) / 46g (F)
    let rdaProtein: number;
    if (age <= 3) rdaProtein = 13;
    else if (age <= 8) rdaProtein = 19;
    else if (age <= 13) rdaProtein = 34;
    else rdaProtein = gender === "Male" ? 52 : 46;
    // Never below 10% of energy (AMDR 10–30%)
    const proteinG = Math.ceil(Math.max(rdaProtein, (calories * 0.1) / 4));
    // Fat AMDR: 30–40% (2–3y), 25–35% (4–18y) — use 35% / 30%
    const fatG = Math.round((calories * (age <= 3 ? 0.35 : 0.3)) / 9);
    const carbsG = Math.round(Math.max(0, calories - proteinG * 4 - fatG * 9) / 4);
    // IOM AI: 14 g fibre per 1000 kcal
    const fiberG = Math.round((calories / 1000) * 14);
    return { calories, proteinG, fatG, carbsG, fiberG };
  }

  const adjustment = GOAL_ADJUSTMENTS[goal] ?? 0;
  // Medical-guidance floor: 1200 kcal (F) / 1500 kcal (M) so "Fat loss" can't go unsafe
  const floor = gender === "Male" ? 1500 : 1200;
  const calories = Math.round(Math.max(floor, tdee + adjustment));

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

  // Fiber: IOM AI — 14 g/1000 kcal, capped at the adult AI by age/sex
  const adultAI = age >= 51 ? (gender === "Male" ? 30 : 21) : (gender === "Male" ? 38 : 25);
  const fiberG = Math.min(adultAI, Math.max(20, Math.round((calories / 1000) * 14)));

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
  /* ─── Children & teens — IOM DRIs; sodium = CDRR upper bound (NASEM 2019) ─── */
  if (isChildAge(age)) {
    const male = gender === "Male";
    if (age <= 3) return { sodium: 1200, iron: 7, calcium: 700, vitaminC: 15 };
    if (age <= 8) return { sodium: 1500, iron: 10, calcium: 1000, vitaminC: 25 };
    if (age <= 13) return { sodium: 1800, iron: 8, calcium: 1300, vitaminC: 45 };
    return { sodium: 2300, iron: male ? 11 : 15, calcium: 1300, vitaminC: male ? 75 : 65 };
  }

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
  metabolicHealth: "Optimal" | "At Risk" | "High Risk" | "Growing";
  isChild: boolean;
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
  const isChild = isChildAge(age);
  const bmi = calculateBMI(weightKg, heightCm, age);
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  // Children use the IOM EER (already includes activity); adults BMR × activity.
  const tdee = isChild
    ? calculateChildEER(weightKg, heightCm, age, gender, activityLevel)
    : calculateTDEE(bmr, activityLevel);
  // Children never get a deficit/surplus goal.
  const effectiveGoal = isChild ? "Maintenance" : goal;
  // Deurenberg child equation: 1.51·BMI − 0.70·age − 3.6·sex + 1.4 (Br J Nutr 1991)
  const bodyFatPercent = isChild
    ? Math.round(Math.max(5, Math.min(45, 1.51 * bmi.value - 0.7 * age - 3.6 * (gender === "Male" ? 1 : 0) + 1.4)) * 10) / 10
    : resolveBodyFatPercent(userBodyFatCategory, bmi.value, age, gender);
  const ffm = calculateFFM(weightKg, bodyFatPercent);
  const leanMuscleMass = Math.round(ffm * 0.5 * 10) / 10; // ~50% of FFM is skeletal muscle
  const macros = calculateMacroTargets(tdee, effectiveGoal, weightKg, gender, age);
  const micros = calculateMicroTargets(age, gender);

  let metabolicHealth: FullNutritionProfile["metabolicHealth"];
  if (isChild) metabolicHealth = "Growing";
  else if (bmi.label === "Normal") metabolicHealth = "Optimal";
  else if (bmi.label === "Overweight") metabolicHealth = "At Risk";
  else metabolicHealth = "High Risk";

  return { bmi, bmr, tdee, bodyFatPercent, ffm, leanMuscleMass, macros, micros, metabolicHealth, isChild };
}

/** Row values for the daily_goals table — includes carbs (previously never saved). */
export function toDailyGoalValues(profile: FullNutritionProfile) {
  return {
    calories: profile.macros.calories,
    protein: profile.macros.proteinG,
    fat: profile.macros.fatG,
    carbs: profile.macros.carbsG,
    fiber: profile.macros.fiberG,
    sodium: profile.micros.sodium,
    iron: profile.micros.iron,
    calcium: profile.micros.calcium,
    vitaminC: profile.micros.vitaminC,
  };
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
  currentTime: Date = new Date(),
  age?: number
): string {
  const hour = currentTime.getHours();
  const child = age !== undefined && isChildAge(age);
  
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

  // Kids: positive, food-first messages — never about "over target" or restricting.
  if (child) {
    if (todayTotals.calories === 0) {
      return `Fuel up for the day! Start with ${nextMeal} — try fruit, milk or curd, and something whole-grain.`;
    }
    if (remProtein > 8) {
      return `Add a protein friend to ${nextMeal}: egg, dal, paneer, curd, chicken, fish or nuts (if no allergy) help growing bodies.`;
    }
    if (remFiber > 6) {
      return `Eat the rainbow! A fruit or colourful veggie with ${nextMeal} adds fibre and vitamins.`;
    }
    return "Great eating today! Keep drinking water and enjoy a variety of colourful foods.";
  }

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
