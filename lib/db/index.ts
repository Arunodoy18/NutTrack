import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// We fall back to the provided Neon PostgreSQL connection string if the environment variable is not defined
const connectionString = 
  process.env.DATABASE_URL || 
  "postgresql://neondb_owner:npg_NKsVZpE0Lc9S@ep-bold-thunder-aqhni6ut-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(connectionString);

/**
 * Main database connection pool configured for Neon HTTP serverless clients
 */
export const db = drizzle(sql, { schema });
