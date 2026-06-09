import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, otpTokens } from "@/lib/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, otp, type, newPassword } = await req.json();

    if (!email || !otp || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find the latest valid OTP for this email and type
    const tokenRecord = await db.query.otpTokens.findFirst({
      where: and(
        eq(otpTokens.email, email),
        eq(otpTokens.otp, otp),
        eq(otpTokens.type, type),
        gt(otpTokens.expiresAt, new Date()) // Ensure it's not expired
      ),
      orderBy: [desc(otpTokens.createdAt)],
    });

    if (!tokenRecord) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    if (type === "RESET_PASSWORD") {
      if (!newPassword) {
        return NextResponse.json({ error: "New password is required" }, { status: 400 });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update the user's password
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, email));
        
    } else if (type === "VERIFY_ACCOUNT") {
      // Mark user as verified
      await db.update(users)
        .set({ isVerified: true })
        .where(eq(users.email, email));
    }

    // Delete the used token
    await db.delete(otpTokens).where(eq(otpTokens.id, tokenRecord.id));

    return NextResponse.json({ success: true, message: "Success" });
  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
