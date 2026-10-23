// Additive, idempotent: creates the feedback table. Dry run by default; pass --apply to run it.
import pg from "pg";
import { config } from "dotenv";
config({ path: new URL("../.env.local", import.meta.url).pathname, quiet: true });
const apply = process.argv.includes("--apply");
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const sql = `create table if not exists feedback (
  id text primary key,
  user_id text references "user"(id) on delete set null,
  category text not null default 'other',
  message text not null,
  app_version text,
  screen text,
  created_at timestamp not null default now()
); create index if not exists feedback_created_idx on feedback (created_at desc);`;
console.log(apply ? "Applying…" : "DRY RUN (use --apply). Would run:\n" + sql);
if (apply) { await db.query(sql); console.log("OK — feedback table ready;", (await db.query("select count(*)::int c from feedback")).rows[0].c, "rows"); }
await db.end();
