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

    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS employees (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          phone VARCHAR(40) NULL,
          join_date DATE NOT NULL,
          salary_type ENUM('Bulanan', 'Harian') NOT NULL DEFAULT 'Bulanan',
          base_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
          status ENUM('Aktif', 'Nonaktif') NOT NULL DEFAULT 'Aktif',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
      `);
      logger.info(`Migrasi: Tabel employees dipastikan ada`);
    } catch (e) {
      logger.error('Migrasi tabel employees gagal', { error: e.message });
    }

    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS cash_advances (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          employee_id BIGINT UNSIGNED NOT NULL,
          date DATE NOT NULL,
          amount DECIMAL(14,2) NOT NULL DEFAULT 0,
          notes TEXT NULL,
          status ENUM('Belum Lunas', 'Lunas') NOT NULL DEFAULT 'Belum Lunas',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_cash_advances_employee
            FOREIGN KEY (employee_id) REFERENCES employees(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
        ) ENGINE=InnoDB
      `);
      logger.info(`Migrasi: Tabel cash_advances dipastikan ada`);
    } catch (e) {
      logger.error('Migrasi tabel cash_advances gagal', { error: e.message });
    }

    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS payrolls (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          employee_id BIGINT UNSIGNED NOT NULL,
          period_start DATE NULL,
          period_end DATE NULL,
          attendance_days INT NOT NULL DEFAULT 0,
          basic_salary_calculated DECIMAL(14,2) NOT NULL DEFAULT 0,
          total_deduction_bon DECIMAL(14,2) NOT NULL DEFAULT 0,
          net_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
          paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          notes TEXT NULL,
          CONSTRAINT fk_payrolls_employee
            FOREIGN KEY (employee_id) REFERENCES employees(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
        ) ENGINE=InnoDB
      `);
      logger.info(`Migrasi: Tabel payrolls dipastikan ada`);
    } catch (e) {
      logger.error('Migrasi tabel payrolls gagal', { error: e.message });
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
