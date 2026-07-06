CREATE TABLE IF NOT EXISTS "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"calories" integer DEFAULT 2000 NOT NULL,
	"protein" integer DEFAULT 80 NOT NULL,
	"fat" integer DEFAULT 65 NOT NULL,
	"carbs" integer DEFAULT 250 NOT NULL,
	"fiber" integer DEFAULT 30 NOT NULL,
	"sodium" integer DEFAULT 2300 NOT NULL,
	"iron" integer DEFAULT 18 NOT NULL,
	"calcium" integer DEFAULT 1000 NOT NULL,
	"vitamin_c" integer DEFAULT 90 NOT NULL,
	"potassium" integer DEFAULT 4700 NOT NULL,
	"vitamin_e" integer DEFAULT 15 NOT NULL,
	"vitamin_b12" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grocery_list" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ingredient_name" text NOT NULL,
	"is_purchased" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meal_items" (
	"id" text PRIMARY KEY NOT NULL,
	"meal_id" text NOT NULL,
	"name" text NOT NULL,
	"calories" integer DEFAULT 0 NOT NULL,
	"protein" integer DEFAULT 0 NOT NULL,
	"fat" integer DEFAULT 0 NOT NULL,
	"carbs" integer DEFAULT 0 NOT NULL,
	"fiber" integer DEFAULT 0 NOT NULL,
	"sodium" integer DEFAULT 0 NOT NULL,
	"iron" integer DEFAULT 0 NOT NULL,
	"calcium" integer DEFAULT 0 NOT NULL,
	"vitamin_c" integer DEFAULT 0 NOT NULL,
	"potassium" integer DEFAULT 0 NOT NULL,
	"vitamin_e" integer DEFAULT 0 NOT NULL,
	"vitamin_b12" integer DEFAULT 0 NOT NULL,
	"is_manual" boolean DEFAULT false NOT NULL,
	"estimated_quantity" text DEFAULT '100g'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"total_calories" integer DEFAULT 0 NOT NULL,
	"total_protein" integer DEFAULT 0 NOT NULL,
	"total_fat" integer DEFAULT 0 NOT NULL,
	"total_carbs" integer DEFAULT 0 NOT NULL,
	"total_fiber" integer DEFAULT 0 NOT NULL,
	"total_sodium" integer DEFAULT 0 NOT NULL,
	"total_iron" integer DEFAULT 0 NOT NULL,
	"total_calcium" integer DEFAULT 0 NOT NULL,
	"total_vitamin_c" integer DEFAULT 0 NOT NULL,
	"total_potassium" integer DEFAULT 0 NOT NULL,
	"total_vitamin_e" integer DEFAULT 0 NOT NULL,
	"total_vitamin_b12" integer DEFAULT 0 NOT NULL,
	"summary" text,
	"image_path" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"otp" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"razorpay_order_id" text NOT NULL,
	"razorpay_payment_id" text,
	"razorpay_signature" text,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"password" text,
	"is_verified" boolean DEFAULT false,
	"is_premium" boolean DEFAULT false,
	"premium_since" timestamp,
	"image" text,
	"otp_locked_until" timestamp,
	"dietary_preferences" text,
	"age" integer,
	"gender" text,
	"height_cm" integer,
	"weight_kg" integer,
	"birthdate" text,
	"activity_level" text,
	"body_fat" text,
	"primary_goal" text,
	"medical_conditions" text,
	"training_frequency" text,
	"profile_complete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_goals" ADD CONSTRAINT "daily_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "grocery_list" ADD CONSTRAINT "grocery_list_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
