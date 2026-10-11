import { NextResponse } from "next/server";
import { getActor } from "@/lib/access";
import { getActivity } from "@/lib/activityStore";
import { dateKeyInTz, startOfDayDaysAgo } from "@/lib/tz";
import { getUserTz } from "@/lib/tzServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const n = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 7));
  const tz = await getUserTz();
  const since = startOfDayDaysAgo(tz, n - 1);
  const data = await getActivity(actor.activeId, dateKeyInTz(tz, since), since);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
