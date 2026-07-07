import { NextResponse } from "next/server";
import { authenticateMobile, isAuthenticated } from "@/lib/mobileAuth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const authResult = await authenticateMobile(req);
    if (!isAuthenticated(authResult)) return authResult;

    const userId = authResult.sub;
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Strip out sensitive fields (password, etc.)
    const { password, ...safeUser } = user;

    return NextResponse.json({ success: true, data: safeUser });
  } catch (error: any) {
    console.error("Mobile Get Profile Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await authenticateMobile(req);
    if (!isAuthenticated(authResult)) return authResult;

    const userId = authResult.sub;
    const body = await req.json();

    // Setup logic - directly update the users table
    await db.update(users)
      .set({
        ...body,
        profileComplete: body.profileComplete ?? true,
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mobile Save Profile Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
