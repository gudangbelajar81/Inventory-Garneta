require("dotenv").config({ quiet: true });

const cron = require("node-cron");
const mysql = require("mysql2/promise");
const { databaseConfig } = require("../config/database");
const logger = require("../config/logger");
const { checkLowStock } = require("./jobs/low-stock-check");

const dbConfig = databaseConfig();
const db = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 5,
  namedPlaceholders: true
});

const schedules = [];

function registerJob(name, expression, handler) {
  if (!cron.validate(expression)) {
    logger.error(`Cron job "${name}" dilewati — ekspresi tidak valid: ${expression}`);
    return;
  }

  const task = cron.schedule(expression, async () => {
    try {
      logger.info(`Cron job "${name}" dimulai.`);
      await handler(db);
      logger.info(`Cron job "${name}" selesai.`);
    } catch (error) {
      logger.error(`Cron job "${name}" gagal.`, { error: error.message, stack: error.stack });
    }
  });

  schedules.push(task);
  logger.info(`Cron job "${name}" terdaftar (${expression}).`);
}

async function shutdown(signal) {
  logger.info(`${signal} diterima. Menghentikan cron runner...`);
  schedules.forEach((task) => task.stop());

  try {
    await db.end();
    logger.info("Pool database cron ditutup.");
  } catch (error) {
    logger.error("Gagal menutup pool database cron.", { error: error.message });
  }

  process.exit(0);
}

if (process.env.CRON_ENABLED === "false") {
  logger.info("CRON_ENABLED=false — cron runner tidak dijalankan.");
  process.exit(0);
}

registerJob("low-stock-check", process.env.LOW_STOCK_CRON || "0 8 * * *", checkLowStock);

logger.info("Cron runner aktif. Tekan Ctrl+C untuk berhenti.");

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
