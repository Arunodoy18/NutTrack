export interface WeightPoint {
  id: string;
  kg: number;
  at: number; // ms epoch
  pending?: boolean;
}

/** Change in kg between the latest entry and the newest entry that is at least `days` older. */
export function changeOver(points: WeightPoint[], days: number): number | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.at - b.at);
  const latest = sorted[sorted.length - 1];
  const cutoff = latest.at - days * 86_400_000;
  const base = [...sorted].reverse().find((p) => p.at <= cutoff) ?? sorted[0];
  if (base.id === latest.id) return null;
  return Math.round((latest.kg - base.kg) * 10) / 10;
}

/** Average kg/week across the whole series (null when the span is under ~5 days). */
export function weeklyRate(points: WeightPoint[]): number | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.at - b.at);
  const span = (sorted[sorted.length - 1].at - sorted[0].at) / 86_400_000;
  if (span < 5) return null;
  return Math.round(((sorted[sorted.length - 1].kg - sorted[0].kg) / (span / 7)) * 100) / 100;
}

/** Adults trying to lose weight: more than ~1% of body weight a week is too fast to be healthy. */
export function lossTooFast(points: WeightPoint[]): boolean {
  const rate = weeklyRate(points);
  if (rate === null || rate >= 0) return false;
  const latest = [...points].sort((a, b) => b.at - a.at)[0];
  return Math.abs(rate) > latest.kg * 0.01;
}
