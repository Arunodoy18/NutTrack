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
const DIETARY_PREFS = ["No preference", "Non-vegetarian", "Vegetarian", "Vegan", "Keto", "High protein", "Low carb"];
const MEDICAL_CONDITIONS = ["None", "Diabetes", "Hypertension", "PCOS", "Thyroid", "High cholesterol"];
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
  });

  /* ─── helpers ─── */
  const set = (key: keyof ProfileData, value: string) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const toggleMulti = (key: "dietaryPreferences" | "medicalConditions", val: string) => {
    setData((prev) => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] };
    });
  };

  /* ─── validation ─── */
  const canContinue = (): boolean => {
    switch (step) {
      case 1: return data.name.trim().length > 0 && data.age.trim().length > 0 && data.gender.length > 0;
      case 2: return data.heightCm.trim().length > 0 && data.weightKg.trim().length > 0;
      case 3: return data.activityLevel.length > 0;
      case 4: return data.primaryGoal.length > 0 && data.trainingFrequency.length > 0;
      default: return false;
    }
  };

  /* ─── submit ─── */
  const handleFinish = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/setup/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save profile");
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  const next = () => {
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
                placeholder="Arunodoy Banerjee"
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
                  placeholder="24"
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
                onChange={(e) => set("birthdate", e.target.value)}
                className="w-full bg-surface-muted rounded-[16px] px-4 py-2.5 text-sm font-bold text-ink placeholder:text-ink-faint border-none focus:ring-2 focus:ring-brand outline-none transition-shadow"
              />
            </div>
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
                  placeholder="176"
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
                  placeholder="72"
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
                {GOALS.map((g) => (
                  <Chip key={g} label={g} selected={data.primaryGoal === g} onPress={() => set("primaryGoal", g)} />
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
                Training Frequency
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
