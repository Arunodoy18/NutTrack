"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, BellOff, Check, Smartphone } from "lucide-react";
import { DEFAULT_SETTINGS, MEAL_SLOTS, type MealSlot, type ReminderSettings } from "@/lib/reminders";

const MEAL_LABEL: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const INTERVALS = [{ v: 60, l: "Every hour" }, { v: 90, l: "Every 1½ hours" }, { v: 120, l: "Every 2 hours" }, { v: 180, l: "Every 3 hours" }, { v: 240, l: "Every 4 hours" }];

function urlBase64ToUint8Array(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${on ? "bg-brand" : "bg-surface-line"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

const timeCls = "bg-surface-muted rounded-xl px-3 py-2 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-brand";

export default function ReminderSettingsClient() {
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const [devices, setDevices] = useState(0);
  const [pushConfigured, setPushConfigured] = useState(true);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [thisDeviceOn, setThisDeviceOn] = useState(false);
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const dirty = useRef(false);

  // Inside the installed Android app notifications are native (the app polls /api/device/due); no web push.
  const inApp = typeof navigator !== "undefined" && /NuraApp\/\d/.test(navigator.userAgent);
  const [linkedNow, setLinkedNow] = useState(typeof window !== "undefined" && (window as any).__nuraLinked === true);
  useEffect(() => { const f = () => setLinkedNow(true); window.addEventListener("nura:linked", f); return () => window.removeEventListener("nura:linked", f); }, []);
  const appLinked = inApp && (typeof window !== "undefined" && typeof (window as any).__nuraLinked === "boolean" ? (window as any).__nuraLinked || linkedNow : linkedNow || /\blinked\b/.test(navigator.userAgent));
  const supported = inApp || typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  const refreshDevice = useCallback(async () => {
    if (inApp) { setPerm("granted"); setThisDeviceOn(appLinked); return; }
    if (!supported) { setPerm("unsupported"); return; }
    setPerm(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      setThisDeviceOn(!!(await reg?.pushManager.getSubscription()));
    } catch { setThisDeviceOn(false); }
  }, [supported, inApp, appLinked]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/reminders");
        const j = await r.json();
        if (j.success) {
          setEnabled(j.enabled); setSettings(j.settings); setDevices(j.devices);
          setPushConfigured(j.pushConfigured); setPublicKey(j.publicKey);
        }
      } catch { setMsg("Couldn't load your settings. Check your connection."); }
      await refreshDevice();
      setLoaded(true);
    })();
  }, [refreshDevice]);

  const save = useCallback((nextEnabled: boolean, nextSettings: ReminderSettings) => {
    dirty.current = true;
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/reminders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: nextEnabled, settings: nextSettings, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        });
        if (!res.ok) throw new Error();
        setStatus("saved");
        setTimeout(() => setStatus((s) => (s === "saved" ? "" : s)), 1800);
      } catch { setStatus("error"); }
    }, 500);
  }, []);

  const update = (patch: (s: ReminderSettings) => ReminderSettings) => {
    const next = patch(settings);
    setSettings(next);
    save(enabled, next);
  };

  const subscribeThisDevice = async (): Promise<boolean> => {
    if (!supported) { setMsg("This browser can't receive notifications."); return false; }
    if (!publicKey) { setMsg("Notifications aren't set up on the server yet."); return false; }
    try {
      const p = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      setPerm(p);
      if (p !== "granted") { setMsg("Notifications are blocked. Allow them for Nura in your phone's settings, then try again."); return false; }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't register this phone");
      setThisDeviceOn(true); setDevices((d) => d + (thisDeviceOn ? 0 : 1)); setMsg("");
      return true;
    } catch (e: any) {
      setMsg(e?.message || "Couldn't turn on notifications for this phone.");
      return false;
    }
  };

  const toggleMaster = async (on: boolean) => {
    setBusy(true);
    setMsg("");
    if (on && inApp) { window.location.href = "nura://notifications"; }
    else if (on && pushConfigured && !thisDeviceOn) {
      const ok = await subscribeThisDevice();
      if (!ok) { setBusy(false); return; }
    }
    setEnabled(on);
    save(on, settings);
    setBusy(false);
  };

  const sendTest = async () => {
    setBusy(true); setMsg("");
    if (inApp) { window.location.href = "nura://test"; setMsg("A test notification should appear in a moment. If not, allow notifications for Nura in your phone's settings."); setBusy(false); return; }
    try {
      if (!thisDeviceOn) await subscribeThisDevice();
      const res = await fetch("/api/push/test", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      setMsg(res.ok && j.success ? `Sent to ${j.sent} device${j.sent === 1 ? "" : "s"} — it should arrive in a few seconds.` : j.error || "Couldn't send a test.");
    } catch { setMsg("You appear to be offline."); }
    setBusy(false);
  };

  if (!loaded) return <div className="py-24 text-center text-sm font-bold text-ink-soft">Loading…</div>;

  return (
    <div>
      <Link href="/profile" className="inline-flex items-center gap-2 text-ink-soft hover:text-ink mb-6">
        <ArrowLeft className="w-5 h-5" /><span className="font-bold text-sm">Profile</span>
      </Link>
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-brand uppercase">Stay on track</div>
          <h1 className="font-display text-[32px] font-black tracking-tight leading-none">Reminders</h1>
        </div>
        <span className={`text-xs font-bold mt-2 ${status === "error" ? "text-red-500" : "text-ink-soft"}`} role="status">
          {status === "saving" ? "Saving…" : status === "saved" ? <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="w-3.5 h-3.5" />Saved</span> : status === "error" ? "Couldn't save" : ""}
        </span>
      </div>
      <p className="text-sm font-medium text-ink-soft mb-5">Gentle nudges for meals, water and weigh-ins — never while you&apos;ve just eaten, and never at night.</p>

      {/* Master */}
      <div className="bg-white rounded-[28px] p-5 border border-surface-line shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${enabled ? "bg-brand/10 text-brand" : "bg-surface-muted text-ink-soft"}`}>
            {enabled ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <div className="font-black text-ink">Notifications</div>
            <div className="text-xs font-medium text-ink-soft">{enabled ? "On" : "Off"}</div>
          </div>
          <Switch on={enabled} onChange={toggleMaster} label="Turn reminders on or off" />
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-ink-soft">
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>
            {perm === "unsupported" ? "This browser can't receive notifications."
              : perm === "denied" ? "Blocked in your phone's settings for this app."
              : thisDeviceOn ? `This phone is connected${devices > 1 ? ` · ${devices} devices in total` : ""}.`
              : "This phone isn't connected yet — turn on Notifications above."}
          </span>
        </div>
        {!pushConfigured && !inApp && (
          <p className="mt-3 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Your times are saved, but notifications aren&apos;t switched on for the app yet. They&apos;ll start arriving as soon as that&apos;s done on the server.
          </p>
        )}
        {msg && <p className="mt-3 text-xs font-bold text-ink bg-surface-muted rounded-xl p-3" role="status">{msg}</p>}
      </div>

      <div className={enabled ? "" : "opacity-50 pointer-events-none"} aria-disabled={!enabled}>
        {/* Meals */}
        <h2 className="text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2 ml-1">Meals</h2>
        <div className="bg-white rounded-[28px] border border-surface-line shadow-sm divide-y divide-surface-line mb-4">
          {MEAL_SLOTS.map((slot) => (
            <div key={slot} className="flex items-center gap-3 p-4">
              <span className="flex-1 font-bold text-ink">{MEAL_LABEL[slot]}</span>
              {settings.meals[slot] && (
                <input type="time" value={settings.meals[slot]!} aria-label={`${MEAL_LABEL[slot]} reminder time`} className={timeCls}
                  onChange={(e) => e.target.value && update((s) => ({ ...s, meals: { ...s.meals, [slot]: e.target.value } }))} />
              )}
              <Switch on={!!settings.meals[slot]} label={`${MEAL_LABEL[slot]} reminder`}
                onChange={(v) => update((s) => ({ ...s, meals: { ...s.meals, [slot]: v ? DEFAULT_SETTINGS.meals[slot] : null } }))} />
            </div>
          ))}
        </div>

        {/* Water */}
        <h2 className="text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2 ml-1">Water</h2>
        <div className="bg-white rounded-[28px] border border-surface-line shadow-sm p-4 mb-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex-1 font-bold text-ink">Drink water reminders</span>
            <Switch on={settings.water.enabled} label="Water reminders" onChange={(v) => update((s) => ({ ...s, water: { ...s.water, enabled: v } }))} />
          </div>
          {settings.water.enabled && (
            <>
              <select value={settings.water.everyMin} aria-label="How often" className={`${timeCls} w-full`}
                onChange={(e) => update((s) => ({ ...s, water: { ...s.water, everyMin: Number(e.target.value) } }))}>
                {INTERVALS.map((i) => <option key={i.v} value={i.v}>{i.l}</option>)}
              </select>
              <div className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                <span>Between</span>
                <input type="time" value={settings.water.from} aria-label="Start time" className={timeCls} onChange={(e) => e.target.value && update((s) => ({ ...s, water: { ...s.water, from: e.target.value } }))} />
                <span>and</span>
                <input type="time" value={settings.water.to} aria-label="End time" className={timeCls} onChange={(e) => e.target.value && update((s) => ({ ...s, water: { ...s.water, to: e.target.value } }))} />
              </div>
              <p className="text-[11px] font-medium text-ink-faint">Skipped automatically if you just had a drink or you&apos;ve hit today&apos;s goal.</p>
            </>
          )}
        </div>

        {/* Weigh-in */}
        <h2 className="text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2 ml-1">Weigh-in</h2>
        <div className="bg-white rounded-[28px] border border-surface-line shadow-sm p-4 mb-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex-1 font-bold text-ink">Weekly weigh-in</span>
            <Switch on={settings.weighIn.enabled} label="Weekly weigh-in reminder" onChange={(v) => update((s) => ({ ...s, weighIn: { ...s.weighIn, enabled: v } }))} />
          </div>
          {settings.weighIn.enabled && (
            <div className="flex gap-2">
              <select value={settings.weighIn.day} aria-label="Day" className={`${timeCls} flex-1`} onChange={(e) => update((s) => ({ ...s, weighIn: { ...s.weighIn, day: Number(e.target.value) } }))}>
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
              <input type="time" value={settings.weighIn.time} aria-label="Time" className={timeCls} onChange={(e) => e.target.value && update((s) => ({ ...s, weighIn: { ...s.weighIn, time: e.target.value } }))} />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={sendTest}
        disabled={busy || !pushConfigured}
        className="w-full py-3.5 rounded-[18px] border-2 border-surface-line bg-white text-ink font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        {busy ? "Working…" : "Send a test notification"}
      </button>
    </div>
  );
}
