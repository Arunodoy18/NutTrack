"use client";

/**
 * On-device outbox for offline logging.
 * IndexedDB when available (photos are ~150 KB each), otherwise localStorage
 * (private modes / old WebViews) with a small size cap.
 */
import type { OutboxOp } from "./offlineTypes";

const DB_NAME = "nura-offline";
const STORE = "outbox";
const LS_KEY = "nura_outbox_v1";
const EVENT = "nura:queue";
const LS_MAX_CHARS = 3_000_000;

export const MAX_QUEUED_PHOTOS = 20;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore(STORE, { keyPath: "id" });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

const reqToPromise = <T,>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

/* ── localStorage fallback ── */
function lsRead(): OutboxOp[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as OutboxOp[]) : [];
  } catch {
    return [];
  }
}
function lsWrite(ops: OutboxOp[]) {
  const raw = JSON.stringify(ops);
  if (raw.length > LS_MAX_CHARS) throw new Error("Not enough storage to save more offline items.");
  localStorage.setItem(LS_KEY, raw);
}

let channel: BroadcastChannel | null = null;
function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
  try {
    if (!channel && typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("nura-outbox");
      (channel as any).unref?.(); // don't keep non-browser runtimes (tests) alive
    }
    channel?.postMessage("changed");
  } catch {
    /* ignore */
  }
}

/** Subscribe to queue changes in this tab and other tabs. Returns an unsubscribe fn. */
export function onQueueChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  let ch: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      ch = new BroadcastChannel("nura-outbox");
      ch.onmessage = () => cb();
    }
  } catch {
    /* ignore */
  }
  return () => {
    window.removeEventListener(EVENT, cb);
    ch?.close();
  };
}

let lastCreatedAt = 0;
/** Strictly increasing, so items queued in the same millisecond still sync in the order they were added. */
function nextCreatedAt() {
  lastCreatedAt = Math.max(Date.now(), lastCreatedAt + 1);
  return lastCreatedAt;
}

export function newOpId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

export async function listOps(userId?: string): Promise<OutboxOp[]> {
  const db = await openDb();
  let all: OutboxOp[];
  if (db) {
    try {
      all = (await reqToPromise(db.transaction(STORE).objectStore(STORE).getAll())) as OutboxOp[];
    } catch {
      all = lsRead();
    }
  } else {
    all = lsRead();
  }
  all.sort((a, b) => a.createdAt - b.createdAt);
  // `userId` here is the ACCOUNT: it owns every profile's queued items.
  return userId ? all.filter((o) => (o.ownerId ?? o.userId) === userId) : all;
}

async function putOp(op: OutboxOp) {
  const db = await openDb();
  if (db) {
    try {
      await reqToPromise(db.transaction(STORE, "readwrite").objectStore(STORE).put(op));
      return;
    } catch {
      /* fall through to localStorage */
    }
  }
  const ops = lsRead().filter((o) => o.id !== op.id);
  ops.push(op);
  lsWrite(ops);
}

export async function enqueueOp(
  input: Pick<OutboxOp, "userId" | "ownerId" | "kind" | "eatenAt" | "meal" | "image" | "text" | "barcode" | "mealId" | "scale" | "newName" | "expectedCalories">
): Promise<OutboxOp> {
  if (input.image) {
    // Photos are the heavy items (~150 KB each): cap them to protect device storage.
    const photos = (await listOps(input.ownerId ?? input.userId)).filter((o) => !!o.image).length;
    if (photos >= MAX_QUEUED_PHOTOS) {
      throw new Error(`You already have ${MAX_QUEUED_PHOTOS} photos waiting. Reconnect to sync them first.`);
    }
  }
  const op: OutboxOp = {
    ...input,
    id: newOpId(),
    createdAt: nextCreatedAt(),
    attempts: 0,
    status: "pending",
  };
  await putOp(op);
  notify();
  return op;
}

export async function updateOp(op: OutboxOp) {
  await putOp(op);
  notify();
}

export async function removeOp(id: string) {
  const db = await openDb();
  if (db) {
    try {
      await reqToPromise(db.transaction(STORE, "readwrite").objectStore(STORE).delete(id));
    } catch {
      /* ignore */
    }
  }
  try {
    const ops = lsRead();
    if (ops.some((o) => o.id === id)) lsWrite(ops.filter((o) => o.id !== id));
  } catch {
    /* ignore */
  }
  notify();
}

/** Remove everything (logout / account deletion on shared devices). */
export async function clearOutbox() {
  const db = await openDb();
  if (db) {
    try {
      await reqToPromise(db.transaction(STORE, "readwrite").objectStore(STORE).clear());
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
  notify();
}
