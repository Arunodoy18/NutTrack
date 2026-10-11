// Additive, idempotent migration: activity_days, workouts, device_tokens, pairing_codes, activity_settings.
//   node scripts/migrate-activity.mjs          -> dry run
//   node scripts/migrate-activity.mjs --apply  -> one transaction, verifies existing row counts are unchanged
// Rollback: DROP TABLE activity_settings, pairing_codes, device_tokens, workouts, activity_days;
import { config } from "dotenv";
import pg from "pg";
config({ path: ".env.local", quiet: true });
const apply = process.argv.includes("--apply");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 20000 });
const count = async (t) => { try { return (await pool.query(`select count(*)::int n from "${t}"`)).rows[0].n; } catch { return "missing"; } };
const tables = ["user", "meals", "meal_items", "water_logs", "weight_logs", "activity_days", "workouts", "device_tokens", "pairing_codes", "activity_settings"];
const snap = async () => Object.fromEntries(await Promise.all(tables.map(async (t) => [t, await count(t)])));
const before = await snap();
console.log("before:", before);
if (!apply) { console.log("\nDRY RUN — nothing changed. Re-run with --apply."); await pool.end(); process.exit(0); }
await pool.query("begin");
try {
  await pool.query(`create table if not exists activity_days (
    user_id text not null references "user"(id) on delete cascade,
    day text not null, source text not null,
    steps integer not null default 0, active_kcal integer not null default 0,
    updated_at timestamp not null default now(),
    primary key (user_id, day, source))`);
  await pool.query(`create table if not exists workouts (
    id text primary key, user_id text not null references "user"(id) on delete cascade,
    started_at timestamp not null, minutes integer not null, kcal integer not null default 0,
    kind text not null default 'other', title text, source text not null)`);
  await pool.query(`create index if not exists workouts_user_started_idx on workouts(user_id, started_at)`);
  await pool.query(`create table if not exists device_tokens (
    id text primary key, owner_id text not null references "user"(id) on delete cascade,
    profile_id text not null references "user"(id) on delete cascade,
    token_hash text not null unique, label text,
    created_at timestamp not null default now(), last_seen_at timestamp, revoked boolean not null default false)`);
  await pool.query(`create index if not exists device_tokens_owner_idx on device_tokens(owner_id)`);
  await pool.query(`create table if not exists pairing_codes (
    code_hash text primary key, owner_id text not null references "user"(id) on delete cascade,
    profile_id text not null references "user"(id) on delete cascade, expires_at timestamp not null)`);
  await pool.query(`create table if not exists activity_settings (
    user_id text primary key references "user"(id) on delete cascade,
    credit_enabled boolean not null default false, credit_pct integer not null default 50)`);
  await pool.query("commit");
} catch (e) { await pool.query("rollback"); console.error("FAILED, rolled back:", e.message); process.exit(1); }
const after = await snap();
console.log("after: ", after);
const ok = ["user", "meals", "meal_items", "water_logs", "weight_logs"].every((t) => before[t] === after[t]);
console.log(ok ? "OK — existing data untouched, new tables created." : "WARNING — existing row counts changed!");
await pool.end();
process.exit(ok ? 0 : 1);
