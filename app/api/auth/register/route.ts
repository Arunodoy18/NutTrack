import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { checkAuthRateLimit, clientIp } from "@/lib/rateLimit";
import { cleanText, normalizeEmail, readJson, isUniqueViolation, EMAIL_RE } from "@/lib/sanitize";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const name = cleanText(body?.name, 100);
    const email = normalizeEmail(body?.email); // "Asha@Gmail.com" and "asha@gmail.com " are the same person
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "Password must be 8-128 characters" }, { status: 400 });
    }
    if (!(await checkAuthRateLimit(`register:${clientIp(req)}`))) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists with this email" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      await db.insert(users).values({ name, email, password: hashedPassword, isVerified: false });
    } catch (e) {
      if (isUniqueViolation(e)) return NextResponse.json({ error: "User already exists with this email" }, { status: 400 });
      throw e;
    }
    return NextResponse.json({ success: true, message: "Account created successfully" });
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
