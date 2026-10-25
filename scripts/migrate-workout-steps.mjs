// Additive, idempotent: adds workouts.steps (phone-counted steps for live workouts). Dry run by default; pass --apply to run it.
import pg from "pg";
import { config } from "dotenv";
config({ path: new URL("../.env.local", import.meta.url).pathname, quiet: true });
const apply = process.argv.includes("--apply");
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const sql = `alter table workouts add column if not exists steps integer;`;
console.log(apply ? "Applying…" : "DRY RUN (use --apply). Would run:\n" + sql);
if (apply) { await db.query(sql); console.log("OK — workouts.steps ready;", (await db.query("select count(*)::int c from workouts")).rows[0].c, "existing workouts untouched"); }
await db.end();
