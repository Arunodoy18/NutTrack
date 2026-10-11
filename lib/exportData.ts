import { zipSync, strToU8 } from "fflate";
import { dateKeyInTz } from "@/lib/tz";

/* ─────────── shapes (plain data, no DB types, so the builder is easy to test) ─────────── */

export interface ExportProfile {
  id: string; name: string | null; relation: string | null; isOwner: boolean;
  email?: string | null; age: number | null; gender: string | null; birthdate: string | null;
  heightCm: number | null; weightKg: number | null; activityLevel: string | null; primaryGoal: string | null;
  dietaryPreferences: string | null; medicalConditions: string | null; createdAt: string;
}
export interface ExportMeal {
  id: string; profileId: string; timestamp: string; session: string | null; name: string | null;
  calories: number; protein: number; fat: number; carbs: number; fiber: number; sodium: number; iron: number; calcium: number;
  vitaminC: number; potassium: number; hasPhoto: boolean;
  items: { name: string; quantity: string | null; calories: number; protein: number; fat: number; carbs: number; fiber: number; sodium: number }[];
  /** data: URL of the photo, only when the person asked for photos. */
  photo?: string | null;
}
export interface ExportGoal { profileId: string; createdAt: string; calories: number; protein: number; fat: number; carbs: number; fiber: number; sodium: number; iron: number; calcium: number; vitaminC: number }
export interface ExportWater { id: string; profileId: string; timestamp: string; amountMl: number }
export interface ExportWeight { id: string; profileId: string; timestamp: string; weightKg: number }

export interface ExportBundle {
  exportedAt: string;
  timezone: string;
  scope: "family" | "profile";
  rangeDays: number | null;
  profiles: ExportProfile[];
  goals: ExportGoal[];
  meals: ExportMeal[];
  water: ExportWater[];
  weight: ExportWeight[];
  groceryList: { name: string; purchased: boolean; addedAt: string }[];
}

/* ─────────── CSV (safe for spreadsheets) ─────────── */

/**
 * One CSV cell. Quotes/newlines are escaped, and anything a spreadsheet could execute as a formula
 * (starts with = + - @ tab or CR) is prefixed with an apostrophe — a classic "CSV injection" attack
 * via a meal name like `=HYPERLINK(...)`. Plain negative numbers are left alone.
 */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "boolean") return v ? "true" : "false";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) lines.push(r.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n"; // BOM so Excel reads UTF-8 (Hindi names, ×, é)
}

