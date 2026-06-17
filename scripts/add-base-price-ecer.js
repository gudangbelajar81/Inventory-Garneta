require("dotenv").config({ quiet: true });

const mysql = require("mysql2/promise");
const { databaseConfig } = require("../config/database");
const logger = require("../config/logger");

const dbConfig = databaseConfig();
const database = dbConfig.database;

async function createConnection() {
  try {
    return await mysql.createConnection({ ...dbConfig, database });
  } catch (error) {
    if (error.code !== "ER_BAD_DB_ERROR") throw error;

    const connection = await mysql.createConnection({ ...dbConfig, database: undefined });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await connection.query(`USE \`${database}\``);
    return connection;
  }
}

async function migrate() {
  const connection = await createConnection();
  try {
    // Check if base_price_ecer column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'base_price_ecer'
    `, [database]);

    if (columns.length === 0) {
      // Add base_price_ecer column
      await connection.query(`
        ALTER TABLE products 
        ADD COLUMN base_price_ecer DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER base_price
      `);
      logger.info("Column base_price_ecer added to products table");
    } else {
      logger.info("Column base_price_ecer already exists in products table");
    }

    logger.info("Migration completed successfully");
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  logger.error("Migration failed", { error: error.message });
  process.exit(1);
});
