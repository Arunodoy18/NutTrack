import { NextResponse } from "next/server";
import { authDevice } from "@/lib/activityStore";
import { claimDueForOwner } from "@/lib/reminderRunner";
import { checkAuthRateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** The installed app polls this (Bearer device token) and shows what comes back as local notifications. */
export async function GET(req: Request) {
  const dev = await authDevice(req);
  if (!dev) return NextResponse.json({ error: "Not paired" }, { status: 401 });
  if (!(await checkAuthRateLimit(`due:${dev.tokenId}:${clientIp(req)}`))) return NextResponse.json({ reminders: [] }, { status: 429 });
  const due = await claimDueForOwner(dev.ownerId);
  return NextResponse.json({ reminders: due.map((r) => ({ key: r.key, title: r.title, body: r.body, url: r.url, tag: r.tag })) }, { headers: { "Cache-Control": "no-store" } });
}
