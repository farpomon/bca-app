import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check the table structure
const [columns] = await connection.query("SHOW COLUMNS FROM portfolio_metrics_history");
console.log("Table columns:", columns.map(c => c.Field));

// Check if there's a metadata column
const hasMetadata = columns.some(c => c.Field === 'metadata');
console.log("\nHas metadata column:", hasMetadata);

await connection.end();
