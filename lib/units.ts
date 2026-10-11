"use client";

import { useEffect, useState } from "react";

export type WeightUnit = "kg" | "lb";
const KEY = "nura_unit_weight";
const LB_PER_KG = 2.2046226218;

export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;
/** Always one decimal at most; storage stays in kilograms. */
export const showWeight = (kg: number, unit: WeightUnit) => (Math.round((unit === "lb" ? kgToLb(kg) : kg) * 10) / 10).toString();
export const showWeightDelta = (kgDelta: number, unit: WeightUnit) => Math.round((unit === "lb" ? kgToLb(kgDelta) : kgDelta) * 10) / 10;
/** What the person typed (in their unit) → kilograms rounded to 0.1. */
export const toKg = (typed: number, unit: WeightUnit) => Math.round((unit === "lb" ? lbToKg(typed) : typed) * 10) / 10;

export function getWeightUnit(): WeightUnit {
  try { return localStorage.getItem(KEY) === "lb" ? "lb" : "kg"; } catch { return "kg"; }
}
export function setWeightUnit(u: WeightUnit) {
  try { localStorage.setItem(KEY, u); } catch { /* private mode */ }
  try { window.dispatchEvent(new Event("nura:units")); } catch { /* ignore */ }
}
/** Reads after mount (SSR-safe) and follows changes made on the Units screen. */
export function useWeightUnit(): WeightUnit {
  const [u, setU] = useState<WeightUnit>("kg");
  useEffect(() => {
    const sync = () => setU(getWeightUnit());
    sync();
    window.addEventListener("nura:units", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("nura:units", sync); window.removeEventListener("storage", sync); };
  }, []);
  return u;
}
