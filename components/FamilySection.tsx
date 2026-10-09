"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ProfileSummary } from "@/lib/access";
import AddMemberSheet from "@/components/AddMemberSheet";
import { profileEmoji } from "@/components/ProfileSwitcher";
import { clearOutbox } from "@/lib/offlineQueue";

const MAX_PROFILES = 6;

export default function FamilySection({ profiles, activeId }: { profiles: ProfileSummary[]; activeId: string }) {
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const act = async (id: string, kind: "switch" | "remove") => {
    setBusy(id);
    setError("");
    try {
      const res =
        kind === "switch"
          ? await fetch("/api/profiles/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
          : await fetch(`/api/profiles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Something went wrong.");
      window.location.assign(kind === "switch" ? "/profile" : "/dashboard");
    } catch (e: any) {
      setError(e?.message === "Failed to fetch" ? "You're offline. Reconnect and try again." : e?.message || "Something went wrong.");
      setBusy(null);
    }
  };

  const active = profiles.find((p) => p.id === activeId);

  return (
    <section className="mb-6" aria-label="Family">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase">Family</h2>
        {active && (
          <Link href="/setup?edit=1" className="flex items-center gap-1 text-xs font-bold text-brand">
            <Pencil className="w-3.5 h-3.5" />
            Edit {active.isOwner ? "my" : `${active.name}'s`} details
          </Link>
        )}
      </div>

      <ul className="space-y-2">
        {profiles.map((p) => (
          <li key={p.id} className={`bg-white rounded-[24px] border p-3 flex items-center gap-3 shadow-sm ${p.id === activeId ? "border-brand" : "border-surface-line"}`}>
            <span className="w-11 h-11 rounded-full bg-surface-muted flex items-center justify-center text-2xl leading-none">{profileEmoji(p)}</span>
            <div className="flex-1 min-w-0">
              <div className="font-black text-ink truncate">{p.name}</div>
              <div className="text-xs font-medium text-ink-soft">
                {p.isOwner ? "You" : p.relation ? p.relation.charAt(0).toUpperCase() + p.relation.slice(1) : "Family"}
                {p.age != null ? ` · ${p.age} yrs` : ""}
              </div>
            </div>

            {confirmId === p.id ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setConfirmId(null)} className="px-3 py-2 rounded-xl text-xs font-bold bg-surface-muted text-ink-soft">
                  Keep
                </button>
                <button
                  onClick={async () => {
                    await clearOutbox(); // drop anything queued for them on this device
                    act(p.id, "remove");
                  }}
                  disabled={busy === p.id}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500 text-white disabled:opacity-60"
                >
                  {busy === p.id ? "Removing…" : "Remove"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {p.id !== activeId && (
                  <button onClick={() => act(p.id, "switch")} disabled={!!busy} className="px-3 py-2 rounded-xl text-xs font-bold bg-brand/10 text-brand disabled:opacity-60">
                    {busy === p.id ? "…" : "Switch"}
                  </button>
                )}
                {!p.isOwner && (
                  <button onClick={() => setConfirmId(p.id)} className="p-2 rounded-xl text-ink-faint hover:text-red-500 hover:bg-red-50" aria-label={`Remove ${p.name}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {confirmId && (
        <p className="text-xs font-medium text-red-500 mt-2 px-1">
          Removing a person deletes all their meals and history. This can&apos;t be undone.
        </p>
      )}
      {error && <p className="text-sm font-bold text-red-500 mt-2 px-1">{error}</p>}

      <button
        onClick={() => setAdding(true)}
        disabled={profiles.length >= MAX_PROFILES}
        className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 rounded-[20px] border-2 border-dashed border-surface-line text-ink font-bold text-sm disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        {profiles.length >= MAX_PROFILES ? `Limit of ${MAX_PROFILES} people reached` : "Add family member"}
      </button>

      {adding && <AddMemberSheet onClose={() => setAdding(false)} />}
    </section>
  );
}
