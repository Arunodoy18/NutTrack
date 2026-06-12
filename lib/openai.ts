// Single OpenAI client instance — imported only in server files
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set. Add it to .env.local");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // No dangerouslyAllowBrowser — server only
});

export const AI_MODEL = "gpt-4o" as const;
