import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, otpTokens } from "@/lib/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
    const type = body?.type;
    const newPassword = body?.newPassword;

    if (!email || !otp || (type !== "RESET_PASSWORD" && type !== "VERIFY_ACCOUNT")) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find the latest active OTP attempt (ignoring the actual otp value for a moment to track attempts)
    const activeToken = await db.query.otpTokens.findFirst({
      where: and(
        eq(otpTokens.email, email),
        eq(otpTokens.type, type),
        gt(otpTokens.expiresAt, new Date())
      ),
      orderBy: [desc(otpTokens.createdAt)],
    });

    if (!activeToken) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    if (activeToken.otp !== otp) {
      const newAttempts = activeToken.attempts + 1;
      
      if (newAttempts >= 5) {
        // Lock out the user for 15 minutes
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await db.update(users)
          .set({ otpLockedUntil: lockUntil })
          .where(eq(users.email, email));
          
        await db.delete(otpTokens).where(eq(otpTokens.id, activeToken.id));
        return NextResponse.json({ error: "Too many failed attempts. Account locked for 15 minutes." }, { status: 429 });
      } else {
        await db.update(otpTokens)
          .set({ attempts: newAttempts })
          .where(eq(otpTokens.id, activeToken.id));
        return NextResponse.json({ error: `Invalid OTP. You have ${5 - newAttempts} attempts remaining.` }, { status: 400 });
      }
    }

    // Token is valid
    const tokenRecord = activeToken;

    if (type === "RESET_PASSWORD") {
      if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
        return NextResponse.json({ error: "New password must be 8-128 characters" }, { status: 400 });
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
