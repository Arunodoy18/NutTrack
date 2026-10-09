"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

const AVATARS = ["🙂", "😎", "🧒", "👧", "👦", "👩", "👨", "🧓", "🐻", "🦊", "🐼", "🦁"];
const RELATIONS: { value: string; label: string }[] = [
  { value: "child", label: "Child" },
  { value: "partner", label: "Partner" },
  { value: "parent", label: "Parent" },
  { value: "other", label: "Other" },
];

/** Bottom sheet to add a family member. On success it jumps to setup for that person. */
export default function AddMemberSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("child");
  const [avatar, setAvatar] = useState("🧒");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), relation, avatar }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Couldn't add that person.");
      window.location.assign("/setup"); // full navigation: fresh server state for the new profile
    } catch (e: any) {
      setError(
        e?.message === "Failed to fetch" ? "You're offline. Connect to add a family member." : e?.message || "Something went wrong."
      );
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-[32px] sm:rounded-[32px] p-6 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Add a family member"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-black tracking-tight text-ink">Add family member</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-surface-muted text-ink-soft" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2 ml-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="e.g. Aarav"
          className="w-full bg-surface-muted rounded-[16px] px-4 py-3 text-base font-bold text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-brand mb-4"
        />

        <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2 ml-1">Who is this?</label>
        <div className="flex gap-2 mb-4">
          {RELATIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => {
                setRelation(r.value);
                setAvatar(r.value === "child" ? "🧒" : "🙂");
              }}
              className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all border ${
                relation === r.value ? "border-brand bg-brand/5 text-brand" : "border-surface-line bg-surface-muted text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <label className="block text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2 ml-1">Avatar</label>
        <div className="grid grid-cols-6 gap-2 mb-5">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAvatar(a)}
              className={`aspect-square rounded-2xl text-2xl flex items-center justify-center border transition-all ${
                avatar === a ? "border-brand bg-brand/5" : "border-surface-line bg-surface-muted"
              }`}
              aria-label={`Avatar ${a}`}
            >
              {a}
            </button>
          ))}
        </div>

        {error && <p className="text-sm font-bold text-red-500 mb-3">{error}</p>}

        <button
          onClick={create}
          disabled={!name.trim() || saving}
          className={`w-full py-3.5 rounded-[16px] font-bold text-base transition-all ${
            name.trim() && !saving ? "bg-brand text-white shadow-lg shadow-brand/30 active:scale-[0.98]" : "bg-surface-muted text-ink-faint"
          }`}
        >
          {saving ? "Adding…" : "Continue to set up"}
        </button>
        <p className="text-[11px] text-ink-faint font-medium text-center mt-3 leading-snug">
          You&apos;ll enter their age, height and weight next, so their targets are right for them.
        </p>
      </div>
    </div>
  );
}
