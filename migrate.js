require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { databaseConfig } = require("./config/database");
const logger = require("./config/logger");

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

function prepareSql(sql) {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .filter((statement) => !/^CREATE\s+DATABASE\b/i.test(statement))
    .filter((statement) => !/^USE\s+/i.test(statement))
    .map((statement) => statement.replace(/^CREATE\s+TABLE\b/i, "CREATE TABLE IF NOT EXISTS"))
    .join(";\n");
}

async function migrate() {
  const schemaPath = path.join(__dirname, "database", "schema.sql");
  const rawSql = fs.readFileSync(schemaPath, "utf8");
  const sql = prepareSql(rawSql);

  if (!sql) {
    logger.info("Tidak ada statement migrasi yang dijalankan.");
    return;
  }

  const connection = await createConnection();
  try {
    await connection.query(sql);
    logger.info(`Skema database dasar selesai: ${database}`);

    // Jalankan migrasi ALTER TABLE aman (idempotent jika dimungkinkan, atau ignore error)
    try {
      await connection.query(`ALTER TABLE purchases MODIFY supplier_id BIGINT UNSIGNED NULL`);
      logger.info(`Migrasi: purchases.supplier_id dibuat NULLable`);
    } catch (e) {
      // Abaikan jika error
    }

    try {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'base_price_ecer'
      `, [database]);
      if (columns.length === 0) {
        await connection.query(`ALTER TABLE products ADD COLUMN base_price_ecer DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER base_price`);
        logger.info(`Migrasi: products.base_price_ecer ditambahkan`);
      }
    } catch (e) {}

    try {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'sale_price_ecer'
      `, [database]);
      if (columns.length === 0) {
        await connection.query(`ALTER TABLE products ADD COLUMN sale_price_ecer DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER sale_price`);
        logger.info(`Migrasi: products.sale_price_ecer ditambahkan`);
      }
    } catch (e) {}

    try {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'price_history' AND COLUMN_NAME = 'sale_price_ecer'
      `, [database]);
      if (columns.length === 0) {
        await connection.query(`ALTER TABLE price_history ADD COLUMN sale_price_ecer DECIMAL(14,2) NULL AFTER sale_price`);
        logger.info(`Migrasi: price_history.sale_price_ecer ditambahkan`);
      }
    } catch (e) {}

    
    // Format existing data to Title Case
    try {
      const [rows] = await connection.query('SELECT id, name, category FROM products');
      let updated = 0;
      for (let r of rows) {
        const titleCase = str => {
          if (!str) return str;
          return String(str).toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
        };
        const newName = titleCase(r.name);
        const newCat = titleCase(r.category);
        if (newName !== r.name || newCat !== r.category) {
          await connection.query('UPDATE products SET name = ?, category = ? WHERE id = ?', [newName, newCat, r.id]);
          updated++;
        }
      }
      if (updated > 0) logger.info(`Migrasi: ${updated} produk diperbarui format namanya ke Title Case`);
    } catch (e) {
      logger.error('Migrasi Title Case gagal', { error: e.message });
    }

    logger.info(`Migrasi database sepenuhnya selesai: ${database}`);
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  logger.error("Migrasi database gagal.", { error: error.message });
  process.exit(1);
});
