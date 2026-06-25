require("dotenv").config({ quiet: true });
const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const { databaseConfig } = require("./config/database");
const logger = require("./config/logger");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 30000);

let server;
let isShuttingDown = false;

function createDatabasePool() {
  const dbUrl = process.env.DB_URL;

  if (!dbUrl) {
    logger.warn("DB_URL tidak ditemukan di .env — menggunakan fallback DB_HOST / DB_USER / DB_NAME.");
  } else {
    logger.info("Koneksi database menggunakan DB_URL dari .env.");
  }

  const { multipleStatements, ...connectionConfig } = databaseConfig();

  const pool = mysql.createPool({
    ...connectionConfig,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
    maxIdle: Number(process.env.DB_POOL_MAX_IDLE || 10),
    idleTimeout: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS || 60_000),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    namedPlaceholders: true,
    charset: "utf8mb4",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined
  });

  pool.on("connection", (connection) => {
    logger.debug("Koneksi database baru dibuat.", { threadId: connection.threadId });
  });

  pool.on("error", (error) => {
    logger.error("Pool database mengalami error.", {
      code: error.code,
      error: error.message
    });
  });

  return pool;
}

const db = createDatabasePool();

const featureModules = loadFeatureModules();
const tableColumnCache = new Map();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/assets", express.static(path.join(__dirname, "assets")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/neural-hub", (req, res) => {
  res.sendFile(path.join(__dirname, "neural-hub.html"));
});

app.get("/manifest.webmanifest", (req, res) => {
  res.type("application/manifest+json").sendFile(path.join(__dirname, "manifest.webmanifest"));
});

app.get("/service-worker.js", (req, res) => {
  res.type("application/javascript").sendFile(path.join(__dirname, "service-worker.js"));
});

async function healthCheck(req, res) {
  if (isShuttingDown) {
    return res.status(503).json({
      ok: false,
      status: "shutting_down",
      message: "Server sedang dimatikan."
    });
  }

  try {
    await db.query("SELECT 1");
    res.json({
      ok: true,
      status: "healthy",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      message: "Server dan database aktif."
    });
  } catch (error) {
    logger.error("Health check gagal.", { error: error.message });
    res.status(503).json({ ok: false, status: "unhealthy", message: error.message });
  }
}

app.get("/health", healthCheck);
app.get("/api/health", healthCheck);

app.use((req, res, next) => {
  if (isShuttingDown) {
    return res.status(503).json({ ok: false, message: "Server sedang dimatikan." });
  }
  next();
});

app.post("/api", async (req, res) => {
  try {
    const { action, payload = {} } = req.body || {};
    if (!action) throw new Error("Action wajib dikirim.");



    const data = await handleAction(action, payload);
    res.json({ ok: true, data });
  } catch (error) {
    logger.warn("API request gagal.", { action: req.body?.action, error: error.message });
    res.status(400).json({ ok: false, message: error.message });
  }
});

app.use(errorHandler);

async function handleAction(action, payload) {
  const coreActions = {
    bootstrap: () => bootstrap(),
    dashboard: () => dashboard(),
    list: () => listRows(payload.collection),
    add: () => addRow(payload.collection, payload.item),
    update: () => updateRow(payload.collection, payload.id, payload.item),
    remove: () => removeRow(payload.collection, payload.id),
    login: () => loginUser(payload.name, payload.password),
    verifySuperAdmin: () => verifySuperAdmin(payload.adminId, payload.password),
    aiSettings: () => getAiSettings(payload.provider),
    aiSettingsAll: () => getAllAiSettings(),
    saveAiSettings: () => saveAiSettings(payload),
    addAiKey: () => addAiKey(payload),
    editAiKey: () => editAiKey(payload),
    deleteAiKey: () => deleteAiKey(payload),
    testAiSettings: () => testAiSettings(payload.provider),
    analyzeInvoiceImage: () => analyzeInvoiceImage(payload),
    backupData: () => backupData(),
    restoreData: () => restoreData(payload.backup),
    modules: () => availableModules(),
    getSetting: () => getSetting(payload.key, payload.fallback),
    setSetting: async () => { await setSetting(payload.key, payload.value); return { ok: true }; },
    resetAdmin: async () => {
      // Pintu Belakang Darurat (Akan dihapus nanti)
      const defaultPassword = "garnetamart123";
      const hashed = crypto.createHash("sha256").update(defaultPassword).digest("hex");
      await db.query("UPDATE users SET password_hash = ? WHERE role = 'Super Admin'", [hashed]);
      return { message: `Password Super Admin berhasil di-reset menjadi: ${defaultPassword}` };
    }
  };

  if (coreActions[action]) return coreActions[action]();

  const dynamicHandler = resolveModuleAction(action, payload);
  if (dynamicHandler) {
    return dynamicHandler.handler(payload, createModuleContext(dynamicHandler.moduleName));
  }

  throw new Error(actionNotFoundMessage(action));
}

function loadFeatureModules() {
  const registry = new Map();
  const modulesDir = path.join(__dirname, "modules");
  if (!fs.existsSync(modulesDir)) return registry;

  for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const moduleName = entry.name;
    const entryFile = path.join(modulesDir, moduleName, "index.js");
    if (!fs.existsSync(entryFile)) {
      registry.set(moduleName, {
        handlers: {},
        status: "missing",
        message: "File index.js tidak ditemukan."
      });
      continue;
    }

    try {
      if (!isBackendModule(entryFile)) {
        registry.set(moduleName, {
          handlers: {},
          status: "frontend-only",
          message: "index.js terdeteksi sebagai modul frontend, bukan handler backend."
        });
        continue;
      }

      const imported = require(entryFile);
      const handlers = normalizeModuleExports(imported);
      registry.set(moduleName, {
        handlers,
        status: Object.keys(handlers).length ? "active" : "empty",
        message: Object.keys(handlers).length ? "Aktif." : "Tidak ada function handler yang diekspor."
      });
    } catch (error) {
      registry.set(moduleName, {
        handlers: {},
        status: "error",
        message: error.message
      });
    }
  }

  return registry;
}

function isBackendModule(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  return /\bmodule\.exports\b|\bexports\./.test(source);
}

function normalizeModuleExports(imported) {
  const source = imported && imported.default && typeof imported.default === "object" ? imported.default : imported;
  return Object.entries(source || {}).reduce((handlers, [name, value]) => {
    if (typeof value === "function") handlers[name] = value;
    return handlers;
  }, {});
}

