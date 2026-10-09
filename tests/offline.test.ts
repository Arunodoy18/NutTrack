import "fake-indexeddb/auto";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Minimal browser globals for the client-side modules under test.
const g = globalThis as any;
g.window = g.window ?? new EventTarget();
g.window.dispatchEvent ??= () => true;
g.localStorage = g.localStorage ?? (() => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
})();
Object.defineProperty(g, "navigator", { value: { onLine: true }, configurable: true });

import { enqueueOp, listOps, updateOp, removeOp, clearOutbox, MAX_QUEUED_PHOTOS } from "../lib/offlineQueue";
import { flushOutbox } from "../lib/offlineSync";
import { guessMealSession } from "../lib/offlineTypes";

const manual = (userId = "u1", name = "Dal rice") => ({
  userId, kind: "meal_manual" as const, eatenAt: Date.now() - 1000,
  meal: { name, mealSession: "Lunch" as const, totalCalories: 450, totalProtein: 15, totalFat: 10, totalCarbs: 70, totalFiber: 8 },
});

const mockFetch = (handler: (op: any) => { status: string; http?: number; error?: string } | "network") => {
  const calls: any[] = [];
  g.fetch = async (_url: string, init: any) => {
    const op = JSON.parse(init.body).op;
    calls.push(op);
    const r = handler(op);
    if (r === "network") throw new TypeError("Failed to fetch");
    return { status: r.http ?? 200, json: async () => ({ status: r.status, error: r.error }) };
  };
  return calls;
};

beforeEach(async () => { await clearOutbox(); });

test("enqueue stores items per user, oldest first, with idempotency ids", async () => {
  const a = await enqueueOp(manual("u1", "A"));
  await new Promise((r) => setTimeout(r, 3));
  const b = await enqueueOp(manual("u1", "B"));
  await enqueueOp(manual("u2", "Other user"));
  const mine = await listOps("u1");
  assert.deepEqual(mine.map((o) => o.meal?.name), ["A", "B"]);
  assert.notEqual(a.id, b.id);
  assert.ok(a.id.length >= 8);
  assert.equal((await listOps()).length, 3);
});

test("flush syncs ok + duplicate ops and removes them from the queue", async () => {
  await enqueueOp(manual("u1", "A")); await enqueueOp(manual("u1", "B"));
  const answers = ["ok", "duplicate"];
  mockFetch(() => ({ status: answers.shift()! }));
  const r = await flushOutbox("u1", true);
  assert.equal(r.synced, 2);
  assert.equal(r.syncedOps.length, 2);
  assert.equal((await listOps("u1")).length, 0);
});

test("network failure keeps everything queued and stops early (no attempt burn)", async () => {
  await enqueueOp(manual("u1", "A")); await enqueueOp(manual("u1", "B"));
  const calls = mockFetch(() => "network");
  const r = await flushOutbox("u1", true);
  assert.equal(r.offline, true);
  assert.equal(calls.length, 1, "stops after the first network failure");
  const ops = await listOps("u1");
  assert.equal(ops.length, 2);
  assert.ok(ops.every((o) => o.attempts === 0 && o.status === "pending"));
});

test("invalid ops are parked as failed with the server's message, not retried forever", async () => {
  await enqueueOp(manual("u1", "Bad"));
  mockFetch(() => ({ status: "invalid", http: 400, error: "Meal needs a name." }));
  const r = await flushOutbox("u1", true);
  assert.equal(r.failed, 1);
  const [op] = await listOps("u1");
  assert.equal(op.status, "failed");
  assert.equal(op.lastError, "Meal needs a name.");
  // failed ops are not re-sent
  const calls = mockFetch(() => ({ status: "ok" }));
  await flushOutbox("u1", true);
  assert.equal(calls.length, 0);
});

