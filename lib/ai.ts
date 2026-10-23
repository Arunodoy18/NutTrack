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

export const AI_BUSY_MESSAGE = "Nura's AI is very busy right now. Please try again in a minute, or log this meal by search or barcode instead.";

/**
 * Text to show a person. Our own plain-language messages (like "No foods could be detected") pass through; provider errors
 * (JSON blobs, status codes, quota text) become one friendly sentence.
 */
export function aiErrorMessage(e: unknown): string {
  const raw = messageOf(e).replace(/^(Error:\s*)+/i, "").trim();
  if (isTransientAiError(e) || /quota|billing|API key|permission_denied|PERMISSION_DENIED/i.test(raw)) return AI_BUSY_MESSAGE;
  if (!raw || raw.startsWith("{") || raw.startsWith("[") || /"error"\s*:|googleapis|ApiError|\bat\s+\S+\s+\(/i.test(raw)) return "Something went wrong analysing that. Please try again.";
  return raw.slice(0, 220);
}

/** Thrown for problems found before the AI is ever called (empty text, wrong file type): the person is not charged a scan. */
export class NotCharged extends Error {}

/** Give the scan back when the person got nothing for it because of OUR side (provider down, invalid reply, bad input). A photo with no food in it still counts. */
export function shouldRefundScan(err: unknown): boolean {
  return err instanceof NotCharged || isTransientAiError(err) || /AI returned an invalid format|API_KEY is missing|Failed to get response|timed out/i.test(messageOf(err));
}