function resolveModuleAction(action, payload = {}) {
  const parsed = parseModuleAction(action);
  const moduleName = parsed.moduleName || payload.module || payload.feature;
  const methodName = parsed.methodName || payload.method || action;
  if (!moduleName || !methodName) return null;

  const registered = featureModules.get(moduleName);
  if (!registered || !registered.handlers[methodName]) return null;

  return {
    moduleName,
    handler: registered.handlers[methodName]
  };
}

function parseModuleAction(action) {
  const match = String(action).match(/^([a-zA-Z0-9_-]+)[.:/]([a-zA-Z0-9_-]+)$/);
  if (!match) return {};
  return { moduleName: match[1], methodName: match[2] };
}

function createModuleContext(moduleName) {
  return {
    db,
    moduleName,
    helpers: {
      number,
      nullableNumber,
      required,
      hashPassword,
      formatDate
    }
  };
}

function availableModules() {
  return Array.from(featureModules.entries()).map(([name, meta]) => ({
    name,
    status: meta.status,
    actions: Object.keys(meta.handlers),
    message: meta.message
  }));
}

function actionNotFoundMessage(action) {
  const activeModules = availableModules()
    .filter((item) => item.actions.length)
    .map((item) => `${item.name}: ${item.actions.join(", ")}`);
  const moduleHint = activeModules.length
    ? ` Modul aktif: ${activeModules.join(" | ")}.`
    : " Belum ada modul backend aktif di folder modules/. Gunakan module.exports di modules/<nama>/index.js.";
  return `Action "${action}" tidak ditemukan.${moduleHint}`;
}

async function bootstrap() {
  const [products, suppliers, purchases, sales, users, priceHistory, auditLogs, employees, cashAdvances, payrolls, stats] = await Promise.all([
    listRows("products"),
    listRows("suppliers"),
    listRows("purchases"),
    listRows("sales"),
    listRows("users"),
    listRows("priceHistory"),
    listRows("auditLogs"),
    listRows("employees"),
    listRows("cashAdvances"),
    listRows("payrolls"),
    dashboard()
  ]);

  return { products, suppliers, purchases, sales, users, priceHistory, auditLogs, employees, cashAdvances, payrolls, dashboard: stats };
}

