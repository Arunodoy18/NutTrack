import { NextResponse } from "next/server";
import { authenticateMobile, isAuthenticated } from "@/lib/mobileAuth";
import { analyzeFridgeImageAction } from "@/app/actions";

export async function POST(req: Request) {
  try {
    const authResult = await authenticateMobile(req);
    if (!isAuthenticated(authResult)) return authResult;

    const userId = authResult.sub;
    const body = await req.json();

    if (!body.image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const result = await analyzeFridgeImageAction(body.image, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Mobile Fridge Analyze Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
