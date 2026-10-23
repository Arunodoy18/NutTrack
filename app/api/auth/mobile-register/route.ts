import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signMobileJwt } from "@/lib/jwt";
import { checkAuthRateLimit, clientIp } from "@/lib/rateLimit";
import { cleanText, normalizeEmail, readJson, isUniqueViolation, hasControlChars, EMAIL_RE } from "@/lib/sanitize";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const name = cleanText(body?.name, 100);
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";

    if (typeof body?.email === "string" && hasControlChars(body.email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }
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

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already exists with this email" }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user. Two sign-ups racing for one email: the database's unique rule lets exactly one win.
    let newUser;
    try {
      [newUser] = await db.insert(users).values({ name: name || "", email, password: hashedPassword, isVerified: false }).returning();
    } catch (e) {
      if (isUniqueViolation(e)) return NextResponse.json({ error: "User already exists with this email" }, { status: 400 });
      throw e;
    }

    // Sign JWT
    const token = await signMobileJwt({ sub: newUser.id, email: newUser.email });

    return NextResponse.json({ 
      success: true, 
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        profileComplete: newUser.profileComplete,
      }
    });
  } catch (error: any) {
    console.error("Mobile Register Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
