import { test } from "node:test";
import assert from "node:assert/strict";
import { mailConfigured, sendMail } from "../lib/mailer";

const KEYS = ["SMTP_USER", "SMTP_PASS", "RESEND_API_KEY"] as const;
const withEnv = async (env: Partial<Record<(typeof KEYS)[number], string>>, fn: () => Promise<void> | void) => {
  const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
  try { await fn(); } finally { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
};

test("email is 'configured' with SMTP login or a Resend key, not with half an SMTP login", async () => {
  await withEnv({}, () => assert.equal(mailConfigured(), false));
  await withEnv({ SMTP_USER: "a@gmail.com" }, () => assert.equal(mailConfigured(), false));
  await withEnv({ SMTP_USER: "a@gmail.com", SMTP_PASS: "abcd efgh ijkl mnop" }, () => assert.equal(mailConfigured(), true));
  await withEnv({ RESEND_API_KEY: "re_x" }, () => assert.equal(mailConfigured(), true));
});

test("sending with nothing configured fails loudly instead of pretending", async () => {
  await withEnv({}, async () => { await assert.rejects(sendMail({ to: "x@y.com", subject: "s", html: "h" }), /No email service configured/); });
});
