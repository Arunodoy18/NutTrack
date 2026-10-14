"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, Smartphone, Trash2, Link2 } from "lucide-react";
import { WORKOUT_KINDS, estimateWorkoutKcal, type WorkoutKind } from "@/lib/activity";
import { showToast } from "@/components/OfflineStatusBar";

interface Wk { id: string; startedAt: string; minutes: number; kcal: number; kind: string; title: string | null; source: string }
interface Dev { id: string; label: string | null; profileId: string; createdAt: string; lastSeenAt: string | null }
const ago = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "never");

export default function ConnectedAppsClient({ name, age, profiles }: { name: string; age: number | null; profiles: { id: string; name: string }[] }) {
  const [days, setDays] = useState<{ day: string; steps: number; activeKcal: number }[]>([]);
  const [wks, setWks] = useState<Wk[]>([]);
  const [settings, setSettings] = useState({ creditEnabled: false, creditPct: 50 });
  const [devices, setDevices] = useState<Dev[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [kind, setKind] = useState<WorkoutKind>("walking");
  const [minutes, setMinutes] = useState("30");
  const [busy, setBusy] = useState(false);
  const adult = age !== null && age >= 18;

  const load = useCallback(async () => {
    const [a, d] = await Promise.all([
      fetch("/api/activity?days=7", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/sync/device", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    if (a) { setDays(a.days); setWks(a.workouts); setSettings(a.settings); }
    if (d) setDevices(d.devices);
  }, []);
  useEffect(() => { load(); }, [load]);

  const logWorkout = async () => {
    const m = Math.round(Number(minutes));
    if (!Number.isFinite(m) || m < 1 || m > 1440) return showToast("Enter 1–1440 minutes");
    setBusy(true);
    const r = await fetch("/api/activity/workout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, minutes: m }) });
    setBusy(false);
    if (!r.ok) return showToast((await r.json().catch(() => ({}))).error || "Couldn't save that workout");
    showToast("Workout added"); load();
  };
  const delWorkout = async (id: string) => {
    await fetch("/api/activity/workout", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };
  const saveSettings = async (next: { creditEnabled: boolean; creditPct: number }) => {
    setSettings(next);
    const r = await fetch("/api/activity/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    if (!r.ok) { showToast((await r.json().catch(() => ({}))).error || "Couldn't save"); load(); }
  };
  const makeCode = async () => {
    setBusy(true);
    const r = await fetch("/api/sync/pair", { method: "POST" });
    setBusy(false);
    if (!r.ok) return showToast("Couldn't create a code");
    setCode((await r.json()).code);
  };
  const disconnect = async (id: string) => {
    await fetch("/api/sync/device", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };
  const personName = (id: string) => profiles.find((p) => p.id === id)?.name ?? "—";
  const est = estimateWorkoutKcal(kind, Math.max(0, Math.round(Number(minutes)) || 0), 60);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/profile" aria-label="Back" className="w-10 h-10 rounded-full bg-white border border-surface-line flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></Link>
        <div><h1 className="font-display text-2xl font-black">Activity &amp; connected apps</h1><p className="text-xs font-medium text-ink-soft">For {name}</p></div>
      </div>

      <section className="bg-white rounded-[32px] p-5 shadow-sm border border-surface-line">
        <h2 className="font-black text-ink flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-600" /> Log a workout</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as WorkoutKind)} className="rounded-xl border border-surface-line bg-surface px-3 py-3 text-sm font-medium" aria-label="Activity">
            {WORKOUT_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
          <div className="flex items-center gap-2 rounded-xl border border-surface-line bg-surface px-3">
            <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, "").slice(0, 4))} className="w-full bg-transparent py-3 text-sm font-medium outline-none" aria-label="Minutes" />
            <span className="text-xs text-ink-soft">min</span>
          </div>
        </div>
        <button onClick={logWorkout} disabled={busy} className="mt-3 w-full rounded-2xl bg-brand text-white font-bold py-3 disabled:opacity-60">Add workout (≈{est}+ kcal)</button>
        <p className="mt-2 text-[11px] text-ink-soft">Calories are estimated from the activity, time and weight.</p>
      </section>

      <section className="bg-white rounded-[32px] p-5 shadow-sm border border-surface-line">
        <h2 className="font-black text-ink flex items-center gap-2"><Smartphone className="w-5 h-5 text-sky-600" /> Health Connect (Android)</h2>
        <p className="mt-1 text-xs text-ink-soft leading-relaxed">Pull steps, active calories, workouts and weight from your watch or fitness app (Fitbit, Samsung Health, Mi Fitness, Google Fit…) via Health Connect. Pair this phone with a one-time code.</p>
        <p className="mt-1 text-[11px] text-ink-soft leading-relaxed">Android 14 or newer has Health Connect built in. On Android 9–13 you also need the free <b>Health Connect</b> app from Google Play — Nura will point you to it.</p>
        {code ? (
          <div className="mt-3 rounded-2xl bg-surface border border-surface-line p-4 text-center">
            <div className="font-mono text-3xl font-black tracking-[0.3em]" aria-label="Pairing code">{code}</div>
            <p className="mt-1 text-[11px] text-ink-soft">Valid for 10 minutes · one use</p>
            <a href={`nura://pair?code=${code}`} className="mt-3 inline-block rounded-xl bg-brand text-white text-sm font-bold px-4 py-2">Connect in the Nura app</a>
          </div>
        ) : (
          <button onClick={makeCode} disabled={busy} className="mt-3 w-full rounded-2xl border-2 border-brand text-brand font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-60"><Link2 className="w-4 h-4" /> Create pairing code for {name}</button>
        )}
        {devices.length > 0 && (
          <ul className="mt-4 divide-y divide-surface-line">
            {devices.map((d) => (
              <li key={d.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="text-sm font-bold text-ink truncate">{d.label || "Paired phone"} → {personName(d.profileId)}</div><div className="text-[11px] text-ink-soft">Last sync: {ago(d.lastSeenAt)}</div></div>
                <button onClick={() => disconnect(d.id)} className="text-xs font-bold text-red-600 px-3 py-2 rounded-lg bg-red-50">Disconnect</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-[32px] p-5 shadow-sm border border-surface-line">
        <h2 className="font-black text-ink">Last 7 days</h2>
        {days.length === 0 && wks.length === 0 ? <p className="mt-2 text-sm text-ink-soft">Nothing yet. Log a workout or connect a device.</p> : (
          <ul className="mt-2 divide-y divide-surface-line">
            {[...days].sort((a, b) => b.day.localeCompare(a.day)).map((d) => (
              <li key={d.day + d.steps} className="py-2 flex justify-between text-sm"><span className="text-ink-soft">{d.day}</span><span className="font-bold">{d.steps.toLocaleString()} steps · {d.activeKcal} kcal</span></li>
            ))}
            {wks.map((w) => (
              <li key={w.id} className="py-2 flex items-center justify-between text-sm gap-2">
                <span className="min-w-0 truncate">{w.title || WORKOUT_KINDS.find((k) => k.kind === w.kind)?.label || "Workout"} · {w.minutes} min · {w.kcal} kcal<span className="text-ink-soft"> · {new Date(w.startedAt).toLocaleDateString([], { day: "numeric", month: "short" })}</span></span>
                {w.source === "manual" && <button onClick={() => delWorkout(w.id)} aria-label="Delete workout" className="text-ink-soft p-2"><Trash2 className="w-4 h-4" /></button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-[32px] p-5 shadow-sm border border-surface-line">
        <h2 className="font-black text-ink">Eat back activity calories</h2>
        {adult ? (
          <>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-ink-soft leading-relaxed">Show how many extra calories you can eat after exercise. Off by default; watches over-estimate, so only a share counts (max 500 kcal).</p>
              <button role="switch" aria-checked={settings.creditEnabled} aria-label="Eat back activity calories" onClick={() => saveSettings({ ...settings, creditEnabled: !settings.creditEnabled })} className={`relative w-12 h-7 rounded-full shrink-0 ${settings.creditEnabled ? "bg-brand" : "bg-surface-line"}`}><span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${settings.creditEnabled ? "translate-x-5" : ""}`} /></button>
            </div>
            {settings.creditEnabled && (
              <label className="mt-3 block text-xs font-medium text-ink-soft">Count {settings.creditPct}% of active calories
                <input type="range" min={10} max={100} step={10} value={settings.creditPct} onChange={(e) => setSettings({ ...settings, creditPct: Number(e.target.value) })} onPointerUp={() => saveSettings(settings)} onKeyUp={() => saveSettings(settings)} className="w-full accent-brand" />
              </label>
            )}
          </>
        ) : (
          <p className="mt-2 text-xs text-ink-soft leading-relaxed">Not available for under-18s. Children eat to grow and to fuel play, not to &ldquo;earn&rdquo; food, so Nura never ties meals to exercise for them.</p>
        )}
      </section>
    </div>
  );
}
