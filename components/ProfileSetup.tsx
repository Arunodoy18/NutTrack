"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/* ─── types ─── */
interface ProfileData {
  name: string;
  age: string;
  gender: string;
  birthdate: string;
  heightCm: string;
  weightKg: string;
  activityLevel: string;
  bodyFat: string;
  primaryGoal: string;
  dietaryPreferences: string[];
  medicalConditions: string[];
  trainingFrequency: string;
  parentConfirmed: boolean;
}

/* ─── step config ─── */
const STEPS = [
  { id: 1, label: "The basics", eyebrow: "THE BASICS", heading: "Tell us about you" },
  { id: 2, label: "Your body", eyebrow: "MEASUREMENTS", heading: "Your body" },
  { id: 3, label: "Activity", eyebrow: "ACTIVITY", heading: "Your activity" },
  { id: 4, label: "Goals", eyebrow: "PREFERENCES", heading: "Your goals" },
];

const ACTIVITY_LEVELS = ["Sedentary", "Lightly active", "Moderately active", "Very active", "Athlete"];
const BODY_FAT_OPTIONS = ["Low (<15%)", "Average (15–24%)", "High (25–31%)", "Very high (32%+)"];
const GOALS = ["Lose weight", "Maintain", "Build muscle", "Improve health"];
const KID_GOAL = "Healthy growth";
const DIETARY_PREFS = ["No preference", "Non-vegetarian", "Eggetarian", "Vegetarian", "Vegan", "Jain", "Gluten-free", "Dairy-free", "Keto", "High protein", "Low carb"];
const MEDICAL_CONDITIONS = ["None", "Food allergy", "Diabetes", "Hypertension", "PCOS", "Thyroid", "High cholesterol", "Celiac disease"];
const TRAINING_FREQ = ["0–1 / week", "2–3 / week", "4–5 / week", "6+ / week"];

