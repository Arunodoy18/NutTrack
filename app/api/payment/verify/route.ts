import { FREE_FOR_ALL } from "@/lib/plan";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  if (FREE_FOR_ALL) return NextResponse.json({ error: "Payments are disabled: Nura is free." }, { status: 410 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

  // Server-side signature verification — cannot be faked by client
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // Only upgrade after verified
  await db.update(users)
    .set({ isPremium: true, premiumSince: new Date() })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}
