import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { getLiveSessionUserId } from "@/lib/access";
import { checkAuthRateLimit } from "@/lib/rateLimit";
import { readJson, cleanText } from "@/lib/sanitize";
import { APP_UA } from "@/lib/appGate";

export const dynamic = "force-dynamic";
const CATEGORIES = ["bug", "idea", "other"] as const;

/** A tester sends a note from inside the app. */
export async function POST(req: NextRequest) {
  const me = await getLiveSessionUserId();
  if (!me) return NextResponse.json({ error: "Please sign in to send feedback." }, { status: 401 });
  if (!(await checkAuthRateLimit(`feedback:${me}`))) return NextResponse.json({ error: "That's a lot of messages. Please try again in a few minutes." }, { status: 429 });
  const body = await readJson(req);
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (message.length < 3) return NextResponse.json({ error: "Please write a few words about it." }, { status: 400 });
  const category = (CATEGORIES as readonly string[]).includes(body?.category) ? body.category : "other";
  const appVersion = APP_UA.exec(req.headers.get("user-agent") ?? "")?.[1] ?? null;
  await db.insert(feedback).values({ userId: me, category, message, appVersion, screen: cleanText(body?.screen, 60) || null });
  return NextResponse.json({ ok: true });
}
