"use client";

import { listOps, removeOp, updateOp } from "./offlineQueue";
import { saveFridgeResult } from "./fridgeResults";
import type { OutboxOp, SyncResponse } from "./offlineTypes";

const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 70_000;

export interface FlushResult {
  synced: number;
  /** The items that were just confirmed by the server (for seamless UI hand-over). */
  syncedOps: OutboxOp[];
  failed: number;
  remaining: number;
  /** True when we stopped because the network is unreachable. */
  offline: boolean;
  skipped?: boolean;
}

/** Exponential backoff between retries of the same op: 5s, 10s, 20s … capped at 10 min. */
function readyToRetry(op: OutboxOp, now: number) {
  if (!op.lastAttemptAt || op.attempts === 0) return true;
  const wait = Math.min(5_000 * 2 ** (op.attempts - 1), 600_000);
  return now - op.lastAttemptAt >= wait;
}

async function postOp(op: OutboxOp): Promise<{ res: SyncResponse; http: number } | "network"> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch("/api/offline/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op }),
      signal: ctrl.signal,
      credentials: "same-origin",
    });
    const res = (await r.json().catch(() => ({ status: "retry" }))) as SyncResponse;
    return { res, http: r.status };
  } catch {
    return "network";
  } finally {
    clearTimeout(timer);
  }
}

async function flushInner(userId: string, force: boolean, onOp?: (op: OutboxOp) => void): Promise<FlushResult> {
  let synced = 0;
  const syncedOps: OutboxOp[] = [];
  let failed = 0;
  let offline = false;
  const ops = (await listOps(userId)).filter((o) => o.status === "pending");

  for (const op of ops) {
    const now = Date.now();
    if (!force && !readyToRetry(op, now)) continue;

    const out = await postOp(op);
    if (out === "network") {
      offline = true;
      break; // no point trying the rest
    }
    const { res, http } = out;

    if (res.status === "ok" || res.status === "duplicate") {
      // Fridge photos produce something to look at: keep it on the device and tell the person.
      if (op.kind === "fridge_photo" && res.result) {
        saveFridgeResult(op.userId, res.result);
        window.dispatchEvent(new CustomEvent("nura:toast", { detail: "Your fridge recipes are ready — open Fridge" }));
      }
      await removeOp(op.id);
      synced++;
      syncedOps.push(op);
      onOp?.(op); // tell the UI right away, not only when the whole queue is done
    } else if (res.status === "wrong_user") {
      continue; // belongs to another account on this device; leave untouched
    } else if (res.status === "unauthorized" || http === 401) {
      break; // signed out — keep everything for when they sign back in
    } else if (res.status === "invalid") {
      await updateOp({ ...op, status: "failed", lastError: res.error || "Couldn't be saved.", lastAttemptAt: now });
      failed++;
    } else {
      // retry / 5xx / 429
      const attempts = op.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await updateOp({ ...op, attempts, status: "failed", lastError: res.error || "Kept failing — please try again.", lastAttemptAt: now });
        failed++;
      } else {
        await updateOp({ ...op, attempts, lastError: res.error, lastAttemptAt: now });
      }
    }
  }

  const remaining = (await listOps(userId)).filter((o) => o.status === "pending").length;
  if (synced > 0 && typeof window !== "undefined") window.dispatchEvent(new Event("nura:synced"));
  return { synced, syncedOps, failed, remaining, offline };
}

/**
 * Push queued items to the server. Safe to call often: a Web Lock makes sure only
 * one tab flushes at a time, and server-side idempotency means a retry can never
 * double-log a meal.
 */
export async function flushOutbox(userId: string, force = false, onOp?: (op: OutboxOp) => void): Promise<FlushResult> {
  if (typeof navigator === "undefined") return { synced: 0, syncedOps: [], failed: 0, remaining: 0, offline: false, skipped: true };
  const locks = (navigator as any).locks;
  if (locks?.request) {
    return await locks.request("nura-outbox-flush", { ifAvailable: true }, async (lock: unknown) => {
      if (!lock) return { synced: 0, syncedOps: [], failed: 0, remaining: 0, offline: false, skipped: true };
      return flushInner(userId, force, onOp);
    });
  }
  return flushInner(userId, force, onOp);
}