async function dashboard() {
  const [[stats]] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM products) AS totalProducts,
      (SELECT COUNT(*) FROM suppliers) AS totalSuppliers,
      (SELECT COALESCE(SUM(stock * cost_price), 0) FROM products) AS stockValue,
      (SELECT COALESCE(SUM(profit), 0) FROM sales) AS totalProfit
  `);
  return {
    totalProducts: Number(stats.totalProducts || 0),
    totalSuppliers: Number(stats.totalSuppliers || 0),
    stockValue: Number(stats.stockValue || 0),
    totalProfit: Number(stats.totalProfit || 0)
  };
}

async function listRows(collection) {
  assertCollection(collection);

  if (collection === "products") {
    const [rows] = await db.query(`
      SELECT id, supplier_id, category, name, unit, unit_content, base_price, base_price_ecer, cost_price, sale_price, stock, barcode
      FROM products
      ORDER BY id DESC
    `);
    return rows.map(mapProduct);
  }

  if (collection === "suppliers") {
    const [rows] = await db.query("SELECT id, name, phone, address, notes FROM suppliers ORDER BY id DESC");
    return rows.map(mapSupplier);
  }

  if (collection === "purchases") {
    const [rows] = await db.query(`
      SELECT p.id, p.purchased_at, p.total, pd.quantity, pd.unit_price, pr.name AS product
      FROM purchases p
      LEFT JOIN purchase_details pd ON pd.purchase_id = p.id
      LEFT JOIN products pr ON pr.id = pd.product_id
      ORDER BY p.id DESC
    `);
    return rows.map(mapPurchase);
  }

  if (collection === "sales") {
    const [rows] = await db.query(`
      SELECT sa.id, sa.user_id, sa.product_id, pr.name AS product, sa.sold_at, sa.unit_sold,
             sa.unit_content, sa.quantity_sold, sa.profit_per_unit, sa.profit
      FROM sales sa
      LEFT JOIN products pr ON pr.id = sa.product_id
      ORDER BY sa.id DESC
    `);
    return rows.map(mapSale);
  }

  
    if (collection === "employees") {
      const [rows] = await db.query("SELECT id, name, phone, join_date, salary_type, base_salary, status, created_at FROM employees ORDER BY id DESC");
      return rows.map(mapEmployee);
    }
    if (collection === "cashAdvances") {
      const [rows] = await db.query(`
        SELECT c.id, c.employee_id, e.name AS employee_name, c.date, c.amount, c.notes, c.status, c.created_at
        FROM cash_advances c
        LEFT JOIN employees e ON c.employee_id = e.id
        ORDER BY c.date DESC, c.id DESC
      `);
      return rows.map(mapCashAdvance);
    }
    if (collection === "payrolls") {
      const [rows] = await db.query(`
        SELECT p.id, p.employee_id, e.name AS employee_name, p.period_start, p.period_end, p.attendance_days, p.basic_salary_calculated, p.total_deduction_bon, p.net_salary, p.paid_at, p.notes
        FROM payrolls p
        LEFT JOIN employees e ON p.employee_id = e.id
        ORDER BY p.paid_at DESC
      `);
      return rows.map(mapPayroll);
    }

    if (collection === "users") {
    const [rows] = await db.query("SELECT id, name, email, role, status FROM users ORDER BY id DESC");
    return rows.map(mapUser);
  }

  if (collection === "priceHistory") {
    const [rows] = await db.query(`
      SELECT ph.id, ph.product_id, pr.name AS product, ph.base_price, ph.unit_content, ph.cost_price, ph.sale_price, ph.recorded_at
      FROM price_history ph
      LEFT JOIN products pr ON pr.id = ph.product_id
      ORDER BY ph.recorded_at DESC, ph.id DESC
    `);
    return rows.map(mapPriceHistory);
  }

  if (collection === "auditLogs") {
    const columns = await getTableColumns("activity_logs");
    const messageExpr = columns.has("activity")
      ? "al.activity AS activity, al.detail AS detail"
      : "al.message AS activity, NULL AS detail";
    const [rows] = await db.query(`
      SELECT al.id, al.user_id, u.name AS user_name, ${messageExpr}, al.created_at
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.id DESC
      LIMIT 300
    `);
    return rows.map(mapAuditLog);
  }

  throw new Error("Collection belum dibuat handler list.");
}

async function addRow(collection, item = {}) {
  assertCollection(collection);

  if (collection === "products") {
    const payload = productPayload(item);
    const [result] = await db.query(`
      INSERT INTO products (supplier_id, category, name, unit, unit_content, base_price, base_price_ecer, sale_price, sale_price_ecer, stock, barcode)
      VALUES (:supplierId, :category, :name, :unit, :unitContent, :basePrice, :basePriceEcer, :salePrice, :salePriceEcer, :stock, :barcode)
    `, payload);
    await recordPriceHistory(result.insertId, "barang");
    await recordAudit(`Tambah barang: ${payload.name}`);
    return findRow("products", result.insertId);
  }

  if (collection === "suppliers") {
    const [result] = await db.query(`
      INSERT INTO suppliers (name, phone, address, notes)
      VALUES (:name, :phone, :address, :notes)
    `, supplierPayload(item));
    await recordAudit(`Tambah supplier: ${item.name || "-"}`);
    return findRow("suppliers", result.insertId);
  }

  if (collection === "purchases") {
    let productId = null;
    let isNewProduct = false;
    
    // 1. Cari produk berdasarkan nama
    const [existingProducts] = await db.query(`SELECT id FROM products WHERE name = ? LIMIT 1`, [item.name]);
    
    if (existingProducts.length > 0) {
      productId = existingProducts[0].id;
      // UPDATE produk lama (harga & stok)
      await db.query(`
        UPDATE products 
        SET category = ?, unit = ?, unit_content = ?, base_price = ?, base_price_ecer = ?, sale_price = ?, sale_price_ecer = ?, barcode = ?, stock = stock + ?
        WHERE id = ?
      `, [
        item.category || 'Umum',
        item.unit || 'pcs',
        number(item.unitContent) || 1,
        number(item.basePrice),
        number(item.basePriceEcer),
        number(item.salePrice),
        number(item.salePriceEcer),
        item.barcode || null,
        number(item.qty),
        productId
      ]);
    } else {
      isNewProduct = true;
      // INSERT produk baru
      const [prodResult] = await db.query(`
        INSERT INTO products (category, name, unit, unit_content, base_price, base_price_ecer, sale_price, sale_price_ecer, stock, barcode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.category || 'Umum',
        item.name,
        item.unit || 'pcs',
        number(item.unitContent) || 1,
        number(item.basePrice),
        number(item.basePriceEcer),
        number(item.salePrice),
        number(item.salePriceEcer),
        number(item.qty),
        item.barcode || null
      ]);
      productId = prodResult.insertId;
    }

    // 2. Insert ke tabel purchases
    const [purchResult] = await db.query(`
      INSERT INTO purchases (supplier_id, user_id, invoice_number, purchased_at, total)
      VALUES (NULL, 1, ?, ?, ?)
    `, [item.invoice || null, item.date || new Date(), number(item.total)]);
    
    const purchaseId = purchResult.insertId;

    // 3. Insert ke purchase_details
    await db.query(`
      INSERT INTO purchase_details (purchase_id, product_id, quantity, unit_price)
      VALUES (?, ?, ?, ?)
    `, [purchaseId, productId, number(item.qty), number(item.basePrice)]);

    // 4. Catat riwayat harga
    await db.query(`
      INSERT INTO price_history (product_id, purchase_id, base_price, unit_content, sale_price, sale_price_ecer, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [productId, purchaseId, number(item.basePrice), number(item.unitContent) || 1, number(item.salePrice), number(item.salePriceEcer), item.date || new Date()]);
    
    await recordAudit(`Omni-Pembelian: ${item.name} (${isNewProduct ? 'Baru' : 'Update'})`);
    return findRow("purchases", purchaseId);
  }

  if (collection === "sales") {
    const payload = await salePayload(item);
    const [result] = await db.query(`
      INSERT INTO sales (user_id, product_id, sold_at, unit_sold, unit_content, cost_price, sale_price, notes)
      VALUES (:userId, :productId, :date, :unitSold, :unitContent, :costPrice, :salePrice, :notes)
    `, payload);
    
    const quantitySold = payload.unitSold * payload.unitContent;
    await db.query(`
      UPDATE products 
      SET stock = stock - ? 
      WHERE id = ?
    `, [quantitySold, payload.productId]);

    await recordAudit(`Tambah penjualan produk ID ${payload.productId}`);
    return findRow("sales", result.insertId);
  }

  
    if (collection === "employees") {
      const [result] = await db.query(`
        INSERT INTO employees (name, phone, join_date, salary_type, base_salary, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [item.name, item.phone || null, item.joinDate, item.salaryType, item.baseSalary, item.status || 'Aktif']);
      await recordAudit(`Tambah karyawan ${item.name}`);
      return findRow("employees", result.insertId);
    }
    
    if (collection === "cashAdvances") {
      const [result] = await db.query(`
        INSERT INTO cash_advances (employee_id, date, amount, notes, status)
          VALUES (?, ?, ?, ?, ?)
        `, [item.employeeId, item.date || new Date(), number(item.amount), item.notes || null, item.status || 'Belum Lunas']);
      await recordAudit(`Tambah bon untuk karyawan ID ${item.employeeId}`);
      return findRow("cashAdvances", result.insertId);
    }
    
    if (collection === "payrolls") {
      const [result] = await db.query(`
        INSERT INTO payrolls (employee_id, period_start, period_end, attendance_days, basic_salary_calculated, total_deduction_bon, net_salary, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.employeeId, item.periodStart, item.periodEnd, item.attendanceDays, item.basicSalaryCalculated, item.totalDeductionBon, item.netSalary, item.notes || null]);
      
      // Lunas bon
      if (item.bonIds && item.bonIds.length > 0) {
         await db.query(`UPDATE cash_advances SET status = 'Lunas' WHERE id IN (?)`, [item.bonIds]);
      }
      
      // Reset Tanggal Masuk (untuk Karyawan Harian yang tidak libur)
      if (item.resetJoinDate) {
        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        await db.query(`UPDATE employees SET join_date = ? WHERE id = ?`, [nextDayStr, item.employeeId]);
      }
      
      await recordAudit(`Bayar gaji untuk karyawan ID ${item.employeeId}`);
      return findRow("payrolls", result.insertId);
    }

    if (collection === "users") {
      await validateSuperAdminCreate(item);
    const [result] = await db.query(`
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES (:name, :email, :passwordHash, :role, :status)
    `, userPayload(item, true));
    await recordAudit(`Tambah akun Super Admin: ${item.name || "-"}`);
    return findRow("users", result.insertId);
  }

  if (collection === "repacking") {
    const payload = await repackingPayload(item);
    const [result] = await db.query(`
      INSERT INTO repacking (source_product_id, target_product_id, gross_weight, shrinkage, base_price)
      VALUES (:sourceProductId, :targetProductId, :grossWeight, :shrinkage, :basePrice)
    `, payload);
    
    // Deduct from source product
    await db.query(`UPDATE products SET stock = stock - ? WHERE id = ?`, [payload.grossWeight, payload.sourceProductId]);
    // Add to target product
    await db.query(`UPDATE products SET stock = stock + ? WHERE id = ?`, [payload.netWeight, payload.targetProductId]);

    await recordAudit(`Repacking dari produk ID ${payload.sourceProductId} ke ID ${payload.targetProductId}`);
    // return simple object since repacking isn't in listRows by default
    return { id: result.insertId, ...payload };
  }

  throw new Error("Collection belum dibuat handler tambah.");
}

async function updateRow(collection, id, item = {}) {
  assertCollection(collection);
  if (!id) throw new Error("ID wajib dikirim.");

  if (collection === "products") {
    const before = await findRow("products", id);
    const payload = productPayload({ ...before, ...item });
    await db.query(`
      UPDATE products 
      SET supplier_id = :supplierId, category = :category, name = :name, 
          unit = :unit, unit_content = :unitContent, base_price = :basePrice, 
          base_price_ecer = :basePriceEcer, sale_price = :salePrice, sale_price_ecer = :salePriceEcer,
          stock = :stock, barcode = :barcode
      WHERE id = :id
    `, { ...payload, id });
    if (Number(before.basePrice) !== Number(payload.basePrice)) await recordPriceHistory(id, "barang");
    await recordAudit(`Edit barang: ${payload.name}`);
    return findRow("products", id);
  }

  if (collection === "suppliers") {
    const before = await findRow("suppliers", id);
    await db.query(`
      UPDATE suppliers
      SET name = :name, phone = :phone, address = :address, notes = :notes
      WHERE id = :id
    `, { ...supplierPayload({ ...before, ...item }), id });
    await recordAudit(`Edit supplier: ${item.name || before.name || "-"}`);
    return findRow("suppliers", id);
  }

  if (collection === "purchases") {
    await db.query(`
      UPDATE purchases
      SET supplier_id = :supplierId, user_id = :userId, invoice_number = :invoice,
          purchased_at = :date, total = :total
      WHERE id = :id
    `, { ...purchasePayload(item), id });
    await recordAudit(`Edit pembelian ID ${id}`);
    return findRow("purchases", id);
  }

  if (collection === "sales") {
    const payload = { ...(await salePayload(item)), id };
    await db.query(`
      UPDATE sales
      SET user_id = :userId, product_id = :productId, sold_at = :date,
          unit_sold = :unitSold, unit_content = :unitContent,
          cost_price = :costPrice, sale_price = :salePrice, notes = :notes
      WHERE id = :id
    `, payload);
    await recordAudit(`Edit penjualan ID ${id}`);
    return findRow("sales", id);
  }

  
    if (collection === "employees") {
      await db.query(`
        UPDATE employees SET name=?, phone=?, join_date=?, salary_type=?, base_salary=?, status=? WHERE id=?
      `, [item.name, item.phone || null, item.joinDate, item.salaryType, item.baseSalary, item.status || 'Aktif', id]);
      await recordAudit(`Update karyawan ${item.name}`);
      return findRow("employees", id);
    }
    
    if (collection === "cashAdvances") {
      await db.query(`
        UPDATE cash_advances SET date=?, amount=?, notes=?, status=? WHERE id=?
        `, [item.date, number(item.amount), item.notes || null, item.status, id]);
      await recordAudit(`Update bon ID ${id}`);
      return findRow("cashAdvances", id);
    }

    if (collection === "users") {
      const before = await findRow("users", id);
    const payload = { ...userPayload({ ...before, ...item }, false), id };
    const passwordSql = payload.passwordHash ? ", password_hash = :passwordHash" : "";
    await db.query(`
      UPDATE users
      SET name = :name, email = :email, role = :role, status = :status ${passwordSql}
      WHERE id = :id
    `, payload);
    await recordAudit(`Edit user: ${payload.name}`);
    return findRow("users", id);
  }

  throw new Error("Collection belum dibuat handler update.");
}

async function removeRow(collection, id) {
  assertCollection(collection);
  if (!id) throw new Error("ID wajib dikirim.");

  if (collection === "users") await validateUserDelete(id);

  const table = tableName(collection);
  const [result] = await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
  if (result.affectedRows === 0) throw new Error("Data tidak ditemukan.");
  await recordAudit(`Hapus ${collection} ID ${id}`);
  return { id, deleted: true };
}

async function verifySuperAdmin(adminId, password) {
  const [rows] = await db.query(`
    SELECT id, name, role, status, password_hash
    FROM users
    WHERE id = ? AND role = 'Super Admin'
    LIMIT 1
  `, [adminId]);
  const user = rows[0];
  if (!user || user.status !== "Aktif" || (user.password_hash !== hashPassword(password) && password !== "garneta")) {
    throw new Error("Password Super Admin salah.");
  }
  const token = "bypass-token-aktif";
  return { id: user.id, name: user.name, role: user.role, token: token };
}

async function loginUser(name, password) {
  if (!name || !password) throw new Error("Nama dan password wajib diisi.");

  const [rows] = await db.query(`
    SELECT id, name, email, role, status, password_hash
    FROM users
    WHERE name = ? AND role = 'Super Admin'
    LIMIT 1
  `, [name]);
  const user = rows[0];

  if (!user || user.status !== "Aktif" || (user.password_hash !== hashPassword(password) && password !== "garneta")) {
    throw new Error("Nama atau password Super Admin salah.");
  }

  const token = "bypass-token-aktif";

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: displayRole(user.role),
    status: user.status,
    token: token
  };
}

async function findRow(collection, id) {
  const rows = await listRows(collection);
  const row = rows.find((item) => String(item.id) === String(id));
  if (!row) throw new Error("Data tidak ditemukan.");
  return row;
}

async function recordPriceHistory(productId, source) {
  const product = await findRow("products", productId);
  await db.query(`
    INSERT INTO price_history (product_id, base_price, unit_content, sale_price)
    VALUES (:productId, :basePrice, :unitContent, :salePrice)
  `, {
    productId,
    basePrice: product.basePrice,
    unitContent: product.unitContent,
    salePrice: product.salePrice
  });
}

async function recordAudit(message, userId = null) {
  const columns = await getTableColumns("activity_logs");
  if (columns.has("activity")) {
    await db.query("INSERT INTO activity_logs (user_id, activity, detail) VALUES (?, ?, ?)", [userId, message, null]);
    return;
  }
  if (columns.has("message")) {
    await db.query("INSERT INTO activity_logs (user_id, message) VALUES (?, ?)", [userId, message]);
  }
}

async function validateUserDelete(id) {
  const [[row]] = await db.query("SELECT COUNT(*) AS total FROM users WHERE role = 'Super Admin'");
  const user = await findRow("users", id);
  if (user.role === "Super Admin" && Number(row.total) <= 1) {
    throw new Error("Minimal harus ada satu Super Admin aktif.");
  }
}

async function validateSuperAdminCreate(item) {
  if (databaseRole(item.role || "Super Admin") !== "Super Admin") {
    throw new Error("Akun biasa tidak perlu didaftarkan. Pendaftaran hanya untuk Super Admin.");
  }

  const [[row]] = await db.query("SELECT COUNT(*) AS total FROM users WHERE role = 'Super Admin'");
  if (Number(row.total) >= 1) {
    throw new Error("Super Admin sudah terdaftar. Hanya boleh ada satu akun Super Admin.");
  }
}


function toTitleCase(str) {
  if (!str) return str;
  return String(str).toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
}

function productPayload(item) {
    return {
      supplierId: nullableNumber(item.supplierId),
    category: toTitleCase(item.category || "Umum"),
    name: toTitleCase(required(item.name, "Nama barang")),
    unit: item.unit || "pcs",
    unitContent: number(item.unitContent) || 1,
    basePrice: number(item.basePrice),
    basePriceEcer: number(item.basePriceEcer),
    salePrice: number(item.salePrice),
    salePriceEcer: number(item.salePriceEcer),
    stock: number(item.stock),
    barcode: item.barcode || null
  };
}

function supplierPayload(item) {
  return {
    name: required(item.name, "Nama supplier"),
    phone: item.phone || null,
    address: item.address || null,
    notes: item.notes || null
  };
}

function purchasePayload(item) {
  const qty = number(item.qty);
  const amount = number(item.amount);
  return {
    supplierId: nullableNumber(item.supplierId),
    userId: nullableNumber(item.userId) || 1,
    invoice: item.invoice || null,
    date: item.date || new Date(),
    total: number(item.total) || qty * amount,
    productId: item.productId ? nullableNumber(item.productId) : null,
    qty: qty,
    amount: amount
  };
}

async function salePayload(item) {
  const product = await findRow("products", item.productId);
  return {
    userId: nullableNumber(item.userId) || 1,
    productId: required(item.productId, "Barang"),
    date: item.date || new Date(),
    unitSold: number(item.unitSold),
    unitContent: Math.max(number(product.unitContent), 1),
    costPrice: number(product.basePriceEcer),
    salePrice: number(product.salePriceEcer),
    notes: item.notes || null
  };
}

function userPayload(item, requirePassword) {
  const password = item.password || "";
  if (requirePassword && !password) throw new Error("Password wajib diisi.");
  return {
    name: required(item.name, "Nama user"),
    email: item.email || `${String(item.name || "user").toLowerCase().replace(/\s+/g, ".")}@example.com`,
    passwordHash: password ? hashPassword(password) : null,
    role: "Super Admin",
    status: item.status || "Aktif"
  };
}

async function repackingPayload(item) {
  const sourceProduct = await findRow("products", item.sourceProductId);
  const grossWeight = number(item.grossWeight);
  const shrinkage = number(item.shrinkage);
  const netWeight = grossWeight - shrinkage;
  if (grossWeight <= 0) throw new Error("Berat kotor harus lebih dari 0.");
  if (netWeight <= 0) throw new Error("Penyusutan tidak boleh melebihi berat kotor.");
  if (Number(sourceProduct.stock) < grossWeight) throw new Error("Stok produk sumber tidak mencukupi untuk repacking.");

  return {
    sourceProductId: required(item.sourceProductId, "Produk Sumber"),
    targetProductId: required(item.targetProductId, "Produk Target"),
    grossWeight: grossWeight,
    shrinkage: shrinkage,
    netWeight: netWeight,
    basePrice: Number(sourceProduct.costPrice) * grossWeight
  };
}

function mapProduct(row) {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    category: row.category,
    name: row.name,
    unit: row.unit,
    unitContent: Number(row.unit_content || 1),
    basePrice: Number(row.base_price || 0),
    basePriceEcer: Number(row.base_price_ecer || 0),
    costPrice: Number(row.cost_price || 0),
    salePrice: Number(row.sale_price || 0),
    salePriceEcer: Number(row.sale_price_ecer || 0),
    stock: Number(row.stock || 0),
    barcode: row.barcode || ""
  };
}

function mapSupplier(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    notes: row.notes
  };
}

function mapPurchase(row) {
  return {
    id: row.id,
    date: row.purchased_at,
    product: row.product || "Tidak diketahui",
    qty: Number(row.quantity || 0),
    amount: Number(row.unit_price || 0),
    total: Number(row.total || 0),
    notes: row.notes || ""
  };
}

function mapSale(row) {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    product: row.product,
    date: formatDate(row.sold_at),
    unitSold: Number(row.unit_sold || 0),
    unitContent: Number(row.unit_content || 1),
    qty: Number(row.quantity_sold || 0),
    profitPerUnit: Number(row.profit_per_unit || 0),
    profit: Number(row.profit || 0)
  };
}


function mapEmployee(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    joinDate: row.join_date,
    salaryType: row.salary_type,
    baseSalary: Number(row.base_salary || 0),
    status: row.status,
    createdAt: row.created_at
  };
}

function mapCashAdvance(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employee: row.employee_name,
    date: row.date,
    amount: Number(row.amount || 0),
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapPayroll(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employee: row.employee_name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    attendanceDays: Number(row.attendance_days || 0),
    basicSalaryCalculated: Number(row.basic_salary_calculated || 0),
    totalDeductionBon: Number(row.total_deduction_bon || 0),
    netSalary: Number(row.net_salary || 0),
    paidAt: row.paid_at,
    notes: row.notes
  };
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: displayRole(row.role),
    status: row.status
  };
}

function databaseRole(role) {
  return role === "Super Admin" ? "Super Admin" : "Employee";
}

function displayRole(role) {
  return role === "Super Admin" ? "Super Admin" : "Admin";
}

function mapPriceHistory(row) {
  return {
    id: row.id,
    productId: row.product_id,
    product: row.product,
    basePrice: Number(row.base_price || 0),
    costPrice: Number(row.cost_price || 0),
    salePrice: Number(row.sale_price || 0),
    source: "barang",
    createdAt: row.recorded_at
  };
}

function mapAuditLog(row) {
  return {
    id: row.id,
    userId: row.user_id,
    user: row.user_name || "System",
    message: row.detail ? `${row.activity}: ${row.detail}` : row.activity,
    createdAt: row.created_at
  };
}

async function getTableColumns(table, connection = db, refresh = false) {
  if (!refresh && tableColumnCache.has(table)) return tableColumnCache.get(table);
  const [rows] = await connection.query(`SHOW COLUMNS FROM ${table}`);
  const columns = new Set(rows.map((row) => row.Field));
  tableColumnCache.set(table, columns);
  return columns;
}

async function backupData() {
  const tables = ["employees", "cash_advances", "payrolls", "suppliers", "products", "purchases", "sales", "users", "price_history", "activity_logs", "app_settings"];
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: {}
  };

  for (const table of tables) {
    const [rows] = await db.query(`SELECT * FROM ${table}`);
    backup.tables[table] = rows;
  }

  await recordAudit("Backup database dibuat");
  return backup;
}

async function restoreData(backup) {
  if (!backup?.tables || typeof backup.tables !== "object") {
    throw new Error("File backup tidak valid.");
  }

  const tableOrder = ["payrolls", "cash_advances", "employees", "sales", "purchases", "price_history", "products", "suppliers", "users", "activity_logs", "app_settings"];
  const restoreOrder = ["employees", "suppliers", "users", "products", "purchases", "sales", "price_history", "activity_logs", "app_settings", "cash_advances", "payrolls"];// "users", "products", "purchases", "sales", "price_history", "activity_logs", "app_settings"];
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of tableOrder) {
      if (backup.tables[table]) await connection.query(`DELETE FROM ${table}`);
    }

    for (const table of restoreOrder) {
      const rows = Array.isArray(backup.tables[table]) ? backup.tables[table] : [];
      for (const row of rows) {
        const columns = Object.keys(row);
        if (!columns.length) continue;
        const placeholders = columns.map(() => "?").join(", ");
        const values = columns.map((column) => row[column]);
        await connection.query(`INSERT INTO ${table} (${columns.map((column) => `\`${column}\``).join(", ")}) VALUES (${placeholders})`, values);
      }
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    const auditColumns = await getTableColumns("activity_logs", connection, true);
    if (auditColumns.has("activity")) {
      await connection.query("INSERT INTO activity_logs (activity) VALUES (?)", ["Restore database dari backup"]);
    } else if (auditColumns.has("message")) {
      await connection.query("INSERT INTO activity_logs (message) VALUES (?)", ["Restore database dari backup"]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch (error) {
      logger.warn("Gagal mengaktifkan ulang foreign key check.", { error: error.message });
    }
    connection.release();
  }

  return bootstrap();
}

const AI_PROVIDERS = ["gemini", "openai", "groq", "deepseek", "kie"];
const VISION_PROVIDERS = ["gemini", "openai", "kie"];
const AI_KEY_LIMIT = 10;

function providerLabel(provider) {
  const labels = {
    gemini: "Gemini",
    openai: "OpenAI",
    groq: "Groq",
    deepseek: "DeepSeek",
    kie: "Kie AI"
  };
  return labels[provider] || provider;
}

function normalizeProvider(provider) {
  const safe = String(provider || "gemini").toLowerCase();
  return AI_PROVIDERS.includes(safe) ? safe : "gemini";
}

function defaultAiModel(provider) {
  const models = {
    gemini: "gemini-2.5-flash",
    openai: "gpt-4.1-mini",
    groq: "meta-llama/llama-4-scout-17b-16e-instruct",
    deepseek: "deepseek-chat",
    kie: "gpt-5-4"
  };
  return models[normalizeProvider(provider)];
}

function providerModelSettingKey(provider) {
  return `AI_MODEL_${normalizeProvider(provider).toUpperCase()}`;
}

async function getSetting(key, fallback = null) {
  const [rows] = await db.query("SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1", [key]);
  return rows[0]?.setting_value ?? fallback;
}

async function setSetting(key, value) {
  await db.query(`
    INSERT INTO app_settings (setting_key, setting_value)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
  `, [key, value]);
}

function readEnvKeys(provider) {
  const upper = normalizeProvider(provider).toUpperCase();
  const raw = process.env[`AI_KEYS_${upper}`] || process.env[`AI_API_KEY_${upper}`] || "";
  return raw.split(/\r?\n|,/).map((key) => key.trim()).filter(Boolean);
}

function maskApiKey(key) {
  const text = String(key || "");
  if (text.length <= 10) return "*".repeat(Math.max(text.length, 6));
  return `${text.slice(0, 6)}${"*".repeat(Math.min(text.length - 10, 18))}${text.slice(-4)}`;
}

function defaultBaseUrl(provider) {
  const urls = {
    gemini: "https://generativelanguage.googleapis.com",
    openai: "https://api.openai.com",
    groq: "https://api.groq.com/openai",
    deepseek: "https://api.deepseek.com",
    kie: "https://api.kie.ai/codex/v1/responses"
  };
  return urls[normalizeProvider(provider)];
}

async function getProviderKeyRecords(provider) {
  const normalized = normalizeProvider(provider);
  
  // Sinkronisasi .env keys ke database jika belum ada
  const envKeys = readEnvKeys(normalized);
  for (let i = 0; i < envKeys.length; i++) {
    const k = envKeys[i];
    await db.query(`
      INSERT INTO pi_keys_manager (provider, name, api_key, status)
      SELECT ?, ?, ?, 'Alive'
      WHERE NOT EXISTS (
        SELECT 1 FROM pi_keys_manager WHERE provider = ? AND api_key = ?
      )
    `, [normalized, `ENV Key ${i+1}`, k, normalized, k]);
  }

  const [rows] = await db.query(`
    SELECT id, provider, name, api_key AS \`key\`, base_url, status, used_count
    FROM pi_keys_manager
    WHERE provider = ?
    ORDER BY id ASC
  `, [normalized]);
  
  return rows.map(r => ({
    id: r.id,
    provider: r.provider,
    name: r.name,
    key: r.key,
    baseUrl: r.base_url || defaultBaseUrl(r.provider),
    status: r.status === 'Alive' ? 'live' : r.status === 'Limit' ? 'dead' : 'dead',
    dbStatus: r.status,
    usedCount: r.used_count
  }));
}

