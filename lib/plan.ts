/**
 * Nura is free for everyone for now: no trial, no paywall, no upgrade prompts.
 * A fair-use cap (200 AI scans per account per day) stays on to protect the AI bill.
 * Flip to false to bring the trial / paid-plan behaviour back (the old code paths are untouched).
 */
export const FREE_FOR_ALL = true;

/**
 * The free plan: every feature, but the features that cost real money (AI photo scan, AI typing/voice, fridge scan)
 * are limited per account per day. Search, barcode, recipes, plans, water and weight are never limited.
 * Premium (unlimited AI scans) is announced as "coming soon" — there is no purchase flow yet.
 */
export const FREE_DAILY_AI_SCANS = 10;
export const PREMIUM_COMING_SOON = "Premium, with unlimited AI scans, is coming soon.";
