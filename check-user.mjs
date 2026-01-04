import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check the user table structure and data
const [users] = await connection.query("SELECT * FROM users ORDER BY id DESC LIMIT 5");
console.log("Users:", JSON.stringify(users, null, 2));

// Check if there's a company field
const [columns] = await connection.query("SHOW COLUMNS FROM users");
console.log("\nUser table columns:", columns.map(c => c.Field));

await connection.end();