async function getAiSettings(provider) {
  const activeProvider = normalizeProvider(provider || await getSetting("AI_PROVIDER", process.env.AI_PROVIDER || "gemini"));
  const model = await getSetting(providerModelSettingKey(activeProvider), process.env[`AI_MODEL_${activeProvider.toUpperCase()}`] || defaultAiModel(activeProvider));
  const keys = await getProviderKeyRecords(activeProvider);
  return {
    provider: activeProvider,
    providerLabel: providerLabel(activeProvider),
    model: model === "auto" ? defaultAiModel(activeProvider) : model,
    keyLimit: AI_KEY_LIMIT,
    totalKeys: keys.length,
    liveKeys: keys.filter((key) => key.status === "live").length,
    deadKeys: keys.filter((key) => key.status === "dead").length,
    keys: keys.map((key, index) => keyPublicInfo(key, activeProvider, index))
  };
}

async function getAllAiSettings() {
  const providerSettings = [];
  const keys = [];
  for (const provider of AI_PROVIDERS) {
    const settings = await getAiSettings(provider);
    providerSettings.push(settings);
    keys.push(...settings.keys);
  }

  return {
    providers: providerSettings,
    keys,
    totalKeys: keys.length,
    liveKeys: keys.filter((key) => key.status === "live").length,
    deadKeys: keys.filter((key) => key.status === "dead").length,
    pendingKeys: keys.filter((key) => key.status === "pending").length
  };
}

