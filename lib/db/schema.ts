import { pgTable, text, timestamp, integer, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- NextAuth tables for Drizzle adapter ---
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  meals: many(meals),
  dailyGoals: many(dailyGoals),
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
