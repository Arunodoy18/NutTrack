// Read-only helper: node scripts/qa/db.mjs "<sql>"  (prints rows as JSON). Only for QA accounts.
import pg from "pg";
import { config } from "dotenv";
config({ path: new URL("../../.env.local", import.meta.url).pathname, quiet: true });
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await db.query(process.argv[2], process.argv.slice(3));
console.log(JSON.stringify(r.rows));
await db.end();
