function parseDatabaseUrl(rawUrl) {
  if (!rawUrl || String(rawUrl).trim() === "") return null;

  const url = new URL(rawUrl);
  const database = url.pathname.replace(/^\//, "");

  if (!database) {
    throw new Error("DB_URL harus menyertakan nama database, contoh: mysql://user:pass@host:3306/retail_inventory");
  }

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database
  };
}

function databaseConfig() {
  // [SECURITY] multipleStatements dinonaktifkan untuk mencegah multi-query injection
  // Hanya aktifkan di migrate.js secara eksplisit
  const base = { multipleStatements: false };
  const connectionUrl = process.env.DB_URL || process.env.DATABASE_URL;
  const parsed = parseDatabaseUrl(connectionUrl);

  if (parsed) {
    return { ...base, ...parsed };
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

module.exports = { databaseConfig, parseDatabaseUrl };
