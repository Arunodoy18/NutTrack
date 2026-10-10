"use client";

import React, { useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import type { ProfileSummary } from "@/lib/access";
import AddMemberSheet from "@/components/AddMemberSheet";

const MAX_PROFILES = 6;

export const profileEmoji = (p: Pick<ProfileSummary, "avatar" | "name">) => p.avatar || (p.name || "?").charAt(0).toUpperCase();

/** Chip in the header showing who is being tracked; opens a sheet to switch or add family members. */
export default function ProfileSwitcher({ profiles, activeId }: { profiles: ProfileSummary[]; activeId: string }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState("");
  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];
  if (!active) return null;

  const switchTo = async (id: string) => {
    if (id === activeId) {
      setOpen(false);
      return;
    }
    setSwitching(id);
    setError("");
    try {
      const res = await fetch("/api/profiles/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Couldn't switch profile.");
      window.location.assign("/dashboard"); // full reload so every screen and cache re-reads for the new person
    } catch (e: any) {
      setError(e?.message === "Failed to fetch" ? "You're offline. Reconnect to switch profiles." : e?.message || "Something went wrong.");
      setSwitching(null);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-white border border-surface-line shadow-sm active:scale-[0.98] transition-transform"
        aria-label={`Tracking ${active.name}. Switch profile`}
      >
        <span className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-lg leading-none">{profileEmoji(active)}</span>
        <span className="text-sm font-black text-ink max-w-[140px] truncate">{active.name}</span>
        <ChevronDown className="w-4 h-4 text-ink-soft" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full sm:max-w-sm max-h-[88vh] overflow-y-auto bg-white rounded-t-[32px] sm:rounded-[32px] p-5 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Choose who to track">
            <h2 className="font-display text-2xl font-black tracking-tight text-ink mb-1 px-1">Who are you tracking?</h2>
            <p className="text-xs font-medium text-ink-soft mb-4 px-1">Each person gets their own targets, meals and insights.</p>

            <ul className="space-y-2 mb-3">
              {profiles.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => switchTo(p.id)}
                    disabled={!!switching}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                      p.id === activeId ? "border-brand bg-brand/5" : "border-surface-line bg-surface-muted"
                    }`}
                  >
                    <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-2xl leading-none shadow-sm">{profileEmoji(p)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-black text-ink truncate">{p.name}</span>
                      <span className="block text-xs font-medium text-ink-soft">
                        {p.isOwner ? "You" : p.relation ? p.relation.charAt(0).toUpperCase() + p.relation.slice(1) : "Family"}
                        {p.age != null ? ` · ${p.age} yrs` : ""}
                        {!p.profileComplete ? " · setup needed" : ""}
                      </span>
                    </span>
                    {switching === p.id ? (
                      <span className="text-xs font-bold text-ink-soft">Switching…</span>
                    ) : p.id === activeId ? (
                      <Check className="w-5 h-5 text-brand" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>

            {error && <p className="text-sm font-bold text-red-500 mb-2 px-1">{error}</p>}

            <button
              onClick={() => {
                setOpen(false);
                setAdding(true);
              }}
              disabled={profiles.length >= MAX_PROFILES}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[16px] border-2 border-dashed border-surface-line text-ink font-bold text-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {profiles.length >= MAX_PROFILES ? `Limit of ${MAX_PROFILES} reached` : "Add family member"}
            </button>
          </div>
        </div>
      )}

      {adding && <AddMemberSheet onClose={() => setAdding(false)} />}
    </>
  );
}
