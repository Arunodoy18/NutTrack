import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signMobileJwt } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
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

    // Create the user
    const [newUser] = await db.insert(users).values({
      name: name || "",
      email,
      password: hashedPassword,
      isVerified: false,
    }).returning();

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