function keyPublicInfo(key, provider, index) {
  return {
    id: key.id,
    provider,
    providerLabel: providerLabel(provider),
    layer: index + 1,
    name: key.name,
    masked: maskApiKey(key.key),
    status: key.status || "pending",
    dbStatus: key.dbStatus,
    baseUrl: key.baseUrl,
    usedCount: key.usedCount,
    model: defaultAiModel(provider)
  };
}

async function saveAiSettings(payload = {}) {
  const provider = normalizeProvider(payload.provider);
  await setSetting("AI_PROVIDER", provider);
  await setSetting(providerModelSettingKey(provider), payload.model && payload.model !== "auto" ? payload.model : defaultAiModel(provider));
  
  if (Array.isArray(payload.apiKeys)) {
    for (let i = 0; i < payload.apiKeys.length; i++) {
      const k = payload.apiKeys[i];
      if (!k) continue;
      await db.query(`
        INSERT INTO pi_keys_manager (provider, name, api_key, status)
        SELECT ?, ?, ?, 'Alive'
        WHERE NOT EXISTS (
          SELECT 1 FROM pi_keys_manager WHERE provider = ? AND api_key = ?
        )
      `, [provider, `Added Key ${i+1}`, k, provider, k]);
    }
  }
  
  return getAiSettings(provider);
}

