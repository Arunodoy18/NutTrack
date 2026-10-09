// Additive, idempotent migration for family profiles.
//   node scripts/migrate-family.mjs            -> dry run (prints plan + current counts)
//   node scripts/migrate-family.mjs --apply    -> backs up the user table locally, applies, verifies
// Rollback (if ever needed):
//   ALTER TABLE "user" DROP COLUMN parent_id, DROP COLUMN avatar, DROP COLUMN relation;
import { config } from "dotenv";
import pg from "pg";
import { mkdirSync, writeFileSync } from "node:fs";

config({ path: ".env.local", quiet: true });
const apply = process.argv.includes("--apply");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const counts = async () => {
  const out = {};
  for (const t of ["user", "meals", "meal_items", "daily_goals", "grocery_list", "payments"]) {
    try { out[t] = (await pool.query(`select count(*)::int n from "${t}"`)).rows[0].n; } catch { out[t] = "n/a"; }
  }
  return out;
};
const cols = async () =>
  (await pool.query(`select column_name from information_schema.columns where table_name='user' and column_name in ('parent_id','avatar','relation')`)).rows.map(r => r.column_name).sort();

const before = await counts();
console.log("row counts before:", before);
console.log("family columns present:", await cols());

if (!apply) { console.log("\nDRY RUN — nothing changed. Re-run with --apply."); await pool.end(); process.exit(0); }

// 1) local backup of the user table (credentials hashes included — keep this file private)
mkdirSync("backups", { recursive: true });
const rows = (await pool.query(`select * from "user"`)).rows;
const file = `backups/user-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(rows, null, 2), { mode: 0o600 });
console.log(`backed up ${rows.length} users -> ${file}`);

// 2) apply (all additive + nullable; safe to re-run)
await pool.query("begin");
try {
  await pool.query(`alter table "user" add column if not exists parent_id text references "user"(id) on delete cascade`);
  await pool.query(`alter table "user" add column if not exists avatar text`);
  await pool.query(`alter table "user" add column if not exists relation text`);
  await pool.query(`create index if not exists user_parent_id_idx on "user"(parent_id)`);
  await pool.query("commit");
} catch (e) {
  await pool.query("rollback");
  console.error("FAILED, rolled back:", e.message);
  process.exit(1);
}

// 3) verify nothing was lost
const after = await counts();
console.log("row counts after: ", after);
console.log("family columns present:", await cols());
const same = Object.keys(before).every(k => before[k] === after[k]);
console.log(same ? "OK — counts unchanged, columns added." : "WARNING — counts differ!");
await pool.end();
process.exit(same ? 0 : 1);
