// Prints the latest tester feedback.   node scripts/qa/feedback.mjs [count]
import pg from "pg";
import { config } from "dotenv";
config({ path: new URL("../../.env.local", import.meta.url).pathname, quiet: true });
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const n = Math.min(100, Number(process.argv[2]) || 20);
const r = await db.query(`select f.created_at, f.category, f.app_version, f.screen, coalesce(u.email,'(deleted account)') email, f.message from feedback f left join "user" u on u.id=f.user_id order by f.created_at desc limit $1`, [n]);
if (!r.rows.length) console.log("No feedback yet.");
for (const x of r.rows) console.log(`\n[${x.created_at.toISOString().slice(0,16).replace("T"," ")}] ${x.category.toUpperCase()}  v${x.app_version ?? "?"}  ${x.screen ?? ""}  ${x.email}\n${x.message}`);
await db.end();