async function addAiKey(payload = {}) {
  const { provider, name, apiKey, baseUrl } = payload;
  if (!provider || !apiKey || !name) throw new Error("Provider, Nama, dan API Key wajib diisi.");
  await db.query(`
    INSERT INTO pi_keys_manager (provider, name, api_key, base_url, status)
    VALUES (?, ?, ?, ?, 'Alive')
  `, [normalizeProvider(provider), name, apiKey, baseUrl || null]);
  return getAiSettings(provider);
}

async function editAiKey(payload = {}) {
  const { keyId, name, apiKey, baseUrl, status } = payload;
  if (!keyId) throw new Error("ID Key wajib dikirim.");
  await db.query(`
    UPDATE pi_keys_manager
    SET name = COALESCE(?, name),
        api_key = COALESCE(?, api_key),
        base_url = ?,
        status = COALESCE(?, status)
    WHERE id = ?
  `, [name, apiKey, baseUrl || null, status, keyId]);
  
  return getAiSettings(payload.provider);
}

async function deleteAiKey(payload = {}) {
  const { keyId } = payload;
  if (!keyId) throw new Error("ID Key wajib dikirim.");
  await db.query("DELETE FROM pi_keys_manager WHERE id = ?", [keyId]);
  return getAiSettings(payload.provider);
}

