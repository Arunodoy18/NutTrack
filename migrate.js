const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Adding potassium to meals...');
    await client.query('ALTER TABLE "meals" ADD COLUMN IF NOT EXISTS "total_potassium" integer DEFAULT 0 NOT NULL;');
    await client.query('ALTER TABLE "meals" ADD COLUMN IF NOT EXISTS "total_vitamin_e" integer DEFAULT 0 NOT NULL;');
    await client.query('ALTER TABLE "meals" ADD COLUMN IF NOT EXISTS "total_vitamin_b12" integer DEFAULT 0 NOT NULL;');

    console.log('Adding micros to meal_items...');
    await client.query('ALTER TABLE "meal_items" ADD COLUMN IF NOT EXISTS "potassium" integer DEFAULT 0 NOT NULL;');
    await client.query('ALTER TABLE "meal_items" ADD COLUMN IF NOT EXISTS "vitamin_e" integer DEFAULT 0 NOT NULL;');
    await client.query('ALTER TABLE "meal_items" ADD COLUMN IF NOT EXISTS "vitamin_b12" integer DEFAULT 0 NOT NULL;');

    console.log('Adding micros to daily_goals...');
    await client.query('ALTER TABLE "daily_goals" ADD COLUMN IF NOT EXISTS "potassium" integer DEFAULT 4700 NOT NULL;');
    await client.query('ALTER TABLE "daily_goals" ADD COLUMN IF NOT EXISTS "vitamin_e" integer DEFAULT 15 NOT NULL;');
    await client.query('ALTER TABLE "daily_goals" ADD COLUMN IF NOT EXISTS "vitamin_b12" integer DEFAULT 2 NOT NULL;');

    console.log('Migration successful.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}
main();
