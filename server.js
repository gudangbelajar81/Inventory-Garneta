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

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
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
    editAiKey: () => editAiKey(payload),
    deleteAiKey: () => deleteAiKey(payload),
    testAiSettings: () => testAiSettings(payload.provider),
    analyzeInvoiceImage: () => analyzeInvoiceImage(payload),
    modules: () => availableModules()
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
  const [products, suppliers, purchases, sales, users, priceHistory, stats] = await Promise.all([
    listRows("products"),
    listRows("suppliers"),
    listRows("purchases"),
    listRows("sales"),
    listRows("users"),
    listRows("priceHistory"),
    dashboard()
  ]);

  return { products, suppliers, purchases, sales, users, priceHistory, dashboard: stats };
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
      SELECT id, supplier_id, category, name, unit, unit_content, base_price, cost_price, sale_price, stock, barcode
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
      SELECT p.id, p.supplier_id, s.name AS supplier, p.invoice_number, p.purchased_at, p.total
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
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

  throw new Error("Collection belum dibuat handler list.");
}

async function addRow(collection, item = {}) {
  assertCollection(collection);

  if (collection === "products") {
    const payload = productPayload(item);
    const [result] = await db.query(`
      INSERT INTO products (supplier_id, category, name, unit, unit_content, base_price, sale_price, stock, barcode)
      VALUES (:supplierId, :category, :name, :unit, :unitContent, :basePrice, :salePrice, :stock, :barcode)
    `, payload);
    await recordPriceHistory(result.insertId, "barang");
    return findRow("products", result.insertId);
  }

  if (collection === "suppliers") {
    const [result] = await db.query(`
      INSERT INTO suppliers (name, phone, address, notes)
      VALUES (:name, :phone, :address, :notes)
    `, supplierPayload(item));
    return findRow("suppliers", result.insertId);
  }

  if (collection === "purchases") {
    const [result] = await db.query(`
      INSERT INTO purchases (supplier_id, user_id, invoice_number, purchased_at, total)
      VALUES (:supplierId, :userId, :invoice, :date, :total)
    `, purchasePayload(item));
    return findRow("purchases", result.insertId);
  }

  if (collection === "sales") {
    const payload = await salePayload(item);
    const [result] = await db.query(`
      INSERT INTO sales (user_id, product_id, sold_at, unit_sold, unit_content, cost_price, sale_price, notes)
      VALUES (:userId, :productId, :date, :unitSold, :unitContent, :costPrice, :salePrice, :notes)
    `, payload);
    return findRow("sales", result.insertId);
  }

  if (collection === "users") {
    await validateSuperAdminCreate(item);
    const [result] = await db.query(`
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES (:name, :email, :passwordHash, :role, :status)
    `, userPayload(item, true));
    return findRow("users", result.insertId);
  }

  throw new Error("Collection belum dibuat handler tambah.");
}

