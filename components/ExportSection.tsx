"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import type { ProfileSummary } from "@/lib/access";

export default function ExportSection({ profiles, activeId }: { profiles: ProfileSummary[]; activeId: string }) {
  const [scope, setScope] = useState<string>("family"); // "family" or a profile id
  const [range, setRange] = useState<"all" | "90" | "30">("all");
  const [format, setFormat] = useState<"zip" | "json">("zip");
  const [photos, setPhotos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const download = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const q = new URLSearchParams({ format, range });
      if (scope !== "family") { q.set("scope", "profile"); q.set("profile", scope); }
      if (photos && format === "zip") q.set("photos", "1");
      if (/NuraApp\/\d/.test(navigator.userAgent)) {
        // Installed app: let the app's download manager save the file (blob downloads aren't supported in its web view).
        if (!navigator.onLine) throw new Error("Failed to fetch");
        window.location.href = `/api/export?${q}`;
        setMsg({ ok: true, text: "Your download has started. You'll see it in your notifications and in Downloads." });
        setBusy(false);
        return;
      }
      const res = await fetch(`/api/export?${q}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't build your export.");
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") || "")?.[1] || `nura-data.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMsg({ ok: true, text: `Downloaded ${name} (${blob.size > 1_000_000 ? (blob.size / 1_000_000).toFixed(1) + " MB" : Math.max(1, Math.round(blob.size / 1000)) + " KB"}). Check your Downloads folder.` });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message === "Failed to fetch" ? "You're offline. Connect to download your data." : e?.message || "Something went wrong." });
    }
    setBusy(false);
  };

  const chip = (on: boolean) => `px-3 py-2 rounded-full text-xs font-bold border ${on ? "bg-ink text-white border-ink" : "bg-white text-ink border-surface-line"}`;

  return (
    <section className="bg-white rounded-[28px] border border-surface-line shadow-sm p-5 mb-6" aria-label="Your data">
      <h2 className="font-display text-lg font-black tracking-tight">Your data</h2>
      <p className="text-xs font-medium text-ink-soft mb-4">It&apos;s yours. Download everything you&apos;ve logged, any time. Your password is never included.</p>

      <div className="text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2">Whose data</div>
      <div className="flex flex-wrap gap-2 mb-4">
        {profiles.length > 1 && <button onClick={() => setScope("family")} className={chip(scope === "family")}>Everyone</button>}
        {profiles.map((p) => <button key={p.id} onClick={() => setScope(p.id)} className={chip(scope === p.id || (profiles.length === 1 && scope === "family"))}>{p.isOwner ? "Me" : p.name}</button>)}
      </div>

      <div className="text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2">Period</div>
      <div className="flex gap-2 mb-4">
        {([["all", "All time"], ["90", "90 days"], ["30", "30 days"]] as const).map(([v, l]) => <button key={v} onClick={() => setRange(v)} className={chip(range === v)}>{l}</button>)}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={() => setFormat("zip")} className={`rounded-2xl border p-3 text-left ${format === "zip" ? "border-brand bg-brand/5" : "border-surface-line"}`}>
          <FileSpreadsheet className="w-5 h-5 mb-1 text-brand" /><div className="text-sm font-black">Spreadsheets</div><div className="text-[11px] font-medium text-ink-soft">CSV files in a .zip — opens in Excel / Sheets</div>
        </button>
        <button onClick={() => setFormat("json")} className={`rounded-2xl border p-3 text-left ${format === "json" ? "border-brand bg-brand/5" : "border-surface-line"}`}>
          <FileText className="w-5 h-5 mb-1 text-brand" /><div className="text-sm font-black">Complete data</div><div className="text-[11px] font-medium text-ink-soft">One JSON file, machine-readable</div>
        </button>
      </div>
      {format === "zip" && (
        <label className="flex items-center gap-2 text-sm font-medium text-ink mb-3">
          <input type="checkbox" checked={photos} onChange={(e) => setPhotos(e.target.checked)} className="w-4 h-4 accent-[#FC4C02]" />Include meal photos (bigger download)
        </label>
      )}

      <button onClick={download} disabled={busy} className="w-full py-3.5 rounded-[16px] bg-brand text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand/30 disabled:opacity-60">
        <Download className="w-5 h-5" />{busy ? "Preparing…" : "Download my data"}
      </button>
      {msg && <p role="status" className={`mt-3 text-xs font-bold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}

      <a href={`/report?days=30&profile=${scope === "family" ? activeId : scope}`} className="block text-center mt-4 text-sm font-bold text-brand">Printable summary for a doctor or dietitian →</a>
    </section>
  );
}
