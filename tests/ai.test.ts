import { test } from "node:test";
import assert from "node:assert/strict";
import { withAiRetry, aiErrorMessage, isTransientAiError, AI_BUSY_MESSAGE, NoFood, errorRef, shouldRefundScan, withFallback } from "../lib/ai";

test("a brief provider hiccup is retried and the person never notices", async () => {
  let n = 0;
  const r = await withAiRetry(async () => { n++; if (n < 3) throw Object.assign(new Error("503 UNAVAILABLE"), { status: 503 }); return "ok"; }, { delays: [1, 1] });
  assert.equal(r, "ok"); assert.equal(n, 3);
});
test("a real problem (bad input) is not retried", async () => {
  let n = 0;
  await assert.rejects(withAiRetry(async () => { n++; throw new Error("No foods could be detected in the image."); }, { delays: [1, 1] }));
  assert.equal(n, 1);
});
test("a stuck provider is cut off instead of hanging the screen", async () => {
  const t0 = Date.now();
  await assert.rejects(withAiRetry(() => new Promise(() => {}), { tries: 1, timeoutMs: 40 }), /timed out/);
  assert.ok(Date.now() - t0 < 1000);
});
test("errors shown to people: plain language, ours pass through, provider junk is hidden", () => {
  assert.equal(aiErrorMessage(Object.assign(new Error('{"error":{"code":429,"message":"quota"}}'), { status: 429 })), AI_BUSY_MESSAGE);
  assert.equal(aiErrorMessage(new Error("fetch failed")), AI_BUSY_MESSAGE);
  assert.equal(aiErrorMessage(new Error("Error: No foods could be detected in the image.")), "No foods could be detected in the image.");
  assert.match(aiErrorMessage(new Error('{"weird":"json"}')), /Something went wrong/);
  assert.equal(aiErrorMessage(new Error("You've reached today's fair-use limit of 200 AI scans. It resets tomorrow.")), "You've reached today's fair-use limit of 200 AI scans. It resets tomorrow.");
  assert.ok(isTransientAiError({ status: 429 }) && isTransientAiError(new Error("socket hang up")) && !isTransientAiError(new Error("Invalid meal image.")));
});

test("a scan is given back for every failure except a photo with no food in it", () => {
  assert.equal(shouldRefundScan(new NoFood("No foods could be detected in the image.")), false);
  assert.equal(shouldRefundScan(new Error('{"error":{"code":400,"status":"INVALID_ARGUMENT"}}')), true);
  assert.equal(shouldRefundScan(Object.assign(new Error("boom"), { status: 404 })), true);
  assert.equal(shouldRefundScan(new Error("AI request timed out")), true);
});

test("an unrecognised provider error tells the person their scan wasn't used and carries a short ref", () => {
  const e = Object.assign(new Error('{"error":{"code":400,"message":"bad","status":"INVALID_ARGUMENT"}}'), { status: 400, name: "ApiError" });
  assert.match(errorRef(e), /^400-INVALID_ARGUMENT-ApiError$/);
  const msg = aiErrorMessage(e);
  assert.match(msg, /Something went wrong analysing that/);
  assert.match(msg, /scan wasn't used/);
  assert.match(msg, /\(ref 400-INVALID_ARGUMENT-ApiError\)/);
  assert.ok(!msg.includes("{"), "raw provider text never reaches the screen");
});

test("fallback: if the first AI route fails the next one answers, and the person never sees the failure", async () => {
  const calls: string[] = [];
  const out = await withFallback([
    async () => { calls.push("a"); throw Object.assign(new Error("model gone"), { status: 404 }); },
    async () => { calls.push("b"); throw Object.assign(new Error("busy"), { status: 503 }); },
    async () => { calls.push("c"); return "ok"; },
  ], { timeoutMs: 500 });
  assert.equal(out, "ok");
  assert.deepEqual(calls.filter((c, i) => i === 0 || c !== calls[i - 1]), ["a", "b", "c"]);
});

test("fallback: when every route fails the last error is thrown (and the scan is refunded)", async () => {
  await assert.rejects(withFallback([
    async () => { throw new Error("first"); },
    async () => { throw new Error("second"); },
  ], { timeoutMs: 500 }), /second/);
  assert.equal(shouldRefundScan(new Error("second")), true);
});

test("fallback: a route that hangs is cut off and the next one is used", async () => {
  const out = await withFallback([() => new Promise<string>(() => {}), async () => "fast"], { timeoutMs: 80, tries: 1 });
  assert.equal(out, "fast");
});
