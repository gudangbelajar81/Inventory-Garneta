require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

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

function databaseConfig() {
  const base = { multipleStatements: true };

  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      ...base,
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, "") || "retail_inventory"
    };
  }

  return {
    ...base,
    host: process.env.MYSQLHOST || process.env.DB_HOST || "localhost",
    port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
    user: process.env.MYSQLUSER || process.env.DB_USER || "root",
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || "",
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || "retail_inventory"
  };
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
    console.log("Tidak ada statement migrasi yang dijalankan.");
    return;
  }

  const connection = await createConnection();
  try {
    await connection.query(sql);
    console.log(`Migrasi database selesai: ${database}`);
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error("Migrasi database gagal:", error.message);
  process.exit(1);
});
