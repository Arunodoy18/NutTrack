const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to DB.");

    // Check if column exists
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='meals' and column_name='meal_session';
    `);

    if (res.rowCount === 0) {
      console.log("Adding meal_session to meals...");
      await client.query(`ALTER TABLE meals ADD COLUMN meal_session TEXT DEFAULT 'Snack';`);
      console.log("Column added.");
    } else {
      console.log("Column meal_session already exists.");
    }

  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    await client.end();
    console.log("Disconnected.");
  }
}

migrate();