async function updateRow(collection, id, item = {}) {
  assertCollection(collection);
  if (!id) throw new Error("ID wajib dikirim.");

  if (collection === "products") {
    const before = await findRow("products", id);
    const payload = { ...productPayload({ ...before, ...item }), id };
    await db.query(`
      UPDATE products
      SET supplier_id = :supplierId, category = :category, name = :name, unit = :unit,
          unit_content = :unitContent, base_price = :basePrice, sale_price = :salePrice,
          stock = :stock, barcode = :barcode
      WHERE id = :id
    `, payload);
    if (Number(before.basePrice) !== Number(payload.basePrice)) await recordPriceHistory(id, "barang");
    return findRow("products", id);
  }

  if (collection === "suppliers") {
    const before = await findRow("suppliers", id);
    await db.query(`
      UPDATE suppliers
      SET name = :name, phone = :phone, address = :address, notes = :notes
      WHERE id = :id
    `, { ...supplierPayload({ ...before, ...item }), id });
    return findRow("suppliers", id);
  }

  if (collection === "purchases") {
    await db.query(`
      UPDATE purchases
      SET supplier_id = :supplierId, user_id = :userId, invoice_number = :invoice,
          purchased_at = :date, total = :total
      WHERE id = :id
    `, { ...purchasePayload(item), id });
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
    return findRow("sales", id);
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
  if (!user || user.status !== "Aktif" || user.password_hash !== hashPassword(password)) {
    throw new Error("Password Super Admin salah.");
  }
  return { id: user.id, name: user.name, role: user.role };
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

  if (!user || user.status !== "Aktif" || user.password_hash !== hashPassword(password)) {
    throw new Error("Nama atau password Super Admin salah.");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: displayRole(user.role),
    status: user.status
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

function productPayload(item) {
  return {
    supplierId: nullableNumber(item.supplierId),
    category: item.category || "Umum",
    name: required(item.name, "Nama barang"),
    unit: item.unit || "pcs",
    unitContent: Math.max(number(item.unitContent), 1),
    basePrice: number(item.basePrice),
    salePrice: number(item.salePrice),
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
    total: number(item.total) || qty * amount
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
    costPrice: number(product.costPrice),
    salePrice: number(product.salePrice),
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

function mapProduct(row) {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    category: row.category,
    name: row.name,
    unit: row.unit,
    unitContent: Number(row.unit_content || 1),
    basePrice: Number(row.base_price || 0),
    costPrice: Number(row.cost_price || 0),
    salePrice: Number(row.sale_price || 0),
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
    supplierId: row.supplier_id,
    supplier: row.supplier || "-",
    invoice: row.invoice_number || "-",
    date: formatDate(row.purchased_at),
    product: row.product || "",
    qty: Number(row.qty || 0),
    amount: Number(row.amount || 0),
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

const AI_PROVIDERS = ["gemini", "openai", "groq", "deepseek"];
const VISION_PROVIDERS = ["gemini", "openai"];
const AI_KEY_LIMIT = 10;

function providerLabel(provider) {
  const labels = {
    gemini: "Gemini",
    openai: "OpenAI",
    groq: "Groq",
    deepseek: "DeepSeek"
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
    deepseek: "deepseek-chat"
  };
  return models[normalizeProvider(provider)];
}

function providerKeysSettingKey(provider) {
  return `AI_KEYS_${normalizeProvider(provider).toUpperCase()}`;
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

function parseStoredApiKeys(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(normalizeApiKeyRecord).filter(Boolean);
  } catch (error) {
    return String(raw).split(/\r?\n|,/).map((key) => normalizeApiKeyRecord(key)).filter(Boolean);
  }
  return [];
}

function normalizeApiKeyRecord(value) {
  if (!value) return null;
  const record = typeof value === "string" ? { key: value } : value;
  const key = String(record.key || record.apiKey || "").trim();
  if (!key) return null;
  const status = ["live", "dead", "pending"].includes(record.status) ? record.status : "pending";
  return {
    id: record.id || crypto.createHash("sha1").update(key).digest("hex").slice(0, 12),
    key,
    status,
    lastChecked: record.lastChecked || null,
    message: record.message || ""
  };
}

function serializeApiKeyList(keys) {
  return JSON.stringify(keys.slice(0, AI_KEY_LIMIT));
}

function mergeApiKeyLayers(existing, incoming) {
  const seen = new Set();
  return [...existing, ...incoming]
    .map(normalizeApiKeyRecord)
    .filter(Boolean)
    .filter((record) => {
      const fingerprint = crypto.createHash("sha1").update(record.key).digest("hex");
      if (seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    })
    .slice(0, AI_KEY_LIMIT);
}

function maskApiKey(key) {
  const text = String(key || "");
  if (text.length <= 10) return "*".repeat(Math.max(text.length, 6));
  return `${text.slice(0, 6)}${"*".repeat(Math.min(text.length - 10, 18))}${text.slice(-4)}`;
}

async function getProviderKeyRecords(provider) {
  const normalized = normalizeProvider(provider);
  const stored = parseStoredApiKeys(await getSetting(providerKeysSettingKey(normalized), "[]"));
  const envRecords = readEnvKeys(normalized).map((key) => normalizeApiKeyRecord({ key, status: "live", message: "ENV" }));
  return mergeApiKeyLayers(stored, envRecords);
}

async function setProviderKeyRecords(provider, keys) {
  await setSetting(providerKeysSettingKey(provider), serializeApiKeyList(keys));
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
    masked: maskApiKey(key.key),
    status: key.status || "pending",
    model: defaultAiModel(provider),
    lastChecked: key.lastChecked,
    message: key.message || ""
  };
}

async function saveAiSettings(payload = {}) {
  const provider = normalizeProvider(payload.provider);
  const incoming = (Array.isArray(payload.apiKeys) ? payload.apiKeys : [])
    .map((key) => normalizeApiKeyRecord({ key, status: "pending", message: "Belum dicek" }))
    .filter(Boolean);
  const existing = await getProviderKeyRecords(provider);
  const merged = mergeApiKeyLayers(existing, incoming);
  await setSetting("AI_PROVIDER", provider);
  await setSetting(providerModelSettingKey(provider), payload.model && payload.model !== "auto" ? payload.model : defaultAiModel(provider));
  await setProviderKeyRecords(provider, merged);
  return getAiSettings(provider);
}

async function editAiKey(payload = {}) {
  const provider = normalizeProvider(payload.provider);
  const keys = await getProviderKeyRecords(provider);
  const index = keys.findIndex((key) => key.id === payload.keyId);
  if (index < 0) throw new Error("API key tidak ditemukan.");
  const replacement = normalizeApiKeyRecord({ key: payload.apiKey, status: "pending", message: "Belum dicek" });
  if (!replacement) throw new Error("API key pengganti wajib diisi.");
  keys[index] = replacement;
  await setProviderKeyRecords(provider, mergeApiKeyLayers([], keys));
  return getAiSettings(provider);
}

async function deleteAiKey(payload = {}) {
  const provider = normalizeProvider(payload.provider);
  const keys = await getProviderKeyRecords(provider);
  const next = keys.filter((key) => key.id !== payload.keyId);
  await setProviderKeyRecords(provider, next);
  return getAiSettings(provider);
}

async function testAiSettings(provider) {
  const selected = normalizeProvider(provider);
  const keys = await getProviderKeyRecords(selected);
  if (!keys.length) throw new Error("API_KEY_NOT_CONFIGURED_ON_RAILWAY");

  const checked = [];
  for (const key of keys) {
    checked.push(await checkApiKey(selected, key));
  }
  await setProviderKeyRecords(selected, checked);
  const live = checked.filter((key) => key.status === "live").length;
  return {
    provider: selected,
    model: defaultAiModel(selected),
    message: live ? `${live} API key aktif.` : "Belum ada key LIVE. Key dengan error jaringan dibiarkan PENDING.",
    keys: checked.map((key, index) => keyPublicInfo(key, selected, index))
  };
}

async function checkApiKey(provider, keyRecord) {
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetchWithTimeout(healthCheckUrl(provider, keyRecord.key), healthCheckOptions(provider, keyRecord.key), 12000);
    if (response.ok) {
      return { ...keyRecord, status: "live", lastChecked: checkedAt, message: "OK" };
    }
    if ([401, 403, 429].includes(response.status)) {
      return { ...keyRecord, status: "dead", lastChecked: checkedAt, message: `HTTP ${response.status}` };
    }
    return { ...keyRecord, status: keyRecord.status === "dead" ? "pending" : keyRecord.status, lastChecked: checkedAt, message: `HTTP ${response.status}` };
  } catch (error) {
    return { ...keyRecord, status: keyRecord.status === "dead" ? "pending" : keyRecord.status, lastChecked: checkedAt, message: error.message };
  }
}

function healthCheckUrl(provider, apiKey) {
  const urls = {
    gemini: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    openai: "https://api.openai.com/v1/models",
    groq: "https://api.groq.com/openai/v1/models",
    deepseek: "https://api.deepseek.com/models"
  };
  return urls[normalizeProvider(provider)];
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
        const hasil = await executeVisionRequest(provider.provider, key.key, imageDataUrl, instruction);
        if (hasil) return { hasil, provider: provider.provider, model: provider.model };
      } catch (error) {
        logger.warn("Provider AI gagal, mencoba layer berikutnya.", {
          provider: provider.provider,
          key: maskApiKey(key.key),
          error: error.message
        });
      }
    }
  }

  throw new Error("Semua API Provider gagal atau belum ada API key vision LIVE/PENDING.");
}

async function getVisionProviders() {
  const active = normalizeProvider(await getSetting("AI_PROVIDER", process.env.AI_PROVIDER || "gemini"));
  const order = [active, ...VISION_PROVIDERS].filter((provider, index, arr) => VISION_PROVIDERS.includes(provider) && arr.indexOf(provider) === index);
  const providers = [];
  for (const provider of order) {
    const keys = (await getProviderKeyRecords(provider)).filter((key) => key.status !== "dead");
    if (keys.length) {
      const model = await getSetting(providerModelSettingKey(provider), defaultAiModel(provider));
      providers.push({ provider, model: model === "auto" ? defaultAiModel(provider) : model, keys });
    }
  }
  return providers;
}

async function executeVisionRequest(provider, apiKey, imageDataUrl, instruction) {
  if (provider === "gemini") return executeGeminiVision(apiKey, imageDataUrl, instruction);
  if (provider === "openai") return executeOpenAiVision(apiKey, imageDataUrl, instruction);
  throw new Error(`${providerLabel(provider)} belum mendukung analisa gambar di aplikasi ini.`);
}

async function executeGeminiVision(apiKey, imageDataUrl, instruction) {
  const { mimeType, data } = splitDataUrl(imageDataUrl);
  const model = defaultAiModel("gemini");
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
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
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error?.message || `Gemini HTTP ${response.status}`);
  return json.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
}

async function executeOpenAiVision(apiKey, imageDataUrl, instruction) {
  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: defaultAiModel("openai"),
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: instruction },
          { type: "input_image", image_url: imageDataUrl }
        ]
      }],
      temperature: 0.1,
      max_output_tokens: 2048
    })
  }, 45000);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error?.message || `OpenAI HTTP ${response.status}`);
  return json.output_text || json.output?.flatMap((item) => item.content || []).map((part) => part.text || "").join("").trim();
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
  if (!["products", "suppliers", "purchases", "sales", "users", "priceHistory"].includes(collection)) {
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
    priceHistory: "price_history"
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
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value) {
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
