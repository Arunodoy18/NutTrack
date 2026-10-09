import { MIN_SUPPORTED_AGE, MAX_SUPPORTED_AGE } from "./nutritionEngine";

export const ALLOWED_GENDERS = ["Male", "Female"];
export const ALLOWED_ACTIVITY = ["Sedentary", "Lightly active", "Moderately active", "Very active", "Athlete"];
export const ALLOWED_GOALS = ["Lose weight", "Maintain", "Build muscle", "Improve health", "Healthy growth"];

export interface ValidProfile {
  name: string;
  age: number;
  gender: string;
  birthdate: string | null;
  heightCm: number;
  weightKg: number;
  activityLevel: string;
  bodyFat: string | null;
  primaryGoal: string;
  dietaryPreferences: string | null;
  medicalConditions: string | null;
  trainingFrequency: string | null;
}

/** Age in whole years from an ISO yyyy-mm-dd birthdate; null if invalid/future. */
export function ageFromBirthdate(birthdate: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) return null;
  const d = new Date(birthdate + "T00:00:00Z");
  if (Number.isNaN(d.getTime()) || d > now) return null;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

const list = (v: unknown, max = 12): string | null => {
  const arr = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  const clean = arr.map((x) => String(x).trim().slice(0, 40)).filter(Boolean).slice(0, max);
  return clean.length ? clean.join(",") : null;
};

/** Validates raw setup input. Returns the clean profile or a user-facing error. */
export function validateProfileInput(body: any): { ok: true; value: ValidProfile; parentConfirmed: boolean } | { ok: false; error: string } {
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!name) return { ok: false, error: "Please enter a name." };

  const birthdate = typeof body?.birthdate === "string" && body.birthdate ? body.birthdate : null;
  let age = Number(body?.age);
  if (birthdate) {
    const fromBirth = ageFromBirthdate(birthdate);
    if (fromBirth === null) return { ok: false, error: "Birthdate looks invalid." };
    age = fromBirth; // the birthdate is the source of truth
  }
  if (!Number.isInteger(age) || age < MIN_SUPPORTED_AGE || age > MAX_SUPPORTED_AGE) {
    return {
      ok: false,
      error: age < MIN_SUPPORTED_AGE
        ? "Nura supports ages 2 and up. For babies, please follow your paediatrician's advice."
        : "Please enter an age between 2 and 120.",
    };
  }

  const gender = String(body?.gender ?? "");
  if (!ALLOWED_GENDERS.includes(gender)) return { ok: false, error: "Please choose Male or Female." };

  const heightCm = Number(body?.heightCm);
  const weightKg = Number(body?.weightKg);
  if (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 250) return { ok: false, error: "Height must be between 50 and 250 cm." };
  if (!Number.isFinite(weightKg) || weightKg < 8 || weightKg > 400) return { ok: false, error: "Weight must be between 8 and 400 kg." };

  const activityLevel = String(body?.activityLevel ?? "");
  if (!ALLOWED_ACTIVITY.includes(activityLevel)) return { ok: false, error: "Please choose an activity level." };

  let primaryGoal = String(body?.primaryGoal ?? "");
  if (!ALLOWED_GOALS.includes(primaryGoal)) return { ok: false, error: "Please choose a goal." };
  // Children and teens: growth only, never weight loss / muscle-building targets.
  if (age < 18) primaryGoal = "Healthy growth";

  return {
    ok: true,
    parentConfirmed: body?.parentConfirmed === true,
    value: {
      name,
      age,
      gender,
      birthdate,
      heightCm: Math.round(heightCm),
      weightKg: Math.round(weightKg),
      activityLevel,
      bodyFat: age < 18 ? null : (typeof body?.bodyFat === "string" && body.bodyFat ? body.bodyFat.slice(0, 40) : null),
      primaryGoal,
      dietaryPreferences: list(body?.dietaryPreferences),
      medicalConditions: list(body?.medicalConditions),
      trainingFrequency: typeof body?.trainingFrequency === "string" && body.trainingFrequency ? body.trainingFrequency.slice(0, 40) : null,
    },
  };
}
