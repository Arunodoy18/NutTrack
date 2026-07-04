import { pgTable, text, timestamp, integer, boolean, primaryKey } from 'drizzle-orm/pg-core';
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
  totalFiber: integer("total_fiber").notNull().default(0),
  totalSodium: integer("total_sodium").notNull().default(0),
  totalIron: integer("total_iron").notNull().default(0),
  totalCalcium: integer("total_calcium").notNull().default(0),
  totalVitaminC: integer("total_vitamin_c").notNull().default(0),
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
  fiber: integer("fiber").notNull().default(0),
  sodium: integer("sodium").notNull().default(0),
  iron: integer("iron").notNull().default(0),
  calcium: integer("calcium").notNull().default(0),
  vitaminC: integer("vitamin_c").notNull().default(0),
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
  fiber: integer("fiber").notNull().default(30),
  sodium: integer("sodium").notNull().default(2300),
  iron: integer("iron").notNull().default(18),
  calcium: integer("calcium").notNull().default(1000),
  vitaminC: integer("vitamin_c").notNull().default(90),
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
