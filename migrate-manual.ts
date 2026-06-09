import { sql } from 'drizzle-orm';
import { db } from './lib/db';

async function run() {
  try {
    console.log("Applying manual migrations...");
    await db.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_premium" boolean DEFAULT false;`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "razorpay_order_id" text NOT NULL,
        "razorpay_payment_id" text,
        "razorpay_signature" text,
        "amount" integer NOT NULL,
        "status" text NOT NULL DEFAULT 'created',
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("Migration successful!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
  process.exit(0);
}
run();
