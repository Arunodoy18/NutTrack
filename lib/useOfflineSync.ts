"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listOps, onQueueChange, removeOp, updateOp } from "./offlineQueue";
import { flushOutbox } from "./offlineSync";
import type { OutboxOp } from "./offlineTypes";

/** Tracks navigator.onLine without SSR mismatches. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

export interface OfflineSyncState {
  ops: OutboxOp[];
  pending: OutboxOp[];
  failed: OutboxOp[];
  online: boolean;
  syncing: boolean;
  justSynced: boolean;
  flushNow: () => Promise<void>;
  discard: (id: string) => Promise<void>;
  retry: (id: string) => Promise<void>;
}

/**
 * Owns the offline outbox for one signed-in user: exposes the queue, flushes it
 * when the connection returns / the app resumes / new items are added, and calls
 * `onSynced` so screens can refresh their server data afterwards.
 */
export function useOfflineSync(userId: string, onSynced?: (syncedOps: OutboxOp[]) => void): OfflineSyncState {
  const online = useOnline();
  const [ops, setOps] = useState<OutboxOp[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setOps(await listOps(userId));
  }, [userId]);

  const flushNow = useCallback(
    async (force = false) => {
      if (!userId || busy.current || !navigator.onLine) return;
      busy.current = true;
      setSyncing(true);
      try {
        const r = await flushOutbox(userId, force);
        await refresh();
        if (r.synced > 0) {
          setJustSynced(true);
          setTimeout(() => setJustSynced(false), 3000);
          onSyncedRef.current?.(r.syncedOps);
        }
      } finally {
        busy.current = false;
        setSyncing(false);
      }
    },
    [userId, refresh]
  );

  // Load + follow queue changes (this tab and other tabs).
  useEffect(() => {
    refresh();
    return onQueueChange(() => {
      refresh();
    });
  }, [refresh]);

  const pendingCount = ops.filter((o) => o.status === "pending").length;

  // Flush: on mount, when we come back online, when the app returns to the foreground,
  // when something new is queued, and every 30s while there's still work to do.
  useEffect(() => {
    if (!online || pendingCount === 0) return;
    flushNow();
    const t = setInterval(() => flushNow(), 30_000);
    return () => clearInterval(t);
  }, [online, pendingCount, flushNow]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") flushNow();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [flushNow]);

  const discard = useCallback(async (id: string) => {
    await removeOp(id);
  }, []);

  const retry = useCallback(
    async (id: string) => {
      const op = ops.find((o) => o.id === id);
      if (!op) return;
      await updateOp({ ...op, status: "pending", attempts: 0, lastError: undefined, lastAttemptAt: undefined });
      flushNow(true);
    },
    [ops, flushNow]
  );

  return {
    ops,
    pending: ops.filter((o) => o.status === "pending"),
    failed: ops.filter((o) => o.status === "failed"),
    online,
    syncing,
    justSynced,
    flushNow: () => flushNow(true),
    discard,
    retry,
  };
}
