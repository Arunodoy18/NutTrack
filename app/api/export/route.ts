import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, canAccessProfile } from "@/lib/access";
import { collectExport } from "@/lib/exportCollector";
import { buildJson, buildZip } from "@/lib/exportData";
import { checkAuthRateLimit } from "@/lib/rateLimit";
import { getUserTz } from "@/lib/tzServer";

export const maxDuration = 60;

// Keep a single download to a sane size: at most 400 photos, ~40 MB.
const MAX_PHOTO_BYTES = 40_000_000;

/**
 * GET /api/export?format=zip|json&scope=family|profile&profile=<id>&range=all|30|90&photos=1
 * Download your own data. Signed-in account holders only; family profiles are included because the
 * account owns them. Responses are never cached.
 */
export async function GET(req: NextRequest) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const format = p.get("format") === "json" ? "json" : "zip";
  const rangeParam = p.get("range");
  const rangeDays = rangeParam === "30" ? 30 : rangeParam === "90" ? 90 : null;
  const wantPhotos = p.get("photos") === "1" && format === "zip";
  const profileId = p.get("scope") === "profile" ? String(p.get("profile") ?? "") : undefined;

  if (profileId && !(await canAccessProfile(me, profileId))) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  // Heavy query: allow a handful per window so it can't be used to hammer the database.
  if (!(await checkAuthRateLimit(`export:${me}`))) {
    return NextResponse.json({ error: "Too many exports. Please wait a few minutes and try again." }, { status: 429 });
  }

  try {
    const bundle = await collectExport({ accountId: me, profileId, rangeDays, timezone: getUserTz(), includePhotos: wantPhotos });
    if (wantPhotos) {
      let total = 0, n = 0;
      for (const m of bundle.meals) {
        if (!m.photo) continue;
        total += m.photo.length * 0.75;
        if (total > MAX_PHOTO_BYTES || ++n > 400) m.photo = null; // over budget → keep the meal, drop the photo
      }
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const headers = {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    };
    if (format === "json") {
      return new NextResponse(buildJson(bundle), {
        headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="nura-data-${stamp}.json"` },
      });
    }
    const zip = buildZip(bundle, wantPhotos);
    return new NextResponse(Buffer.from(zip), {
      headers: { ...headers, "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="nura-data-${stamp}.zip"`, "Content-Length": String(zip.byteLength) },
    });
  } catch (err) {
    console.error("[export] failed:", err);
    return NextResponse.json({ error: "Couldn't build your export. Please try again." }, { status: 500 });
  }
}
