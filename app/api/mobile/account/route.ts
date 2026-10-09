import { NextResponse } from "next/server";
import { authenticateMobile, isAuthenticated } from "@/lib/mobileAuth";
import { deleteAccountAction } from "@/app/actions";

export async function DELETE(req: Request) {
  try {
    const authResult = await authenticateMobile(req);
    if (!isAuthenticated(authResult)) return authResult;

    const result = await deleteAccountAction(authResult.sub, true);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mobile Delete Account Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
