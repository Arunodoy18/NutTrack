import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_PROFILE_COOKIE, canAccessProfile, getSessionUserId } from "@/lib/access";

import { readJson } from "@/lib/sanitize";
export async function POST(req: NextRequest) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let id = "";
  try {
    id = String((await readJson(req))?.id ?? "");
  } catch {
    /* fall through */
  }
  if (!id || !(await canAccessProfile(me, id))) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set(ACTIVE_PROFILE_COOKIE, id, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
