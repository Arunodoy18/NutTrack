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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await authenticateMobile(req);
    if (!isAuthenticated(authResult)) return authResult;

    const userId = authResult.sub;
    const body = await req.json();

    // Whitelist: never spread the request body into the users table, or a
    // client could set isPremium / password / email / isVerified on itself.
    const str = (v: unknown, max = 200) =>
      typeof v === "string" ? v.trim().slice(0, max) : undefined;
    const int = (v: unknown, min: number, max: number) => {
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : undefined;
    };
    const updates = Object.fromEntries(
      Object.entries({
        name: str(body?.name, 100),
        age: int(body?.age, 5, 120),
        gender: str(body?.gender, 30),
        heightCm: int(body?.heightCm, 50, 260),
        weightKg: int(body?.weightKg, 20, 400),
        birthdate: str(body?.birthdate, 20),
        activityLevel: str(body?.activityLevel, 50),
        bodyFat: str(body?.bodyFat, 20),
        primaryGoal: str(body?.primaryGoal, 100),
        medicalConditions: str(body?.medicalConditions, 500),
        trainingFrequency: str(body?.trainingFrequency, 50),
        dietaryPreferences: str(body?.dietaryPreferences, 500),
      }).filter(([, v]) => v !== undefined)
    );

    await db.update(users)
      .set({ ...updates, profileComplete: true })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mobile Save Profile Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