test("transient errors back off, then fail after 5 attempts", async () => {
  await enqueueOp(manual("u1", "Flaky"));
  mockFetch(() => ({ status: "retry", http: 503, error: "busy" }));
  for (let i = 1; i <= 4; i++) {
    await flushOutbox("u1", true);
    const [op] = await listOps("u1");
    assert.equal(op.attempts, i);
    assert.equal(op.status, "pending");
  }
  await flushOutbox("u1", true);
  const [op] = await listOps("u1");
  assert.equal(op.status, "failed");
});

test("backoff: a just-failed op is skipped unless forced", async () => {
  await enqueueOp(manual("u1", "Flaky"));
  mockFetch(() => ({ status: "retry", http: 503 }));
  await flushOutbox("u1", true);
  const calls = mockFetch(() => ({ status: "ok" }));
  await flushOutbox("u1", false); // inside the 5s window
  assert.equal(calls.length, 0);
  await flushOutbox("u1", true);
  assert.equal(calls.length, 1);
});

test("another account's queue is never sent, and wrong_user leaves the op in place", async () => {
  await enqueueOp(manual("other", "Theirs"));
  const calls = mockFetch(() => ({ status: "ok" }));
  await flushOutbox("u1", true);
  assert.equal(calls.length, 0);
  await enqueueOp(manual("u1", "Mine"));
  mockFetch(() => ({ status: "wrong_user", http: 409 }));
  await flushOutbox("u1", true);
  assert.equal((await listOps("u1")).length, 1);
});

test("signed out (401) stops the flush and keeps the queue for later", async () => {
  await enqueueOp(manual("u1", "A")); await enqueueOp(manual("u1", "B"));
  const calls = mockFetch(() => ({ status: "unauthorized", http: 401 }));
  await flushOutbox("u1", true);
  assert.equal(calls.length, 1);
  assert.equal((await listOps("u1")).length, 2);
});

test("photo queue is capped to protect device storage", async () => {
  for (let i = 0; i < MAX_QUEUED_PHOTOS; i++) {
    await enqueueOp({ userId: "u1", kind: "meal_photo", eatenAt: Date.now(), image: "data:image/jpeg;base64,AAAA" });
  }
  await assert.rejects(() => enqueueOp({ userId: "u1", kind: "meal_photo", eatenAt: Date.now(), image: "data:image/jpeg;base64,AAAA" }), /photos waiting/);
});

test("update / remove / clear", async () => {
  const a = await enqueueOp(manual("u1", "A"));
  await updateOp({ ...a, attempts: 2 });
  assert.equal((await listOps("u1"))[0].attempts, 2);
  await removeOp(a.id);
  assert.equal((await listOps("u1")).length, 0);
  await enqueueOp(manual("u1", "B"));
  await clearOutbox();
  assert.equal((await listOps()).length, 0);
});

test("meal session guess by time of day", () => {
  const at = (h: number) => new Date(2026, 0, 1, h, 0).getTime();
  assert.equal(guessMealSession(at(8)), "Breakfast");
  assert.equal(guessMealSession(at(13)), "Lunch");
  assert.equal(guessMealSession(at(16)), "Snack");
  assert.equal(guessMealSession(at(20)), "Dinner");
  assert.equal(guessMealSession(at(2)), "Dinner");
});

test("each synced item is reported immediately, before the rest of the queue finishes", async () => {
  await enqueueOp(manual("u1", "First")); await enqueueOp(manual("u1", "Second"));
  const order: string[] = [];
  g.fetch = async (_u: string, init: any) => {
    const op = JSON.parse(init.body).op;
    // By the time the 2nd request starts, the 1st item must already have been reported.
    order.push(`req:${op.meal.name}`);
    return { status: 200, json: async () => ({ status: "ok" }) };
  };
  await flushOutbox("u1", true, (op) => order.push(`done:${op.meal?.name}`));
  assert.deepEqual(order, ["req:First", "done:First", "req:Second", "done:Second"]);
});

import { saveFridgeResult, loadFridgeResult, clearFridgeResult } from "../lib/fridgeResults";

