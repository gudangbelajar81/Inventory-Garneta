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
    logger.info(`Migrasi database selesai: ${database}`);
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  logger.error("Migrasi database gagal.", { error: error.message });
  process.exit(1);
});
