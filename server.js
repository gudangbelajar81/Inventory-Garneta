require('dotenv').config();
const mysql = require('mysql2/promise'); // Kita pakai versi promise agar lebih stabil

const app = express();

// --- KONEKSI DATABASE OTOMATIS ---
// Railway menyediakan DATABASE_URL, lokal menggunakan .env
const dbConfig = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL 
  : {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'retail_inventory'
    };

const pool = mysql.createPool(dbConfig);

// Cek koneksi saat server mulai
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Berhasil terhubung ke database!');
    connection.release();
  } catch (err) {
    console.error('❌ Gagal terhubung ke database:', err.message);
  }
})();

// ... sisanya kode aplikasi kamu (app.get, app.post, dll) ...
const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || "localhost",
  port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
  user: process.env.MYSQLUSER || process.env.DB_USER || "root",
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || "",
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || "retail_inventory",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
};

const db = mysql.createPool({
  ...dbConfig
});

const featureModules = loadFeatureModules();

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ ok: true, message: "Server dan database aktif." });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.post("/api", async (req, res) => {
  try {
    const { action, payload = {} } = req.body || {};
    if (!action) throw new Error("Action wajib dikirim.");

    const data = await handleAction(action, payload);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

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
  const [stockAlerts] = await db.query(`
    SELECT id, category, name, unit, unit_content, base_price, cost_price, sale_price, stock, min_stock, barcode
    FROM products
    WHERE stock <= min_stock
    ORDER BY name ASC
  `);

  return {
    totalProducts: Number(stats.totalProducts || 0),
    totalSuppliers: Number(stats.totalSuppliers || 0),
    stockValue: Number(stats.stockValue || 0),
    totalProfit: Number(stats.totalProfit || 0),
    stockAlerts: stockAlerts.map(mapProduct)
  };
}

async function listRows(collection) {
  assertCollection(collection);

  if (collection === "products") {
    const [rows] = await db.query(`
      SELECT id, supplier_id, category, name, unit, unit_content, base_price, cost_price, sale_price, stock, min_stock, barcode
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
      INSERT INTO products (supplier_id, category, name, unit, unit_content, base_price, sale_price, stock, min_stock, barcode)
      VALUES (:supplierId, :category, :name, :unit, :unitContent, :basePrice, :salePrice, :stock, :minStock, :barcode)
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
          stock = :stock, min_stock = :minStock, barcode = :barcode
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
    minStock: number(item.minStock),
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
    minStock: Number(row.min_stock || 0),
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

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
