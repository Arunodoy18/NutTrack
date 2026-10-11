import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// No fallback credentials in source. A missing URL only fails when a query actually runs (keeps `next build` working).
const connectionString = process.env.DATABASE_URL || "postgresql://missing:missing@localhost/missing";

// Next.js 14 caches fetch() results; the Neon driver talks over fetch, so without this identical queries
// (e.g. "is this device token revoked?") could be answered from a stale cache. Always hit the database.
const sql = neon(connectionString, { fetchOptions: { cache: "no-store" } });

/**
 * Main database connection pool configured for Neon HTTP serverless clients
 */
export const db = drizzle(sql, { schema });