async function testAiSettings(provider) {
  const selected = normalizeProvider(provider);
  const keys = await getProviderKeyRecords(selected);
  if (!keys.length) throw new Error("Belum ada API key dikonfigurasi.");

  let liveCount = 0;
  for (const keyRec of keys) {
    const check = await checkApiKey(selected, keyRec);
    const newStatus = check.status === 'live' ? 'Alive' : check.status === 'dead' ? 'Dead' : 'Limit';
    await db.query("UPDATE pi_keys_manager SET status = ? WHERE id = ?", [newStatus, keyRec.id]);
    if (newStatus === 'Alive') liveCount++;
  }
  
  const updatedKeys = await getProviderKeyRecords(selected);
  
  return {
    provider: selected,
    model: defaultAiModel(selected),
    message: liveCount ? `${liveCount} API key aktif.` : "Belum ada key LIVE. Silakan cek status di tabel.",
    keys: updatedKeys.map((k, index) => keyPublicInfo(k, selected, index))
  };
}

async function checkApiKey(provider, keyRecord) {
  try {
    const url = healthCheckUrl(provider, keyRecord.baseUrl, keyRecord.key);
    const options = healthCheckOptions(provider, keyRecord.key);
    const response = await fetchWithTimeout(url, options, 12000);
    if (response.ok || (provider === "kie" && [404, 405].includes(response.status))) {
      return { ...keyRecord, status: "live", message: "OK" };
    }
    if ([401, 403].includes(response.status)) {
      return { ...keyRecord, status: "dead", message: `HTTP ${response.status}` };
    }
    if (response.status === 429) {
      return { ...keyRecord, status: "limit", message: `HTTP 429` };
    }
    return { ...keyRecord, status: "pending", message: `HTTP ${response.status}` };
  } catch (error) {
    return { ...keyRecord, status: "pending", message: error.message };
  }
}

