// Additive, idempotent migration: water, weight, push subscriptions, reminder settings.
//   node scripts/migrate-tracking.mjs           -> dry run
//   node scripts/migrate-tracking.mjs --apply   -> applies in one transaction, verifies row counts
// Rollback: DROP TABLE reminder_sent, reminder_settings, push_subscriptions, weight_logs, water_logs;
import { config } from "dotenv";
import pg from "pg";
config({ path: ".env.local", quiet: true });
const apply = process.argv.includes("--apply");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const count = async (t) => { try { return (await pool.query(`select count(*)::int n from "${t}"`)).rows[0].n; } catch { return "missing"; } };
const tables = ["user", "meals", "meal_items", "daily_goals", "water_logs", "weight_logs", "push_subscriptions", "reminder_settings", "reminder_sent"];
const snap = async () => Object.fromEntries(await Promise.all(tables.map(async (t) => [t, await count(t)])));
const before = await snap();
console.log("before:", before);
if (!apply) { console.log("\nDRY RUN — nothing changed. Re-run with --apply."); await pool.end(); process.exit(0); }

await pool.query("begin");
try {
  await pool.query(`create table if not exists water_logs (
    id text primary key,
    user_id text not null references "user"(id) on delete cascade,
    amount_ml integer not null,
    "timestamp" timestamp not null default now())`);
  await pool.query(`create index if not exists water_logs_user_ts_idx on water_logs(user_id, "timestamp")`);
  await pool.query(`create table if not exists weight_logs (
    id text primary key,
    user_id text not null references "user"(id) on delete cascade,
    weight_kg real not null,
    "timestamp" timestamp not null default now())`);
  await pool.query(`create index if not exists weight_logs_user_ts_idx on weight_logs(user_id, "timestamp")`);
  await pool.query(`create table if not exists push_subscriptions (
    id text primary key,
    owner_id text not null references "user"(id) on delete cascade,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    created_at timestamp not null default now())`);
  await pool.query(`create index if not exists push_subscriptions_owner_idx on push_subscriptions(owner_id)`);
  await pool.query(`create table if not exists reminder_settings (
    owner_id text primary key references "user"(id) on delete cascade,
    enabled boolean not null default false,
    timezone text not null default 'Asia/Kolkata',
    settings jsonb not null default '{}'::jsonb,
    updated_at timestamp not null default now())`);
  await pool.query(`create table if not exists reminder_sent (
    owner_id text not null references "user"(id) on delete cascade,
    key text not null,
    sent_at timestamp not null default now(),
    primary key (owner_id, key))`);
  await pool.query("commit");
} catch (e) {
  await pool.query("rollback");
  console.error("FAILED, rolled back:", e.message);
  process.exit(1);
}
const after = await snap();
console.log("after: ", after);
const untouched = ["user", "meals", "meal_items", "daily_goals"].every((t) => before[t] === after[t]);
console.log(untouched ? "OK — existing data untouched, new tables created." : "WARNING — existing row counts changed!");
await pool.end();
process.exit(untouched ? 0 : 1);
