import { pgTable, text, timestamp, integer, boolean, primaryKey, real, jsonb, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- NextAuth tables for Drizzle adapter ---
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  password: text("password"),
  isVerified: boolean("is_verified").default(false),
  isPremium: boolean("is_premium").default(false),
  premiumSince: timestamp("premium_since", { mode: "date" }),
  image: text("image"),
  otpLockedUntil: timestamp("otp_locked_until", { mode: "date" }),
  dietaryPreferences: text("dietary_preferences"),
  // Profile Setup fields
  age: integer("age"),
  gender: text("gender"),
  heightCm: integer("height_cm"),
  weightKg: integer("weight_kg"),
  birthdate: text("birthdate"),
  activityLevel: text("activity_level"),
  bodyFat: text("body_fat"),
  primaryGoal: text("primary_goal"),
  medicalConditions: text("medical_conditions"),
  trainingFrequency: text("training_frequency"),
  profileComplete: boolean("profile_complete").default(false),
  // Family profiles: a managed profile (e.g. a child) is a user row owned by a parent.
  // It has no credentials of its own and is deleted with its parent (cascade).
  parentId: text("parent_id").references((): AnyPgColumn => users.id, { onDelete: "cascade" }),
  avatar: text("avatar"),
  relation: text("relation"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

export const otpTokens = pgTable("otp_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  type: text("type").notNull(), // 'VERIFY_ACCOUNT' or 'RESET_PASSWORD'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  attempts: integer("attempts").default(0).notNull(),
});

// --- App Specific tables: Meals, MealItems, DailyGoals ---

export const meals = pgTable("meals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  totalCalories: integer("total_calories").notNull().default(0),
  totalProtein: integer("total_protein").notNull().default(0),
  totalFat: integer("total_fat").notNull().default(0),
  totalCarbs: integer("total_carbs").notNull().default(0),
  totalFiber: integer("total_fiber").notNull().default(0),
  totalSodium: integer("total_sodium").notNull().default(0),
  totalIron: integer("total_iron").notNull().default(0),
  totalCalcium: integer("total_calcium").notNull().default(0),
  totalVitaminC: integer("total_vitamin_c").notNull().default(0),
  totalPotassium: integer("total_potassium").notNull().default(0),
  totalVitaminE: integer("total_vitamin_e").notNull().default(0),
  totalVitaminB12: integer("total_vitamin_b12").notNull().default(0),
  mealSession: text("meal_session").default("Snack"),
  summary: text("summary"),
  imagePath: text("image_path"),
});

export const mealItems = pgTable("meal_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  mealId: text("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  calories: integer("calories").notNull().default(0),
  protein: integer("protein").notNull().default(0),
  fat: integer("fat").notNull().default(0),
  carbs: integer("carbs").notNull().default(0),
  fiber: integer("fiber").notNull().default(0),
  sodium: integer("sodium").notNull().default(0),
  iron: integer("iron").notNull().default(0),
  calcium: integer("calcium").notNull().default(0),
  vitaminC: integer("vitamin_c").notNull().default(0),
  potassium: integer("potassium").notNull().default(0),
  vitaminE: integer("vitamin_e").notNull().default(0),
  vitaminB12: integer("vitamin_b12").notNull().default(0),
  isManual: boolean("is_manual").notNull().default(false),
  estimatedQuantity: text("estimated_quantity").default("100g"),
});