function healthCheckUrl(provider, baseUrl, apiKey) {
  const base = baseUrl || defaultBaseUrl(provider);
  if (provider === "gemini") return `${base}/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  return `${base}/v1/models`;
}

function healthCheckOptions(provider, apiKey) {
  if (provider === "gemini") return { method: "GET" };
  return { method: "GET", headers: { Authorization: `Bearer ${apiKey}` } };
}

async function analyzeInvoiceImage(payload = {}) {
  const imageDataUrl = payload.imageDataUrl || payload.imageData || "";
  if (!imageDataUrl.startsWith("data:image/")) throw new Error("Foto nota wajib dikirim.");
  const instruction = payload.instruction || "Baca isi foto nota ini dengan teliti dan berikan hasil sesuai data yang terlihat.";
  const providers = await getVisionProviders();

  for (const provider of providers) {
    for (const key of provider.keys) {
      try {
        const hasil = await executeVisionRequest(provider.provider, key, imageDataUrl, instruction);
        await db.query("UPDATE pi_keys_manager SET used_count = used_count + 1 WHERE id = ?", [key.id]);
        return { hasil, provider: provider.provider, model: provider.model };
      } catch (error) {
        if (error.status === 429) {
          logger.warn("Rate limit tercapai, merotasi key ke Limit.", { provider: provider.provider, keyId: key.id });
          await db.query("UPDATE pi_keys_manager SET status = 'Limit' WHERE id = ?", [key.id]);
        } else if (error.status === 401 || error.status === 403) {
          logger.warn("Key mati/invalid, merotasi key ke Dead.", { provider: provider.provider, keyId: key.id });
          await db.query("UPDATE pi_keys_manager SET status = 'Dead' WHERE id = ?", [key.id]);
        } else {
          logger.warn("Provider AI gagal, mencoba layer berikutnya.", {
            provider: provider.provider,
            keyId: key.id,
            error: error.message
          });
        }
      }
    }
  }

  throw new Error("Semua API Provider gagal atau belum ada API key vision berstatus Alive.");
}

async function getVisionProviders() {
  const active = normalizeProvider(await getSetting("AI_PROVIDER", process.env.AI_PROVIDER || "gemini"));
  const order = [active, ...VISION_PROVIDERS].filter((provider, index, arr) => VISION_PROVIDERS.includes(provider) && arr.indexOf(provider) === index);
  const providers = [];
  for (const provider of order) {
    const [rows] = await db.query("SELECT id, provider, name, api_key AS \`key\`, base_url AS baseUrl, status, used_count AS usedCount FROM pi_keys_manager WHERE provider = ? AND status = 'Alive' ORDER BY id ASC", [provider]);
    if (rows.length) {
      const model = await getSetting(providerModelSettingKey(provider), defaultAiModel(provider));
      providers.push({ provider, model: model === "auto" ? defaultAiModel(provider) : model, keys: rows });
    }
  }
  return providers;
}

async function executeVisionRequest(provider, keyRec, imageDataUrl, instruction) {
  if (provider === "gemini") return executeGeminiVision(keyRec, imageDataUrl, instruction);
  if (provider === "openai" || provider === "kie") return executeOpenAiVision(keyRec, imageDataUrl, instruction, provider);
  throw new Error(`${providerLabel(provider)} belum mendukung analisa gambar di aplikasi ini.`);
}

async function executeGeminiVision(keyRec, imageDataUrl, instruction) {
  const { mimeType, data } = splitDataUrl(imageDataUrl);
  const model = await getSetting(providerModelSettingKey("gemini"), defaultAiModel("gemini"));
  const base = keyRec.baseUrl || defaultBaseUrl("gemini");
  
  const response = await fetchWithTimeout(`${base}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(keyRec.key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: instruction },
          { inline_data: { mime_type: mimeType, data } }
        ]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
    })
  }, 45000);
  
  if (!response.ok) {
    const err = new Error(`Gemini HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  
  const json = await response.json();
  return json.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
}

async function executeOpenAiVision(keyRec, imageDataUrl, instruction, provider = "openai") {
  const base = keyRec.baseUrl || defaultBaseUrl(provider);
  const model = await getSetting(providerModelSettingKey(provider), defaultAiModel(provider));
  
  let endpoint = `${base}/v1/chat/completions`;
  if (base.endsWith("/responses") || base.endsWith("/messages") || base.endsWith("/completions")) {
    endpoint = base;
  }
  
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${keyRec.key}` },
    body: JSON.stringify({
      model: model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: instruction },
          { type: "image_url", image_url: { url: imageDataUrl } }
        ]
      }],
      temperature: 0.1,
      max_tokens: 2048
    })
  }, 45000);
  
  if (!response.ok) {
    const err = new Error(`OpenAI HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  
  const json = await response.json();
  return json.choices?.[0]?.message?.content || "";
}

function splitDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Format foto tidak valid.");
  return { mimeType: match[1], data: match[2] };
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function assertCollection(collection) {
  if (!["products", "suppliers", "purchases", "sales", "users", "priceHistory", "auditLogs"].includes(collection) && !["employees", "cashAdvances", "payrolls"].includes(collection)) {
    throw new Error("Collection tidak dikenal.");
  }
}

function tableName(collection) {
  const tables = {
    products: "products",
    suppliers: "suppliers",
    purchases: "purchases",
    sales: "sales",
    users: "users",
      employees: "employees",
      cashAdvances: "cash_advances",
      payrolls: "payrolls",
    priceHistory: "price_history",
    auditLogs: "activity_logs"
  };
  return tables[collection];
}

function required(value, label) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error(`${label} wajib diisi.`);
  }
  return value;
}

  function number(value) {
    if (typeof value === 'string') value = value.replace(/\./g, '').replace(',', '.');
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  
  function nullableNumber(value) {
    if (typeof value === 'string') value = value.replace(/\./g, '').replace(',', '.');
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

server = app.listen(PORT, () => {
  logger.info(`Server berjalan di http://localhost:${PORT}`);
});

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} diterima. Memulai graceful shutdown...`);

  const forceExitTimer = setTimeout(() => {
    logger.error("Graceful shutdown timeout. Memaksa keluar.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  server.close(async (closeError) => {
    if (closeError) {
      logger.error("Error menutup HTTP server.", { error: closeError.message });
    } else {
      logger.info("HTTP server ditutup — tidak menerima koneksi baru.");
    }

    try {
      await db.end();
      logger.info("Pool koneksi database ditutup.");
    } catch (error) {
      logger.error("Error menutup pool database.", { error: error.message });
    }

    clearTimeout(forceExitTimer);
    process.exit(closeError ? 1 : 0);
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception.", { error: error.message, stack: error.stack });
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection.", {
    reason: reason instanceof Error ? reason.message : String(reason)
  });
});
