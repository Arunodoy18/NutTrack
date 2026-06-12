import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, otpTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

export async function POST(req: Request) {
  try {
    const { email, type } = await req.json(); // type: 'VERIFY_ACCOUNT' or 'RESET_PASSWORD'

    if (!email || !type) {
      return NextResponse.json({ error: "Email and type are required" }, { status: 400 });
    }

    // Check if user is locked out
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (user && user.otpLockedUntil && new Date(user.otpLockedUntil) > new Date()) {
      const remainingMins = Math.ceil((new Date(user.otpLockedUntil).getTime() - Date.now()) / 60000);
      return NextResponse.json({ error: `Account locked due to too many failed attempts. Try again in ${remainingMins} minutes.` }, { status: 429 });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP to database
    await db.insert(otpTokens).values({
      email,
      otp,
      expiresAt,
      type,
    });

    // Send the email via Resend
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: "Acme <onboarding@resend.dev>", // Replace with verified domain in production
        to: [email],
        subject: type === "RESET_PASSWORD" ? "Reset Your Password" : "Verify Your Account",
        html: `
          <h1>dietBuddy Verification</h1>
          <p>Your one-time password (OTP) is: <strong>${otp}</strong></p>
          <p>This code will expire in 10 minutes.</p>
        `,
      });
    } else {
      console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
    }

    return NextResponse.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    console.error("Send OTP Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
