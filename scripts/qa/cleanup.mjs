// Deletes every disposable QA account (and their data, by cascade). Needs DATABASE_URL in .env.local.
import pg from "pg";
import { config } from "dotenv";
config({ path: new URL("../../.env.local", import.meta.url).pathname, quiet: true });
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await db.query(`delete from "user" where email like 'nura.%@example.com' or email like 'profile-%@family.invalid'`);
const r = await db.query(`select count(*)::int c from "user" where email like 'nura.%@example.com'`);
console.log("remaining QA accounts:", r.rows[0].c);
await db.end();
