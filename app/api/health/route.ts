import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { rateLimiterStatus } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** Liveness check. The full check queries the database; ?lite=1 only warms the server. */
export async function GET(req: Request) {
  // ?lite=1 keeps the server function warm WITHOUT waking the database: the keep-warm job runs every few minutes, and
  // touching the database each time kept a free-tier Neon project awake 24/7 until it ran out of monthly compute.
  if (new URL(req.url).searchParams.get("lite") === "1") return NextResponse.json({ ok: true, lite: true, commit: process.env.NEXT_PUBLIC_COMMIT });
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, rateLimit: await rateLimiterStatus(), commit: process.env.NEXT_PUBLIC_COMMIT });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
