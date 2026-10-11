import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldShowDownload, isAppUserAgent } from "../lib/appGate";

const html = "text/html,application/xhtml+xml";
const chrome = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36";
const app = chrome + " NuraApp/1.2.0";

test("browsers get the download page for app screens", () => {
  for (const p of ["/", "/dashboard", "/auth/login", "/plan", "/recipes", "/profile", "/connected"]) assert.equal(shouldShowDownload({ method: "GET", accept: html, ua: chrome, path: p }), true, p);
});
test("the installed app is never gated", () => {
  assert.ok(isAppUserAgent(app));
  for (const p of ["/", "/dashboard", "/download"]) assert.equal(shouldShowDownload({ method: "GET", accept: html, ua: app, path: p }), false, p);
});
test("download + legal pages stay public", () => {
  for (const p of ["/download", "/download/", "/privacy", "/terms"]) assert.equal(shouldShowDownload({ method: "GET", accept: html, ua: chrome, path: p }), false, p);
});
test("only page navigations are gated, not fetches, assets or writes", () => {
  assert.equal(shouldShowDownload({ method: "GET", accept: "application/json", ua: chrome, path: "/dashboard" }), false);
  assert.equal(shouldShowDownload({ method: "GET", accept: "*/*", ua: chrome, path: "/dashboard" }), false);
  assert.equal(shouldShowDownload({ method: "POST", accept: html, ua: chrome, path: "/dashboard" }), false);
});
test("spoof-lookalikes don't count", () => {
  assert.equal(isAppUserAgent("NuraApp"), false);
  assert.equal(isAppUserAgent(null), false);
  assert.equal(isAppUserAgent("Mozilla/5.0 NuraApp/x.y.z"), false);
});
