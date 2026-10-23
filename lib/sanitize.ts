/** Text and request-body hygiene for everything users can type or send. */

// Characters that can break storage (NUL kills Postgres text columns) or fool readers (bidi overrides flip text direction).
const BAD_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩﻿]/g;

/** A short, single-line piece of text typed by a person (a name, a title). */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const s = v.replace(BAD_CHARS, "").replace(/\s+/g, " ").trim();
  // Cut by code points, so an emoji is never sliced in half.
  return Array.from(s).slice(0, max).join("");
}

/** Strips the dangerous control characters from every string in a parsed JSON value (keeps newlines and tabs). */
export function deepClean<T>(value: T, depth = 0): T {
  if (depth > 8) return value;
  if (typeof value === "string") return value.replace(BAD_CHARS, "") as unknown as T;
  if (Array.isArray(value)) return value.slice(0, 5000).map((x) => deepClean(x, depth + 1)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepClean(v, depth + 1);
    return out as T;
  }
  return value;
}

/** One canonical form for an email address: Unicode-normalised, trimmed, lower-case. */
export function normalizeEmail(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.normalize("NFKC").replace(BAD_CHARS, "").trim().toLowerCase();
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads a JSON body. Broken or missing JSON becomes {} so the route's own validation answers with a clean 400, never a crash. */
export async function readJson(req: Request): Promise<any> {
  try {
    const v = await req.json();
    return v && typeof v === "object" ? deepClean(v) : {};
  } catch {
    return {};
  }
}

/** True for a Postgres "unique constraint" violation (two people claimed the same email at the same moment). */
export const isUniqueViolation = (e: unknown) => /23505|duplicate key|unique constraint/i.test(String((e as any)?.code ?? "") + " " + String((e as any)?.message ?? "") + " " + String((e as any)?.cause?.message ?? ""));
