const { Pool } = require('pg');


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log("Altering meals table...");
    await client.query(`
      ALTER TABLE meals ADD COLUMN IF NOT EXISTS total_sodium INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE meals ADD COLUMN IF NOT EXISTS total_iron INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE meals ADD COLUMN IF NOT EXISTS total_calcium INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE meals ADD COLUMN IF NOT EXISTS total_vitamin_c INTEGER NOT NULL DEFAULT 0;
    `);

    console.log("Altering meal_items table...");
    await client.query(`
      ALTER TABLE meal_items ADD COLUMN IF NOT EXISTS sodium INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE meal_items ADD COLUMN IF NOT EXISTS iron INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE meal_items ADD COLUMN IF NOT EXISTS calcium INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE meal_items ADD COLUMN IF NOT EXISTS vitamin_c INTEGER NOT NULL DEFAULT 0;
    `);

    console.log("Altering daily_goals table...");
    await client.query(`
      ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS sodium INTEGER NOT NULL DEFAULT 2300;
      ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS iron INTEGER NOT NULL DEFAULT 18;
      ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS calcium INTEGER NOT NULL DEFAULT 1000;
      ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS vitamin_c INTEGER NOT NULL DEFAULT 90;
    `);

    await client.query('COMMIT');
    console.log("Successfully added micro columns!");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Error:", e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
