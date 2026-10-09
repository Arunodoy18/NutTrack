"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, X } from "lucide-react";
import type { OfflineSyncState } from "@/lib/useOfflineSync";

/** Lightweight toast any component can trigger: window.dispatchEvent(new CustomEvent("nura:toast", {detail:"…"})) */
export function showToast(message: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nura:toast", { detail: message }));
}

const label = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const describe = (op: OfflineSyncState["ops"][number]) => {
  switch (op.kind) {
    case "meal_photo": return "Photo meal";
    case "meal_text": return op.text ? `“${op.text.slice(0, 40)}”` : "Described meal";
    case "meal_barcode": return `Barcode ${op.barcode ?? ""}`.trim();
    case "meal_delete": return "Delete a meal";
    case "meal_edit": return "Meal change";
    case "fridge_photo": return "Fridge photo";
    default: return op.meal?.name || "Meal";
  }
};

export default function OfflineStatusBar({ sync }: { sync: OfflineSyncState }) {
  const { pending, failed, online, syncing, justSynced } = sync;
  const [toast, setToast] = useState<string | null>(null);
  const [showFailed, setShowFailed] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handler = (e: Event) => {
      setToast(String((e as CustomEvent).detail ?? ""));
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 3500);
    };
    window.addEventListener("nura:toast", handler);
    return () => {
      window.removeEventListener("nura:toast", handler);
      clearTimeout(timer);
    };
  }, []);

  let banner: React.ReactNode = null;
  if (!online) {
    banner = (
      <div className="bg-amber-500 text-white" role="status">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center gap-2 text-xs font-bold">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span className="flex-1">
            You&apos;re offline
            {pending.length > 0 ? ` · ${label(pending.length, "item", "items")} saved on this phone` : " · you can still log meals manually"}
          </span>
        </div>
      </div>
    );
  } else if (syncing && pending.length > 0) {
    banner = (
      <div className="bg-sky-600 text-white" role="status">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center gap-2 text-xs font-bold">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>Syncing {label(pending.length, "item", "items")}…</span>
        </div>
      </div>
    );
  } else if (justSynced) {
    banner = (
      <div className="bg-emerald-600 text-white" role="status">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>All caught up — everything you saved offline is synced</span>
        </div>
      </div>
    );
  } else if (pending.length > 0) {
    banner = (
      <button onClick={() => sync.flushNow()} className="w-full bg-sky-600 text-white text-left" role="status">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center gap-2 text-xs font-bold">
          <RefreshCw className="w-4 h-4 shrink-0" />
          <span className="flex-1">{label(pending.length, "item", "items")} waiting to sync · tap to retry</span>
        </div>
      </button>
    );
  }

  return (
    <>
      <div className="fixed top-0 inset-x-0 z-[95]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {banner}
        {failed.length > 0 && (
          <div className="bg-red-600 text-white">
            <button
              onClick={() => setShowFailed((v) => !v)}
              className="w-full max-w-lg mx-auto px-4 py-2 flex items-center gap-2 text-xs font-bold text-left"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label(failed.length, "item", "items")} couldn&apos;t be saved · tap to review</span>
            </button>
            {showFailed && (
              <ul className="max-w-lg mx-auto px-4 pb-3 space-y-2">
                {failed.map((op) => (
                  <li key={op.id} className="bg-white/15 rounded-xl p-3 text-xs">
                    <div className="font-black">{describe(op)}</div>
                    <div className="opacity-90 mb-2">{op.lastError || "Something went wrong."}</div>
                    <div className="flex gap-2">
                      <button onClick={() => sync.retry(op.id)} className="px-3 py-1.5 rounded-lg bg-white text-red-600 font-bold">
                        Retry
                      </button>
                      <button onClick={() => sync.discard(op.id)} className="px-3 py-1.5 rounded-lg bg-white/20 font-bold">
                        Discard
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[96] max-w-[90%] bg-ink text-white text-sm font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2"
          style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}
          role="status"
        >
          <span>{toast}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss">
            <X className="w-4 h-4 opacity-70" />
          </button>
        </div>
      )}
    </>
  );
}
