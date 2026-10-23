"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Bug, Lightbulb, MessageCircle } from "lucide-react";

const CATS = [{ id: "bug", label: "Something broke", icon: Bug }, { id: "idea", label: "An idea", icon: Lightbulb }, { id: "other", label: "Something else", icon: MessageCircle }] as const;

export default function FeedbackForm() {
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("bug");
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  const send = async () => {
    setState("sending"); setErr("");
    try {
      const r = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ category: cat, message: text, screen: document.referrer ? new URL(document.referrer).pathname : "" }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Couldn't send that.");
      setState("done"); setText("");
    } catch (e: any) {
      setState("error"); setErr(e?.message === "Failed to fetch" ? "You're offline. Connect and try again." : e?.message || "Couldn't send that.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/profile" aria-label="Back" className="w-10 h-10 rounded-full bg-white border border-surface-line flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></Link>
        <div><h1 className="font-display text-2xl font-black">Send feedback</h1><p className="text-xs font-medium text-ink-soft">Nura is in testing. Tell us what you see.</p></div>
      </div>
      {state === "done" ? (
        <div className="bg-white rounded-[28px] border border-surface-line p-6 text-center" role="status">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><Check className="w-6 h-6" /></div>
          <h2 className="mt-3 font-black">Thank you!</h2>
          <p className="mt-1 text-sm text-ink-soft">We read every message.</p>
          <button onClick={() => setState("idle")} className="mt-4 rounded-2xl bg-ink text-white font-bold px-5 py-3 text-sm">Send another</button>
        </div>
      ) : (
        <div className="bg-white rounded-[28px] border border-surface-line p-5">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type of feedback">
            {CATS.map(({ id, label, icon: Icon }) => (
              <button key={id} role="radio" aria-checked={cat === id} onClick={() => setCat(id)} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-bold ${cat === id ? "bg-ink text-white border-ink" : "bg-white text-ink border-surface-line"}`}><Icon className="w-4 h-4" aria-hidden />{label}</button>
            ))}
          </div>
          <label className="mt-4 block text-xs font-bold text-ink-soft" htmlFor="fb">{cat === "bug" ? "What happened, and what did you expect?" : "Your message"}</label>
          <textarea id="fb" value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={6} placeholder={cat === "bug" ? "e.g. I scanned a barcode and the app froze…" : "Write here…"} className="mt-1 w-full rounded-2xl bg-surface-muted p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-brand" />
          <div className="mt-1 text-right text-[11px] text-ink-soft">{text.length}/2000</div>
          {state === "error" && <p className="mt-2 text-sm font-bold text-red-600" role="alert">{err}</p>}
          <button onClick={send} disabled={state === "sending" || text.trim().length < 3} className="mt-3 w-full rounded-2xl bg-brand text-white font-bold py-3.5 disabled:opacity-50">{state === "sending" ? "Sending…" : "Send"}</button>
          <p className="mt-3 text-[11px] text-ink-soft">We attach your account email and app version so we can follow up. Please don't include passwords.</p>
        </div>
      )}
    </div>
  );
}
