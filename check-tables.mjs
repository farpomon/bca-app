import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [tables] = await connection.query('SHOW TABLES');
console.log('Tables in database:');
tables.forEach(t => console.log(Object.values(t)[0]));
await connection.end();
