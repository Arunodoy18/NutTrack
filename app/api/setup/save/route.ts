import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getActor } from "@/lib/access";
import { validateProfileInput } from "@/lib/profileValidation";
import { saveProfileAndGoals } from "@/lib/profileService";

/** Saves the profile of whoever is currently being tracked (the account holder or a family member). */
export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = validateProfileInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const p = parsed.value;

  const target = await db.query.users.findFirst({
    where: eq(users.id, actor.activeId),
    columns: { id: true, parentId: true },
  });
  if (!target) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // A managed profile is, by definition, set up by its parent. A standalone under-13 account needs the checkbox.
  const parentManaged = !!target.parentId;
  if (p.age < 13 && !parentManaged && !parsed.parentConfirmed) {
    return NextResponse.json(
      { error: "A parent or guardian must confirm this profile for children under 13." },
      { status: 400 }
    );
  }

  const profile = await saveProfileAndGoals(target.id, p);

  return NextResponse.json({
    success: true,
    profile: {
      bmi: profile.bmi,
      bmr: profile.bmr,
      tdee: profile.tdee,
      bodyFatPercent: profile.bodyFatPercent,
      ffm: profile.ffm,
      macros: profile.macros,
      micros: profile.micros,
      isChild: profile.isChild,
    },
  });
}
