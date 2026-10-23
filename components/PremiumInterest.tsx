"use client";

import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";

/** Premium is not on sale yet. This tells us how many people want it, without charging or collecting anything new. */
export default function PremiumInterest() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  useEffect(() => { try { if (localStorage.getItem("nura_premium_interest") === "1") setState("done"); } catch { /* private mode */ } }, []);

  const tell = async () => {
    setState("sending");
    try {
      const r = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ category: "premium", message: "Wants to be told when Premium (unlimited AI scans) launches", screen: "/profile" }) });
      if (!r.ok) throw new Error();
      try { localStorage.setItem("nura_premium_interest", "1"); } catch { /* ignore */ }
      setState("done");
    } catch { setState("error"); }
  };

  if (state === "done") return <p className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-bold" role="status"><Check className="h-4 w-4" aria-hidden /> You&apos;re on the list</p>;
  return (
    <div>
      <p className="mb-2 text-sm font-bold">Premium, with unlimited AI scans, is coming soon.</p>
      <button onClick={tell} disabled={state === "sending"} className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand shadow-sm disabled:opacity-60">{state === "sending" ? "Saving…" : "Tell me when it's ready"}</button>
      {state === "error" && <p className="mt-2 text-xs font-bold text-white" role="alert">Couldn&apos;t save that. Check your connection and try again.</p>}
    </div>
  );
}
