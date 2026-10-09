import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ACTIVE_PROFILE_COOKIE, getSessionUserId } from "@/lib/access";

/** Remove a family member and everything logged for them. The account holder can't be removed here. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (params.id === me) return NextResponse.json({ error: "Use Delete Account to remove your own account." }, { status: 400 });

  const deleted = await db
    .delete(users)
    .where(and(eq(users.id, params.id), eq(users.parentId, me)))
    .returning({ id: users.id });
  if (deleted.length === 0) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const res = NextResponse.json({ success: true });
  res.cookies.delete(ACTIVE_PROFILE_COOKIE); // fall back to the account holder
  return res;
}
