require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixSchema() {
  const db = await mysql.createPool({
    uri: process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log("Connecting to database...");
    
    console.log("Modifying unit column to VARCHAR...");
    await db.query("ALTER TABLE products MODIFY COLUMN unit VARCHAR(100) NOT NULL DEFAULT 'pcs'");
    console.log("Success modifying unit.");

    console.log("Adding unit_ecer column if not exists...");
    try {
      await db.query("ALTER TABLE products ADD COLUMN unit_ecer VARCHAR(100) NULL AFTER unit");
      console.log("Success adding unit_ecer.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("unit_ecer already exists.");
      } else {
        throw e;
      }
    }

    console.log("All fixes applied successfully!");
  } catch (err) {
    console.error("Error applying fixes:", err);
  } finally {
    await db.end();
  }
}

fixSchema();
