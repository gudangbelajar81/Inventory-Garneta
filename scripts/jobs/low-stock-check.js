const logger = require("../../config/logger");

async function checkLowStock(db) {
  const [rows] = await db.query(`
    SELECT id, name, stock, min_stock
    FROM products
    WHERE stock <= min_stock
    ORDER BY name ASC
  `);

  if (rows.length === 0) {
    logger.info("Cron low-stock: tidak ada barang di bawah stok minimum.");
    return { alerts: 0 };
  }

  logger.warn("Cron low-stock: ditemukan barang di bawah stok minimum.", {
    count: rows.length,
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      stock: row.stock,
      minStock: row.min_stock
    }))
  });

  return { alerts: rows.length, items: rows };
}

module.exports = { checkLowStock };
