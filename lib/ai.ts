/** Resilience around the AI providers (Gemini / Groq): retry brief hiccups, and never show testers raw technical errors. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function statusOf(e: unknown): number | undefined {
  const any = e as any;
  const s = any?.status ?? any?.statusCode ?? any?.code ?? any?.response?.status ?? any?.error?.code;
  return typeof s === "number" ? s : undefined;
}
const messageOf = (e: unknown) => String((e as any)?.message ?? e ?? "");

/** Worth trying again: provider overloaded, rate-limited for a moment, network blip, timeout. */
export function isTransientAiError(e: unknown): boolean {
  const s = statusOf(e);
  if (s === 429 || (s !== undefined && s >= 500)) return true;
  return /RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|try again|temporar|timed? ?out|ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|socket hang up|\b(429|500|502|503|504)\b/i.test(messageOf(e));
}

/**
 * Runs an AI call, retrying twice (after ~0.8 s and ~2 s) when the failure looks temporary.
 * Each attempt is cut off after `timeoutMs`, so a stuck provider can't hang a person's screen.
 */
export async function withAiRetry<T>(fn: () => Promise<T>, opts: { tries?: number; timeoutMs?: number; delays?: number[] } = {}): Promise<T> {
  const tries = opts.tries ?? 3, timeoutMs = opts.timeoutMs ?? 40_000, delays = opts.delays ?? [800, 2000];
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("AI request timed out")), timeoutMs)),
      ]);
    } catch (e) {
      last = e;
      if (i === tries - 1 || !isTransientAiError(e)) break;
      await sleep(delays[Math.min(i, delays.length - 1)]);
    }
  }
  throw last;
}

/** A short code for support: the provider's HTTP status or error name, never the raw text. */
export function errorRef(e: unknown): string {
  const s = statusOf(e);
  const name = String((e as any)?.name ?? "").replace(/[^A-Za-z]/g, "").slice(0, 12);
  const m = /\b(INVALID_ARGUMENT|NOT_FOUND|PERMISSION_DENIED|FAILED_PRECONDITION|UNAUTHENTICATED|RESOURCE_EXHAUSTED)\b/.exec(messageOf(e));
  return [s, m?.[1], name].filter(Boolean).join("-") || "unknown";
}

/** The AI answered fine, the picture just has no food in it (so the scan counts). */
export class NoFood extends Error {}

/**
 * Try several ways of getting the same answer (a second model, then a third, or another provider) before giving up.
 * Each way is retried briefly on its own; no new way is started once `deadlineMs` has passed, so a bad day at one
 * provider costs a few seconds, not a minute. The first success wins; if all fail, the LAST error is thrown.
 */
export async function withFallback<T>(attempts: Array<() => Promise<T>>, opts: { deadlineMs?: number; timeoutMs?: number; tries?: number } = {}): Promise<T> {
  const start = Date.now(), deadline = opts.deadlineMs ?? 75_000;
  let last: unknown = new Error("No AI route available");
  for (let i = 0; i < attempts.length; i++) {
    if (i > 0 && Date.now() - start > deadline) break;
    try {
      return await withAiRetry(attempts[i], { tries: opts.tries ?? (i === 0 ? 2 : 1), timeoutMs: opts.timeoutMs ?? 28_000 });
    } catch (e) {
      last = e;
      console.error(`[ai] route ${i + 1}/${attempts.length} failed (${errorRef(e)}):`, messageOf(e).slice(0, 200));
    }
  }
  throw last;
}

export const AI_BUSY_MESSAGE = "Nura's AI is very busy right now. Please try again in a minute, or log this meal by search or barcode instead.";

/**
 * Text to show a person. Our own plain-language messages (like "No foods could be detected") pass through; provider errors
 * (JSON blobs, status codes, quota text) become one friendly sentence.
 */
export function aiErrorMessage(e: unknown): string {
  const raw = messageOf(e).replace(/^(Error:\s*)+/i, "").trim();
  if (isTransientAiError(e) || /quota|billing|API key|permission_denied|PERMISSION_DENIED/i.test(raw)) return AI_BUSY_MESSAGE;
  if (!raw || raw.startsWith("{") || raw.startsWith("[") || /"error"\s*:|googleapis|ApiError|\bat\s+\S+\s+\(/i.test(raw)) return `Something went wrong analysing that. Your scan wasn't used, please try again. (ref ${errorRef(e)})`;
  return raw.slice(0, 220);
}

/** Thrown for problems found before the AI is ever called (empty text, wrong file type): the person is not charged a scan. */
export class NotCharged extends Error {}

/** Give the scan back whenever the person got nothing for it, except a photo with no food in it (that still counts). */
export function shouldRefundScan(err: unknown): boolean {
  if (err instanceof NoFood) return false;
  return true; // anything else is on our side or the provider's, so the person keeps their scan
}