export default function ProfileSetup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState<ProfileData>({
    name: "",
    age: "",
    gender: "",
    birthdate: "",
    heightCm: "",
    weightKg: "",
    activityLevel: "",
    bodyFat: "",
    primaryGoal: "",
    dietaryPreferences: [],
    medicalConditions: [],
    trainingFrequency: "",
    parentConfirmed: false,
  });

  /* ─── helpers ─── */
  const set = (key: keyof ProfileData, value: string) =>
    setData((prev) => ({ ...prev, [key]: value }));

  /** Age in whole years from an ISO birthdate, or null if empty/invalid/future. */
  const ageFromBirthdate = (iso: string): number | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const b = new Date(iso + "T00:00:00");
    const now = new Date();
    if (Number.isNaN(b.getTime()) || b > now) return null;
    let a = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
    return a;
  };

  const setBirthdate = (iso: string) =>
    setData((prev) => {
      const a = ageFromBirthdate(iso);
      return { ...prev, birthdate: iso, age: a !== null ? String(a) : prev.age };
    });

  const ageNum = parseInt(data.age, 10);
  const isChild = Number.isFinite(ageNum) && ageNum >= 2 && ageNum < 18;
  const needsParent = Number.isFinite(ageNum) && ageNum >= 2 && ageNum < 13;
  const today = new Date().toISOString().slice(0, 10);

  const toggleMulti = (key: "dietaryPreferences" | "medicalConditions", val: string) => {
    setData((prev) => {
      const arr = prev[key];
      // "No preference" / "None" are exclusive: picking one clears the rest, and vice versa.
      const exclusive = val === "No preference" || val === "None";
      if (arr.includes(val)) return { ...prev, [key]: arr.filter((v) => v !== val) };
      if (exclusive) return { ...prev, [key]: [val] };
      return { ...prev, [key]: [...arr.filter((v) => v !== "No preference" && v !== "None"), val] };
    });
  };

  /* ─── validation ─── */
  const canContinue = (): boolean => {
    switch (step) {
      case 1:
        return (
          data.name.trim().length > 0 &&
          Number.isFinite(ageNum) && ageNum >= 2 && ageNum <= 120 &&
          data.gender.length > 0 &&
          (!needsParent || data.parentConfirmed)
        );
      case 2: {
        const h = parseFloat(data.heightCm), w = parseFloat(data.weightKg);
        return h >= 50 && h <= 250 && w >= 8 && w <= 400;
      }
      case 3: return data.activityLevel.length > 0;
      case 4: return (isChild || data.primaryGoal.length > 0) && data.trainingFrequency.length > 0;
      default: return false;
    }
  };

  /* ─── submit ─── */
  const handleFinish = async () => {
    if (saving) return; // guard against double taps
    setSaving(true);
    setError("");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch("/api/setup/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, primaryGoal: isChild ? KID_GOAL : data.primaryGoal }),
        signal: ctrl.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save profile");
      router.push("/dashboard");
    } catch (e: any) {
      setError(
        e?.name === "AbortError"
          ? "That took too long. Check your connection and try again."
          : e?.message === "Failed to fetch"
            ? "You seem to be offline. Please reconnect and try again."
            : e?.message || "Something went wrong. Please try again."
      );
      setSaving(false);
    } finally {
      clearTimeout(timer);
    }
  };

  const next = () => {
    if (!canContinue()) return;
    if (step < 4) setStep(step + 1);
    else handleFinish();
  };

  const back = () => {
    if (step > 1) setStep(step - 1);
  };

  /* ─── reusable chip ─── */
  const Chip = ({
    label,
    selected,
    onPress,
    wide,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
    wide?: boolean;
  }) => (
    <button
      type="button"
      onClick={onPress}
      className={`rounded-[20px] px-5 py-3.5 text-sm font-bold transition-all border
        ${wide ? "w-full text-left" : ""}
        ${
          selected
            ? "border-brand bg-brand/5 text-brand"
            : "border-surface-line bg-surface-muted text-ink hover:border-ink-soft/40"
        }`}
    >
      {label}
    </button>
  );

  /* ─── progress pills ─── */
  const ProgressBar = () => (
    <div className="flex items-center gap-1.5 flex-1">
      {STEPS.map((s) => (
        <div
          key={s.id}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
            s.id <= step ? "bg-brand" : "bg-surface-line"
          }`}
        />
      ))}
    </div>
  );



  return (
    <div className="h-[100dvh] flex flex-col bg-white font-sans text-ink overflow-hidden">
      {/* Top bar: back + progress */}
      <div className="shrink-0 px-5 pt-3 pb-2 flex flex-col gap-3">
        <div className="flex items-center gap-4">
          {step > 1 && (
            <button
              onClick={back}
              className="w-9 h-9 rounded-full border border-surface-line flex items-center justify-center text-ink-soft hover:text-ink transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <ProgressBar />
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-6 pb-2">
        {/* Step header */}
        <div className="mb-2">
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-brand uppercase">
            {STEPS[step - 1].eyebrow}
          </span>
          <h1 className="font-display font-black text-[32px] tracking-tight leading-none text-ink">
            {STEPS[step - 1].heading}
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-4 text-sm font-medium">
            {error}
          </div>
        )}

        {/* ─── STEP 1: THE BASICS ─── */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2 ml-1">
                Full Name
              </label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Your name"
                maxLength={80}
                autoComplete="name"
                className="w-full bg-surface-muted rounded-[16px] px-4 py-2.5 text-sm font-bold text-ink placeholder:text-ink-faint border-none focus:ring-2 focus:ring-brand outline-none transition-shadow"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2 ml-1">
                  Age
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={data.age}
                  onChange={(e) => set("age", e.target.value)}
                  placeholder="e.g. 25"
                  min={2}
                  max={120}
                  className="w-full bg-surface-muted rounded-[16px] px-4 py-2.5 text-sm font-bold text-ink placeholder:text-ink-faint border-none focus:ring-2 focus:ring-brand outline-none transition-shadow"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2 ml-1">
                  Sex
                </label>
                <div className="flex gap-2">
                  {["Male", "Female"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => set("gender", g)}
                      className={`flex-1 rounded-[16px] py-2.5 text-sm font-bold transition-all border ${
                        data.gender === g
                          ? "border-brand bg-brand/5 text-brand"
                          : "border-surface-line bg-surface-muted text-ink hover:border-ink-soft/40"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2 ml-1">
                Birthdate
              </label>
              <input
                type="date"
                value={data.birthdate}
                max={today}
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full bg-surface-muted rounded-[16px] px-4 py-2.5 text-sm font-bold text-ink placeholder:text-ink-faint border-none focus:ring-2 focus:ring-brand outline-none transition-shadow"
              />
            </div>

            {Number.isFinite(ageNum) && ageNum < 2 && ageNum >= 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-[16px] p-3 text-sm font-medium">
                Nura supports ages 2 and up. For babies and toddlers, please follow your paediatrician&apos;s feeding advice.
              </div>
            )}
            {isChild && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[16px] p-3 text-sm font-medium">
                Kids&apos; targets focus on healthy growth — no dieting or weight-loss goals.
              </div>
            )}
            {needsParent && (
              <label className="flex items-start gap-3 bg-surface-muted rounded-[16px] p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.parentConfirmed}
                  onChange={(e) => setData((prev) => ({ ...prev, parentConfirmed: e.target.checked }))}
                  className="mt-1 w-5 h-5 accent-[#FC4C02]"
                />
                <span className="text-sm font-medium text-ink-soft leading-snug">
                  I&apos;m this child&apos;s parent or guardian and I&apos;m setting up this profile for them.
                </span>
              </label>
            )}
          </div>
        )}

        {/* ─── STEP 2: YOUR BODY ─── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2 ml-1">
                Height
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={data.heightCm}
                  onChange={(e) => set("heightCm", e.target.value)}
                  placeholder={isChild ? "e.g. 120" : "e.g. 170"}
                  className="w-full bg-surface-muted rounded-[20px] px-5 py-3 pr-24 text-sm font-bold text-ink placeholder:text-ink-faint border-none focus:ring-2 focus:ring-brand outline-none transition-shadow"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-soft whitespace-nowrap">
                  {(() => {
                    const h = parseFloat(data.heightCm);
                    if (isNaN(h) || h <= 0) return "cm";
                    const totalInches = h / 2.54;
                    let ft = Math.floor(totalInches / 12);
                    let inc = Math.round(totalInches % 12);
                    if (inc === 12) { ft += 1; inc = 0; }
                    return `cm / ${ft}'${inc}"`;
                  })()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2 ml-1">
                Weight
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={data.weightKg}
                  onChange={(e) => set("weightKg", e.target.value)}
                  placeholder={isChild ? "e.g. 25" : "e.g. 65"}
                  className="w-full bg-surface-muted rounded-[20px] px-5 py-3 pr-24 text-sm font-bold text-ink placeholder:text-ink-faint border-none focus:ring-2 focus:ring-brand outline-none transition-shadow"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-soft whitespace-nowrap">
                  {(() => {
                    const w = parseFloat(data.weightKg);
                    if (isNaN(w) || w <= 0) return "kg";
                    return `kg / ${Math.round(w * 2.20462)} lbs`;
                  })()}
                </span>
              </div>
            </div>

            <div className="bg-surface-muted rounded-[20px] p-4 flex items-start gap-3 mt-2">
              <div className="w-5 h-5 rounded-full border-2 border-brand flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-brand text-[10px] font-bold">i</span>
              </div>
              <p className="text-sm font-medium text-ink-soft leading-relaxed">
                We use this to calculate your BMI, BMR, TDEE, fat-free mass &amp; daily calorie target.
              </p>
            </div>
          </div>
        )}

        {/* ─── STEP 3: ACTIVITY ─── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-3 ml-1">
                Activity Level
              </label>
              <div className="flex flex-col gap-2.5">
                {ACTIVITY_LEVELS.map((lvl) => (
                  <Chip key={lvl} label={lvl} selected={data.activityLevel === lvl} onPress={() => set("activityLevel", lvl)} wide />
                ))}
              </div>
            </div>

            {!isChild && (
              <div>
                <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-3 ml-1">
                  Body Fat (optional)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {BODY_FAT_OPTIONS.map((opt) => (
                    <Chip key={opt} label={opt} selected={data.bodyFat === opt} onPress={() => set("bodyFat", data.bodyFat === opt ? "" : opt)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 4: GOALS ─── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-3 ml-1">
                Primary Goal
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {(isChild ? [KID_GOAL] : GOALS).map((g) => (
                  <Chip key={g} label={g} selected={isChild ? true : data.primaryGoal === g} onPress={() => set("primaryGoal", g)} />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-3 ml-1">
                Dietary Preferences
              </label>
              <div className="flex flex-wrap gap-2.5">
                {DIETARY_PREFS.map((d) => (
                  <Chip key={d} label={d} selected={data.dietaryPreferences.includes(d)} onPress={() => toggleMulti("dietaryPreferences", d)} />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-3 ml-1">
                Medical Conditions
              </label>
              <div className="flex flex-wrap gap-2.5">
                {MEDICAL_CONDITIONS.map((m) => (
                  <Chip key={m} label={m} selected={data.medicalConditions.includes(m)} onPress={() => toggleMulti("medicalConditions", m)} />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-3 ml-1">
                {isChild ? "Sports & active play" : "Training Frequency"}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {TRAINING_FREQ.map((t) => (
                  <Chip key={t} label={t} selected={data.trainingFrequency === t} onPress={() => set("trainingFrequency", t)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom sticky bar */}
      <div className="shrink-0 px-6 pb-4 pt-2 bg-white border-t border-surface-line/50">
        {!canContinue() && !saving && (
          <p className="text-xs font-medium text-ink-faint text-center mb-2">
            {step === 1 && "Add a name, age (2–120), sex"+(needsParent ? " and the parent confirmation" : "")+" to continue."}
            {step === 2 && "Enter a realistic height (50–250 cm) and weight (8–400 kg)."}
            {step === 3 && "Pick the activity level that fits best."}
            {step === 4 && "Choose a goal and how often you train to finish."}
          </p>
        )}

        <button
          onClick={next}
          disabled={!canContinue() || saving}
          className={`w-full rounded-[16px] py-3 font-bold text-base transition-all
            ${
              canContinue() && !saving
                ? "bg-brand text-white shadow-lg shadow-brand/30 hover:bg-[#e63e00] active:scale-[0.98]"
                : "bg-surface-muted text-ink-faint cursor-not-allowed"
            }`}
        >
          {saving ? "Saving..." : step < 4 ? "Continue" : "Start tracking"}
        </button>
      </div>
    </div>
  );
}
