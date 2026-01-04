import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // Add the metadata column if it doesn't exist
  await connection.query(`
    ALTER TABLE portfolio_metrics_history 
    ADD COLUMN metadata JSON
  `);
  console.log("Added metadata column to portfolio_metrics_history");
} catch (error) {
  if (error.code === 'ER_DUP_FIELDNAME') {
    console.log("metadata column already exists");
  } else {
    console.error("Error:", error.message);
  }
}

await connection.end();
