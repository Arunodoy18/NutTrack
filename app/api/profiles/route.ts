import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { count, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ACTIVE_PROFILE_COOKIE, MAX_PROFILES, getSessionUserId, listProfiles } from "@/lib/access";
import { AVATARS, RELATIONS } from "@/lib/profileService";

const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 };

/** List everyone this account can track. */
export async function GET() {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, profiles: await listProfiles(me), max: MAX_PROFILES });
}

/** Add a family member. Creates an empty managed profile and makes it the active one. */
export async function POST(req: NextRequest) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only a real account can own family members (managed profiles can't nest).
  const owner = await db.query.users.findFirst({ where: eq(users.id, me), columns: { id: true, parentId: true } });
  if (!owner || owner.parentId) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 40) : "";
  if (!name) return NextResponse.json({ error: "Please enter a name." }, { status: 400 });
  const relation = RELATIONS.includes(body?.relation) && body.relation !== "self" ? body.relation : "child";
  const avatar = (AVATARS as readonly string[]).includes(body?.avatar) ? body.avatar : relation === "child" ? "🧒" : "🙂";

  const [{ n }] = await db
    .select({ n: count() })
    .from(users)
    .where(or(eq(users.id, me), eq(users.parentId, me)));
  if (n >= MAX_PROFILES) {
    return NextResponse.json({ error: `You can track up to ${MAX_PROFILES} people on one account.` }, { status: 400 });
  }

  const id = randomUUID();
  await db.insert(users).values({
    id,
    name,
    // Managed profiles can't sign in: no password, and a reserved, undeliverable address.
    email: `profile-${id}@family.invalid`,
    parentId: me,
    relation,
    avatar,
    isVerified: true,
  });

  const res = NextResponse.json({ success: true, id });
  res.cookies.set(ACTIVE_PROFILE_COOKIE, id, cookieOpts);
  return res;
}
