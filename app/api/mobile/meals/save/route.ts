import { NextResponse } from "next/server";
import { authenticateMobile, isAuthenticated } from "@/lib/mobileAuth";
import { saveMealAction } from "@/app/actions";

export async function POST(req: Request) {
  try {
    const authResult = await authenticateMobile(req);
    if (!isAuthenticated(authResult)) return authResult;

    const userId = authResult.sub;
    const mealData = await req.json();

    const result = await saveMealAction(userId, mealData, true);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mobile Save Meal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