test("photo cap counts every image item (meal + fridge photos together)", async () => {
  for (let i = 0; i < MAX_QUEUED_PHOTOS - 1; i++) {
    await enqueueOp({ userId: "u1", kind: "meal_photo", eatenAt: Date.now(), image: "data:image/jpeg;base64,AAAA" });
  }
  await enqueueOp({ userId: "u1", kind: "fridge_photo", eatenAt: Date.now(), image: "data:image/jpeg;base64,AAAA" });
  await assert.rejects(
    () => enqueueOp({ userId: "u1", kind: "fridge_photo", eatenAt: Date.now(), image: "data:image/jpeg;base64,AAAA" }),
    /photos waiting/
  );
  // non-image items are never blocked by the photo cap
  await enqueueOp({ userId: "u1", kind: "meal_barcode", eatenAt: Date.now(), barcode: "8901058852349" });
});

test("a queue is scoped to the ACCOUNT but items keep their family member", async () => {
  await enqueueOp({ userId: "kid", ownerId: "parent", kind: "meal_text", eatenAt: Date.now(), text: "2 rotis and dal" });
  await enqueueOp({ userId: "parent", ownerId: "parent", kind: "meal_barcode", eatenAt: Date.now(), barcode: "8901058852349" });
  await enqueueOp({ userId: "stranger", ownerId: "stranger", kind: "meal_text", eatenAt: Date.now(), text: "x" });
  const forParent = await listOps("parent");
  assert.deepEqual(forParent.map((o) => o.userId).sort(), ["kid", "parent"]);
  const calls = mockFetch(() => ({ status: "ok" }));
  const r = await flushOutbox("parent", true);
  assert.equal(r.synced, 2);
  assert.deepEqual(calls.map((c) => c.userId).sort(), ["kid", "parent"]);
  assert.equal((await listOps("stranger")).length, 1, "another account's queue is untouched");
});

test("delete/edit items carry what the server needs to be idempotent", async () => {
  const del = await enqueueOp({ userId: "u1", kind: "meal_delete", eatenAt: Date.now(), mealId: "m-123" });
  const edit = await enqueueOp({ userId: "u1", kind: "meal_edit", eatenAt: Date.now(), mealId: "m-123", scale: 0.5, expectedCalories: 600 });
  assert.equal(del.mealId, "m-123");
  assert.equal(edit.expectedCalories, 600);
  assert.equal(edit.scale, 0.5);
});

test("fridge results are stored per profile, expire after 3 days, and clear", () => {
  const store = new Map<string, string>();
  g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  saveFridgeResult("kid", { ingredients: ["milk"], recipes: [] });
  assert.ok(loadFridgeResult("kid"));
  assert.equal(loadFridgeResult("parent"), null, "other profile sees nothing");
  // make it 4 days old
  const raw = JSON.parse(store.get("nura_fridge_result_kid")!);
  raw.savedAt = Date.now() - 4 * 24 * 3600_000;
  store.set("nura_fridge_result_kid", JSON.stringify(raw));
  assert.equal(loadFridgeResult("kid"), null, "stale recipes are dropped");
  saveFridgeResult("kid", { ingredients: [], recipes: [] });
  clearFridgeResult("kid");
  assert.equal(loadFridgeResult("kid"), null);
});

test("one barcode scanned repeatedly (camera fires every frame) queues exactly one item", async () => {
  const first = await enqueueOp({ userId: "u1", kind: "meal_barcode", eatenAt: Date.now(), barcode: "3017620422003" });
  for (let i = 0; i < 9; i++) await enqueueOp({ userId: "u1", kind: "meal_barcode", eatenAt: Date.now(), barcode: "3017620422003" });
  const ops = (await listOps("u1")).filter((o) => o.kind === "meal_barcode");
  assert.equal(ops.length, 1);
  assert.equal(ops[0].id, first.id);
  // a different product is a different item
  await enqueueOp({ userId: "u1", kind: "meal_barcode", eatenAt: Date.now(), barcode: "8901058852349" });
  assert.equal((await listOps("u1")).filter((o) => o.kind === "meal_barcode").length, 2);
});
