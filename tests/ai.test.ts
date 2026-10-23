import { test } from "node:test";
import assert from "node:assert/strict";
import { withAiRetry, aiErrorMessage, isTransientAiError, AI_BUSY_MESSAGE } from "../lib/ai";

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