const localDate = (tz: string, iso: string) => dateKeyInTz(tz, iso);
const localTime = (tz: string, iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

export function buildCsvFiles(b: ExportBundle): Record<string, string> {
  const tz = b.timezone;
  const nameOf = new Map(b.profiles.map((p) => [p.id, p.name || "Profile"]));
  const who = (id: string) => nameOf.get(id) ?? "";
  return {
    "profiles.csv": toCsv(
      ["name", "relation", "age", "gender", "birthdate", "height_cm", "weight_kg", "activity_level", "goal", "dietary_preferences", "medical_conditions", "created_at"],
      b.profiles.map((p) => [p.name, p.isOwner ? "you" : p.relation, p.age, p.gender, p.birthdate, p.heightCm, p.weightKg, p.activityLevel, p.primaryGoal, p.dietaryPreferences, p.medicalConditions, p.createdAt])
    ),
    "daily_targets.csv": toCsv(
      ["profile", "set_on", "calories", "protein_g", "fat_g", "carbs_g", "fiber_g", "sodium_mg", "iron_mg", "calcium_mg", "vitamin_c_mg"],
      b.goals.map((g) => [who(g.profileId), localDate(tz, g.createdAt), g.calories, g.protein, g.fat, g.carbs, g.fiber, g.sodium, g.iron, g.calcium, g.vitaminC])
    ),
    "meals.csv": toCsv(
      ["profile", "date", "time", "meal", "name", "calories", "protein_g", "fat_g", "carbs_g", "fiber_g", "sodium_mg", "iron_mg", "calcium_mg", "vitamin_c_mg", "potassium_mg", "has_photo"],
      b.meals.map((m) => [who(m.profileId), localDate(tz, m.timestamp), localTime(tz, m.timestamp), m.session, m.name, m.calories, m.protein, m.fat, m.carbs, m.fiber, m.sodium, m.iron, m.calcium, m.vitaminC, m.potassium, m.hasPhoto])
    ),
    "meal_items.csv": toCsv(
      ["profile", "date", "meal", "meal_name", "food", "quantity", "calories", "protein_g", "fat_g", "carbs_g", "fiber_g", "sodium_mg"],
      b.meals.flatMap((m) => m.items.map((i) => [who(m.profileId), localDate(tz, m.timestamp), m.session, m.name, i.name, i.quantity, i.calories, i.protein, i.fat, i.carbs, i.fiber, i.sodium]))
    ),
    "water.csv": toCsv(["profile", "date", "time", "amount_ml"], b.water.map((w) => [who(w.profileId), localDate(tz, w.timestamp), localTime(tz, w.timestamp), w.amountMl])),
    "weight.csv": toCsv(["profile", "date", "time", "weight_kg"], b.weight.map((w) => [who(w.profileId), localDate(tz, w.timestamp), localTime(tz, w.timestamp), w.weightKg])),
    "grocery_list.csv": toCsv(["item", "bought", "added_on"], b.groceryList.map((g) => [g.name, g.purchased, localDate(tz, g.addedAt)])),
  };
}

export function readme(b: ExportBundle): string {
  return [
    "Nura — your data export",
    `Created: ${b.exportedAt}`,
    `Times are shown in: ${b.timezone}`,
    `Scope: ${b.scope === "family" ? "everyone on your account" : "one person"}${b.rangeDays ? `, last ${b.rangeDays} days` : ", all time"}`,
    "",
    "Files",
    "  profiles.csv       who is tracked: age, height, weight, goal, diet, conditions",
    "  daily_targets.csv  the calorie/macro targets that were set for each person",
    "  meals.csv          one row per logged meal with its totals",
    "  meal_items.csv     one row per food inside each meal",
    "  water.csv          each drink (ml)",
    "  weight.csv         each weigh-in (kg)",
    "  grocery_list.csv   your shopping list",
    "  photos/            meal photos (only if you chose to include them)",
    "",
    "Notes",
    "  • Nutrition values are estimates (AI scans and reference tables), not medical measurements.",
    "  • Cells that begin with = + - @ are prefixed with an apostrophe so spreadsheets don't run them as formulas.",
    "  • Your password and sign-in tokens are never included.",
    "",
  ].join("\r\n");
}

const extFor = (dataUrl: string) => (/^data:image\/png/.test(dataUrl) ? "png" : /^data:image\/webp/.test(dataUrl) ? "webp" : "jpg");
function dataUrlBytes(dataUrl: string): Uint8Array | null {
  const m = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  try { return Uint8Array.from(Buffer.from(m[1], "base64")); } catch { return null; }
}

/** The CSV bundle as a .zip (optionally with meal photos). */
export function buildZip(b: ExportBundle, includePhotos: boolean): Uint8Array {
  const files: Record<string, Uint8Array> = { "README.txt": strToU8(readme(b)) };
  for (const [name, content] of Object.entries(buildCsvFiles(b))) files[name] = strToU8(content);
  if (includePhotos) {
    for (const m of b.meals) {
      if (!m.photo) continue;
      const bytes = dataUrlBytes(m.photo);
      if (bytes) files[`photos/${localDate(b.timezone, m.timestamp)}_${m.id.slice(0, 8)}.${extFor(m.photo)}`] = bytes;
    }
  }
  return zipSync(files, { level: 6 });
}

/** The complete, machine-readable export. Photos stay out of the JSON (they live in the zip). */
export function buildJson(b: ExportBundle): string {
  const slim = { ...b, meals: b.meals.map(({ photo: _p, ...rest }) => rest) };
  return JSON.stringify(slim, null, 2);
}

/* ─────────── printable summary (for a doctor or dietitian) ─────────── */

export interface DaySummary { date: string; kcal: number; protein: number; carbs: number; fat: number; waterMl: number; meals: number }

export function summarizeByDay(b: ExportBundle, profileId: string): DaySummary[] {
  const tz = b.timezone;
  const days = new Map<string, DaySummary>();
  const day = (d: string) => days.get(d) ?? (days.set(d, { date: d, kcal: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0, meals: 0 }), days.get(d)!);
  for (const m of b.meals) if (m.profileId === profileId) { const d = day(localDate(tz, m.timestamp)); d.kcal += m.calories; d.protein += m.protein; d.carbs += m.carbs; d.fat += m.fat; d.meals++; }
  for (const w of b.water) if (w.profileId === profileId) day(localDate(tz, w.timestamp)).waterMl += w.amountMl;
  return Array.from(days.values()).sort((a, b2) => a.date.localeCompare(b2.date));
}

export function averages(days: DaySummary[]) {
  const logged = days.filter((d) => d.meals > 0);
  const n = Math.max(1, logged.length);
  const avg = (k: keyof DaySummary) => Math.round(logged.reduce((a, d) => a + (d[k] as number), 0) / n);
  return { loggedDays: logged.length, kcal: avg("kcal"), protein: avg("protein"), carbs: avg("carbs"), fat: avg("fat"), waterMl: avg("waterMl") };
}