export const dailyGoals = pgTable("daily_goals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  calories: integer("calories").notNull().default(2000),
  protein: integer("protein").notNull().default(80),
  fat: integer("fat").notNull().default(65),
  carbs: integer("carbs").notNull().default(250),
  fiber: integer("fiber").notNull().default(30),
  sodium: integer("sodium").notNull().default(2300),
  iron: integer("iron").notNull().default(18),
  calcium: integer("calcium").notNull().default(1000),
  vitaminC: integer("vitamin_c").notNull().default(90),
  potassium: integer("potassium").notNull().default(4700),
  vitaminE: integer("vitamin_e").notNull().default(15),
  vitaminB12: integer("vitamin_b12").notNull().default(2), // 2.4mcg is standard, rounded to 2 or 3. Let's use 2 as default int, or 3. Let's use 2.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  razorpayOrderId: text("razorpay_order_id").notNull(),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpaySignature: text("razorpay_signature"),
  amount: integer("amount").notNull(), // Amount in paise
  status: text("status").notNull().default("created"), // 'created', 'paid', 'failed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groceryList = pgTable("grocery_list", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ingredientName: text("ingredient_name").notNull(),
  isPurchased: boolean("is_purchased").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  meals: many(meals),
  dailyGoals: many(dailyGoals),
  groceryList: many(groceryList),
}));

export const mealsRelations = relations(meals, ({ one, many }) => ({
  user: one(users, {
    fields: [meals.userId],
    references: [users.id],
  }),
  items: many(mealItems),
}));

export const mealItemsRelations = relations(mealItems, ({ one }) => ({
  meal: one(meals, {
    fields: [mealItems.mealId],
    references: [meals.id],
  }),
}));

export const dailyGoalsRelations = relations(dailyGoals, ({ one }) => ({
  user: one(users, {
    fields: [dailyGoals.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const groceryListRelations = relations(groceryList, ({ one }) => ({
  user: one(users, {
    fields: [groceryList.userId],
    references: [users.id],
  }),
}));


/* ─── Water, weight and reminders ─── */

/** One drink. Totals are summed per day per profile. */
export const waterLogs = pgTable("water_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountMl: integer("amount_ml").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

/** One weigh-in for a profile. */
export const weightLogs = pgTable("weight_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weightKg: real("weight_kg").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

/** A device that can receive push notifications for an ACCOUNT. */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Reminder preferences for an ACCOUNT (times are local to `timezone`). */
export const reminderSettings = pgTable("reminder_settings", {
  ownerId: text("owner_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  settings: jsonb("settings").notNull().default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** De-duplication: which reminder was already sent today (key like "meal:lunch:2026-10-10"). */
export const reminderSent = pgTable(
  "reminder_sent",
  {
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.ownerId, t.key] }) })
);


/* ─── Activity & connected devices ─── */

/** One day of movement for a profile from one source (health app, watch, manual). Local calendar day. */
export const activityDays = pgTable(
  "activity_days",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    day: text("day").notNull(), // YYYY-MM-DD in the device's local time zone
    source: text("source").notNull(),
    steps: integer("steps").notNull().default(0),
    activeKcal: integer("active_kcal").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.day, t.source] }) })
);

export const workouts = pgTable("workouts", {
  id: text("id").primaryKey(), // deterministic per (profile, source, external id) → imports are idempotent
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull(),
  minutes: integer("minutes").notNull(),
  kcal: integer("kcal").notNull().default(0),
  kind: text("kind").notNull().default("other"),
  title: text("title"),
  source: text("source").notNull(),
});

/** A phone/watch app paired to an ACCOUNT, syncing data for one PROFILE. Only the token's hash is stored. */
export const deviceTokens = pgTable("device_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: text("profile_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  label: text("label"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at"),
  revoked: boolean("revoked").notNull().default(false),
});

/** Short-lived, single-use code the signed-in web app shows so the native app can pair itself. */
export const pairingCodes = pgTable("pairing_codes", {
  codeHash: text("code_hash").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: text("profile_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});

export const activitySettings = pgTable("activity_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  creditEnabled: boolean("credit_enabled").notNull().default(false),
  creditPct: integer("credit_pct").notNull().default(50),
});

/** What testers tell us from inside the app (bugs, ideas). Read with scripts/qa/feedback.mjs. */
export const feedback = pgTable("feedback", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  category: text("category").notNull().default("other"),
  message: text("message").notNull(),
  appVersion: text("app_version"),
  screen: text("screen"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
