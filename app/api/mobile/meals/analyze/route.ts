import { NextResponse } from "next/server";
import { authenticateMobile, isAuthenticated } from "@/lib/mobileAuth";
import { analyzeMealImageAction, analyzeMealTextAction } from "@/app/actions";

export async function POST(req: Request) {
  try {
    const authResult = await authenticateMobile(req);
    if (!isAuthenticated(authResult)) return authResult;

    const userId = authResult.sub;
    const body = await req.json();

    if (body.type === "image") {
      const result = await analyzeMealImageAction(body.payload, userId);
      return NextResponse.json(result);
    } else if (body.type === "text") {
      const result = await analyzeMealTextAction(body.payload, userId);
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Mobile Meal Analyze Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
