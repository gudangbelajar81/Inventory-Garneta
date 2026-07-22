require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const vpsDbUrl = process.env.DB_URL;
  if (!vpsDbUrl) {
    console.log('No VPS DB_URL found. Skipping.');
    return;
  }
  const connection = await mysql.createConnection(vpsDbUrl);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ngitung_sales (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      date DATETIME NOT NULL,
      customer_name VARCHAR(120) NULL,
      total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      status ENUM('Lunas', 'Hutang') NOT NULL DEFAULT 'Lunas',
      items JSON NULL,
      installments JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Fixed ngitung_sales table!');
  await connection.end();
  process.exit(0);
}
run().catch(console.error);
