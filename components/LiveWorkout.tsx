"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Footprints, Flame, Timer, Route, Play, Square } from "lucide-react";
import { WORKOUT_KINDS, liveWorkoutStats, type WorkoutKind } from "@/lib/activity";
import { showToast } from "@/components/OfflineStatusBar";

interface Native { workoutStart(): string; workoutState(): string; workoutStop(): string }
interface NativeState { available?: boolean; running?: boolean; permission?: boolean; asking?: boolean; startedAt?: number; steps?: number; sensorReady?: boolean }

const KEY = "nura_workout_kind";
const getNative = (): Native | null => {
  const n = typeof window !== "undefined" ? (window as unknown as { NuraNative?: Partial<Native> }).NuraNative : undefined;
  return n && typeof n.workoutState === "function" ? (n as Native) : null;
};
const read = (raw: string): NativeState => { try { return JSON.parse(raw) as NativeState; } catch { return {}; } };
const clock = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Start a workout, carry the phone, and watch steps + calories climb. Saved to the log when you stop. */
export default function LiveWorkout({ weightKg, heightCm, onSaved }: { weightKg: number | null; heightCm: number | null; onSaved: () => void }) {
  const [native, setNative] = useState<Native | null>(null);
  const [st, setSt] = useState<NativeState>({});
  const [kind, setKind] = useState<WorkoutKind>("walking");
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const asked = useRef(false);

  const refresh = useCallback((n: Native) => { const s = read(n.workoutState()); setSt(s); return s; }, []);

  useEffect(() => {
    const n = getNative();
    setNative(n);
    if (!n) return;
    try { const k = localStorage.getItem(KEY) as WorkoutKind | null; if (k && WORKOUT_KINDS.some((w) => w.kind === k)) setKind(k); } catch { /* private mode */ }
    refresh(n);
  }, [refresh]);

  // While running (or waiting for the permission prompt) read the step sensor every second.
  const live = !!native && (st.running || asked.current);
  useEffect(() => {
    if (!native || !live) return;
    const t = setInterval(() => {
      setNow(Date.now());
      const s = refresh(native);
      if (!s.running && !s.asking) { asked.current = false; if (s.permission === false) setNote("Nura needs the Physical activity permission to count steps. Allow it in Settings → Apps → Nura → Permissions."); }
    }, 1000);
    return () => clearInterval(t);
  }, [native, live, refresh]);

  if (!native) return null; // not inside the Nura app (or an older app version): manual logging below still works
  if (st.available === false) {
    return <section className="bg-white rounded-[32px] p-5 shadow-sm border border-surface-line"><h2 className="font-black text-ink flex items-center gap-2"><Footprints className="w-5 h-5 text-emerald-600" /> Live workout</h2><p className="mt-2 text-xs text-ink-soft leading-relaxed">This phone has no step sensor, so Nura can&apos;t count steps live. You can still log a workout below, or connect a watch or ring through Health Connect.</p></section>;
  }

  const running = !!st.running;
  const seconds = running && st.startedAt ? Math.max(0, Math.round((now - st.startedAt) / 1000)) : 0;
  const stats = liveWorkoutStats({ kind, steps: st.steps ?? 0, seconds, weightKg: weightKg ?? 60, heightCm });
  const stepKind = kind === "walking" || kind === "running";

  const start = () => {
    setNote("");
    try { localStorage.setItem(KEY, kind); } catch { /* ignore */ }
    asked.current = true;
    setSt(read(native.workoutStart()));
    setNow(Date.now());
  };

  const stop = async () => {
    const final = read(native.workoutStop());
    asked.current = false;
    const secs = final.startedAt ? Math.round((Date.now() - final.startedAt) / 1000) : seconds;
    setSt({ ...st, running: false });
    if (secs < 60) { showToast("Too short to save (under a minute)"); return; }
    const minutes = Math.max(1, Math.round(secs / 60));
    setBusy(true);
    const r = await fetch("/api/activity/workout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, minutes, steps: final.steps ?? 0, startedAt: new Date(final.startedAt ?? Date.now() - secs * 1000).toISOString() }) }).catch(() => null);
    setBusy(false);
    if (!r || !r.ok) { showToast((r && (await r.json().catch(() => ({}))).error) || "Couldn't save the workout. Check your connection."); return; }
    const d = await r.json().catch(() => ({}));
    showToast(`Saved: ${(final.steps ?? 0).toLocaleString()} steps · ${d.kcal ?? stats.kcal} kcal`);
    onSaved();
  };

  return (
    <section className="bg-white rounded-[32px] p-5 shadow-sm border border-surface-line" aria-label="Live workout">
      <h2 className="font-black text-ink flex items-center gap-2"><Footprints className="w-5 h-5 text-emerald-600" /> Live workout</h2>
      {!running ? (
        <>
          <p className="mt-1 text-xs text-ink-soft leading-relaxed">Keep your phone with you (hand, pocket or bag). Nura counts your steps and works out calories as you go.</p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value as WorkoutKind)} className="w-full min-w-0 rounded-xl border border-surface-line bg-surface px-3 py-3 text-sm font-medium" aria-label="Workout type">
              {WORKOUT_KINDS.map((w) => <option key={w.kind} value={w.kind}>{w.label}</option>)}
            </select>
            <button onClick={start} className="w-full rounded-2xl bg-brand text-white font-bold py-3 flex items-center justify-center gap-2 shadow-lg shadow-brand/30 active:scale-[0.98] transition-transform"><Play className="w-4 h-4" /> Start workout</button>
          </div>
          {note && <p className="mt-3 text-xs font-medium text-red-600 leading-relaxed">{note}</p>}
        </>
      ) : (
        <>
          <div className="mt-4 text-center">
            <div className="text-[11px] font-black tracking-widest text-ink-soft uppercase">{WORKOUT_KINDS.find((w) => w.kind === kind)?.label} in progress</div>
            <div className="font-display text-5xl font-black text-ink tabular-nums mt-1" aria-live="off">{clock(seconds)}</div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="min-w-0 rounded-2xl bg-emerald-50 px-1 py-3"><Footprints className="w-4 h-4 mx-auto text-emerald-600" /><div className="mt-1 text-xl font-black text-ink tabular-nums truncate">{stats.steps.toLocaleString()}</div><div className="text-[10px] font-bold tracking-widest text-ink-soft uppercase">Steps</div></div>
            <div className="min-w-0 rounded-2xl bg-orange-50 px-1 py-3"><Flame className="w-4 h-4 mx-auto text-orange-500" /><div className="mt-1 text-xl font-black text-ink tabular-nums truncate">{stats.kcal}</div><div className="text-[10px] font-bold tracking-widest text-ink-soft uppercase">kcal</div></div>
            <div className="min-w-0 rounded-2xl bg-sky-50 px-1 py-3"><Route className="w-4 h-4 mx-auto text-sky-600" /><div className="mt-1 text-xl font-black text-ink tabular-nums truncate">{stats.distanceKm.toFixed(2)}</div><div className="text-[10px] font-bold tracking-widest text-ink-soft uppercase">km</div></div>
          </div>
          <p className="mt-3 text-[11px] text-ink-soft text-center leading-relaxed"><Timer className="inline w-3 h-3 -mt-0.5 mr-1" />{stats.speedKmh} km/h{stepKind ? ` · from your steps, height and weight${weightKg ? "" : " (add your weight in Profile for a closer figure)"}` : " · calories from time and the activity you chose"}</p>
          <button onClick={stop} disabled={busy} className="mt-4 w-full rounded-2xl bg-ink text-white font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform"><Square className="w-4 h-4" /> {busy ? "Saving…" : "Finish & save"}</button>
          <p className="mt-3 text-[11px] text-ink-faint text-center leading-relaxed">You can close Nura or lock the screen. Steps keep counting; open Nura again to finish.</p>
        </>
      )}
    </section>
  );
}
