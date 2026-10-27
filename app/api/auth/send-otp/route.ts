import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, otpTokens } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";
import { randomInt } from "crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { readJson } from "@/lib/sanitize";
const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

// Safe initialization of Upstash Redis rate limiter to prevent local dev crashes
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? Redis.fromEnv()
  : null;

const ratelimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "15 m"), // 3 OTP requests per 15 min per email
  prefix: "dietbuddy:otp",
}) : null;

export async function POST(req: Request) {
  try {
    const { email, type } = await readJson(req); // type: 'VERIFY_ACCOUNT' or 'RESET_PASSWORD'

    if (!email || !type) {
      return NextResponse.json({ error: "Email and type are required" }, { status: 400 });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    if (!cleanEmail.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Upstash Rate limiting check
    if (ratelimit) {
      const { success } = await ratelimit.limit(cleanEmail).catch((err: Error) => {
        console.error("[send-otp] rate limiter unavailable, allowing:", err.message);
        return { success: true };
      });
      if (!success) {
        return NextResponse.json(
          { error: "Too many attempts. Please wait 15 minutes before requesting another OTP." },
          { status: 429 }
        );
      }
    }

    // Check user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail)
    });

    // Always return success even if user not found for RESET_PASSWORD (prevent email enumeration)
    if (type === "RESET_PASSWORD" && !user) {
      return NextResponse.json({
        success: true,
        message: "If that email exists, an OTP has been sent.",
      });
    }

    if (type === "VERIFY_ACCOUNT" && !user) {
      return NextResponse.json({ error: "User not found." }, { status: 400 });
    }

    // Check if user is locked out
    if (user && user.otpLockedUntil && new Date(user.otpLockedUntil) > new Date()) {
      const remainingMins = Math.ceil((new Date(user.otpLockedUntil).getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Account locked due to too many failed attempts. Try again in ${remainingMins} minutes.` },
        { status: 429 }
      );
    }

    // No email service configured: say so instead of pretending a code was sent.
    if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === "production") {
      console.error("[send-otp] RESEND_API_KEY is not set; cannot send email");
      return NextResponse.json({ error: "Password reset by email isn't available right now. Please try again later." }, { status: 503 });
    }

    // Generate a 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();

    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Clean up older tokens for this email and type
    await db.delete(otpTokens).where(
      and(
        eq(otpTokens.email, cleanEmail),
        eq(otpTokens.type, type)
      )
    );

    // Save OTP to database
    await db.insert(otpTokens).values({
      email: cleanEmail,
      otp,
      expiresAt,
      type,
    });

    // Send the email via Resend
    if (process.env.RESEND_API_KEY) {
      const { error: resendError } = await resend.emails.send({
        from: process.env.MAIL_FROM || "Nura <onboarding@resend.dev>", // onboarding@resend.dev only delivers to the Resend account owner; set MAIL_FROM to an address on a verified domain
        to: [cleanEmail],
        subject: type === "RESET_PASSWORD" ? "Your Nura Password Reset OTP" : "Verify Your Nura Account",
        html: `
          <div style="font-family:Inter,sans-serif;max-width:400px;margin:0 auto;padding:32px;">
            <h2 style="font-size:24px;font-weight:700;margin-bottom:8px;">
              ${type === "RESET_PASSWORD" ? "Reset your password" : "Verify your account"}
            </h2>
            <p style="color:#64748B;margin-bottom:24px;">
              Use the code below to ${type === "RESET_PASSWORD" ? "reset your Nura password" : "verify your Nura account"}. It expires in 10 minutes.
            </p>
            <div style="background:#F1F5F9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0A0F1E;">${otp}</span>
            </div>
            <p style="font-size:12px;color:#94A3B8;">If you didn't request this, ignore this email. Your credentials will not change.</p>
          </div>
        `,
      });

      if (resendError) {
        console.error("[send-otp] Resend error:", resendError);
        return NextResponse.json(
          { error: "We couldn't send the email right now. Please try again later." },
          { status: 502 }
        );
      }
    } else {
      console.log(`[DEV MODE] OTP for ${cleanEmail}: ${otp}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: "If that email exists, an OTP has been sent." 
    });
  } catch (error: any) {
    console.error("Send OTP Error:", error?.message || error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
