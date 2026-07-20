require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  let db;
  try {
    db = await mysql.createConnection(process.env.DATABASE_URL || {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log("Connected to database. Running WebAuthn migration...");

    await db.query(`
      CREATE TABLE IF NOT EXISTS passkeys (
        id VARCHAR(255) PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        public_key TEXT NOT NULL,
        webauthn_user_id VARCHAR(255) NOT NULL,
        counter INT NOT NULL DEFAULT 0,
        device_type VARCHAR(255),
        backed_up BOOLEAN NOT NULL DEFAULT false,
        transports VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("Table 'passkeys' created or exists.");

    await db.query(`
      CREATE TABLE IF NOT EXISTS magic_links (
        token VARCHAR(255) PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("Table 'magic_links' created or exists.");

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    if (db) await db.end();
  }
}

migrate();
