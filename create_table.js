const mysql = require('mysql2/promise');
require('dotenv').config();
async function main() {
  const db = await mysql.createPool(process.env.DB_URL);
  await db.query(
    CREATE TABLE IF NOT EXISTS ngitung_sales (
      id VARCHAR(50) PRIMARY KEY,
      date VARCHAR(20) NOT NULL,
      customer_name VARCHAR(100),
      total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      status VARCHAR(50),
      items TEXT,
      installments TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  );
  console.log('Table ngitung_sales created.');
  process.exit(0);
}
main();
