import { redirect } from "next/navigation";
import { getActor, canAccessProfile } from "@/lib/access";
import { collectExport } from "@/lib/exportCollector";
import { averages, summarizeByDay } from "@/lib/exportData";
import { getUserTz } from "@/lib/tzServer";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

/** A one-page summary people can print or "Save as PDF" and hand to a doctor or dietitian. */
export default async function ReportPage(props: { searchParams: Promise<{ days?: string; profile?: string }> }) {
  const searchParams = await props.searchParams;
  const actor = await getActor();
  if (!actor) redirect("/auth/login");
  const days = searchParams.days === "90" ? 90 : searchParams.days === "7" ? 7 : 30;
  const wanted = searchParams.profile && (await canAccessProfile(actor.sessionUserId, searchParams.profile)) ? searchParams.profile : actor.activeId;
  const tz = await getUserTz();
  const b = await collectExport({ accountId: actor.sessionUserId, profileId: wanted, rangeDays: days, timezone: tz });
  const person = b.profiles[0];
  if (!person) redirect("/profile");

  const perDay = summarizeByDay(b, wanted);
  const avg = averages(perDay);
  const goal = b.goals.find((g) => g.profileId === wanted); // newest first
  const weights = b.weight.filter((w) => w.profileId === wanted).sort((a, c) => a.timestamp.localeCompare(c.timestamp));
  const wDelta = weights.length >= 2 ? Math.round((weights[weights.length - 1].weightKg - weights[0].weightKg) * 10) / 10 : null;
  const pct = (v: number, g?: number) => (g ? `${Math.round((v / g) * 100)}% of target` : "");

  return (
    <div className="min-h-screen bg-white text-ink font-sans p-6 max-w-3xl mx-auto select-text print:p-0">
      <style>{`@media print { @page { margin: 14mm; } body { background: #fff !important; } .no-print { display: none !important; } }`}</style>
      <div className="no-print flex items-center justify-between mb-6">
        <a href="/profile" className="text-sm font-bold text-ink-soft">← Back</a>
        <div className="flex gap-2 items-center">
          {[7, 30, 90].map((d) => (
            <a key={d} href={`/report?days=${d}&profile=${wanted}`} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${d === days ? "bg-ink text-white border-ink" : "border-surface-line text-ink"}`}>{d} days</a>
          ))}
          <PrintButton />
        </div>
      </div>

      <h1 className="font-display text-3xl font-black tracking-tight">Nutrition summary</h1>
      <p className="text-sm font-medium text-ink-soft mb-5">
        {person.name} · {person.age != null ? `${person.age} yrs` : ""}{person.gender ? ` · ${person.gender}` : ""} · last {days} days · created {new Date(b.exportedAt).toLocaleDateString()}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          ["Days logged", `${avg.loggedDays} / ${days}`],
          ["Avg calories", `${avg.kcal} kcal`, pct(avg.kcal, goal?.calories)],
          ["Avg protein", `${avg.protein} g`, pct(avg.protein, goal?.protein)],
          ["Avg water", `${(avg.waterMl / 1000).toFixed(1)} L`],
        ].map(([l, v, s]) => (
          <div key={String(l)} className="rounded-2xl border border-surface-line p-3">
            <div className="text-[10px] font-mono font-bold tracking-wider text-ink-soft uppercase">{l}</div>
            <div className="text-xl font-black">{v}</div>
            {s ? <div className="text-[11px] font-medium text-ink-soft">{s}</div> : null}
          </div>
        ))}
      </div>

      <h2 className="text-sm font-black mb-2">Profile</h2>
      <table className="w-full text-sm mb-6"><tbody>
        {[
          ["Height / weight", `${person.heightCm ?? "—"} cm / ${person.weightKg ?? "—"} kg`],
          ["Activity", person.activityLevel ?? "—"], ["Goal", person.primaryGoal ?? "—"],
          ["Diet", person.dietaryPreferences ?? "—"], ["Conditions / allergies", person.medicalConditions ?? "—"],
          ["Daily targets", goal ? `${goal.calories} kcal · P ${goal.protein} g · C ${goal.carbs} g · F ${goal.fat} g · fibre ${goal.fiber} g` : "—"],
          ["Weight change", wDelta === null ? "Not enough weigh-ins" : `${wDelta > 0 ? "+" : ""}${wDelta} kg over the period (${weights[0].weightKg} → ${weights[weights.length - 1].weightKg} kg)`],
        ].map(([k, v]) => <tr key={k} className="border-b border-surface-line"><td className="py-1.5 pr-4 font-bold text-ink-soft w-44 align-top">{k}</td><td className="py-1.5 font-medium">{v}</td></tr>)}
      </tbody></table>

      <h2 className="text-sm font-black mb-2">Day by day</h2>
      <table className="w-full text-xs mb-6">
        <thead><tr className="text-left text-ink-soft border-b-2 border-surface-line"><th className="py-1.5">Date</th><th>Meals</th><th>kcal</th><th>Protein</th><th>Carbs</th><th>Fat</th><th>Water</th></tr></thead>
        <tbody>
          {perDay.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-ink-soft">Nothing logged in this period.</td></tr>}
          {[...perDay].reverse().map((d) => (
            <tr key={d.date} className="border-b border-surface-line"><td className="py-1.5 font-bold">{d.date}</td><td>{d.meals}</td><td>{d.kcal}</td><td>{Math.round(d.protein)} g</td><td>{Math.round(d.carbs)} g</td><td>{Math.round(d.fat)} g</td><td>{d.waterMl ? `${(d.waterMl / 1000).toFixed(1)} L` : "—"}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] font-medium text-ink-soft border-t border-surface-line pt-3">
        Generated by Nura. Values are estimates from AI photo analysis, reference food tables and manual entries — not clinical measurements. This summary is for information and doesn&apos;t replace medical advice.
      </p>
    </div>
  );
}
