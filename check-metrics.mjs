import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check if portfolioMetricsHistory table exists and has data
const [tables] = await connection.query("SHOW TABLES LIKE 'portfolio_metrics_history'");
console.log("Table exists:", tables.length > 0);

if (tables.length > 0) {
  const [rows] = await connection.query("SELECT COUNT(*) as count FROM portfolio_metrics_history");
  console.log("Row count:", rows[0].count);
  
  const [sample] = await connection.query("SELECT * FROM portfolio_metrics_history LIMIT 3");
  console.log("Sample data:", JSON.stringify(sample, null, 2));
} else {
  console.log("Table portfolio_metrics_history does not exist");
}

// Check economic_indicators
const [ecoTables] = await connection.query("SHOW TABLES LIKE 'economic_indicators'");
console.log("\nEconomic indicators table exists:", ecoTables.length > 0);

if (ecoTables.length > 0) {
  const [ecoRows] = await connection.query("SELECT COUNT(*) as count FROM economic_indicators");
  console.log("Economic indicators count:", ecoRows[0].count);
}

await connection.end();
