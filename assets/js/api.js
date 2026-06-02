const STORE_KEY = "retail_inventory_data";
const API_BASE_URL_KEY = "retail_inventory_api_base_url";

export const API_BASE_URL = localStorage.getItem(API_BASE_URL_KEY) || "http://localhost:3000/api";

const endpoints = {
  products: "products",
  suppliers: "suppliers",
  purchases: "purchases",
  purchaseDetails: "purchase-details",
  sales: "sales",
  priceHistory: "price-history",
  repacking: "repacking",
  users: "users",
  activityLogs: "activity-logs"
};

const seedData = {
  products: [
    { id: 1, category: "Beras", name: "Beras Premium", unit: "sak", unitContent: 25, basePrice: 312500, costPrice: 12500, salePrice: 14500, minStock: 80, stock: 420 },
    { id: 2, category: "Gula", name: "Gula Pasir", unit: "sak", unitContent: 50, basePrice: 660000, costPrice: 13200, salePrice: 15000, minStock: 50, stock: 180 },
    { id: 3, category: "Minyak", name: "Minyak Goreng", unit: "jligen", unitContent: 18, basePrice: 271800, costPrice: 15100, salePrice: 17000, minStock: 90, stock: 72 }
  ],
  suppliers: [
    { id: 1, name: "CV Sumber Pangan", phone: "0812-0000-1100", notes: "Beras dan gula" },
    { id: 2, name: "UD Makmur Jaya", phone: "0813-0000-2200", notes: "Minyak dan kebutuhan harian" }
  ],
  purchases: [
    { id: 1, date: "2026-05-29", supplier: "CV Sumber Pangan", total: 8200000, invoice: "NOTA-001" },
    { id: 2, date: "2026-05-30", supplier: "UD Makmur Jaya", total: 3500000, invoice: "NOTA-002" }
  ],
  sales: [
    { id: 1, date: "2026-05-30", product: "Beras Premium", productId: 1, unitSold: 35, unitContent: 1, qty: 35, profitPerUnit: 2000, profit: 70000 },
    { id: 2, date: "2026-05-31", product: "Gula Pasir", productId: 2, unitSold: 20, unitContent: 1, qty: 20, profitPerUnit: 1800, profit: 36000 }
  ],
  repacking: [
    { id: 1, product: "Beras Premium", grossWeight: 50, shrinkage: 0.5, netWeight: 49.5, costPerKg: 12626 }
  ],
  users: [
    { id: 1, name: "Admin Gudang", role: "Super Admin", status: "Aktif" },
    { id: 2, name: "Kasir Toko", role: "Employee", status: "Aktif" }
  ],
  activityLogs: [
    { id: 1, message: "Harga kulakan Beras Premium diperbarui", createdAt: "2026-05-30 09:15" },
    { id: 2, message: "Penjualan Gula Pasir dicatat", createdAt: "2026-05-31 13:20" }
  ]
};

function readStore() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) {
    localStorage.setItem(STORE_KEY, JSON.stringify(seedData));
    return structuredClone(seedData);
  }

  return JSON.parse(saved);
}

function writeStore(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function endpointFor(collection) {
  return endpoints[collection] ?? collection;
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function normalizeProduct(product) {
  const unitContent = Number(product.unitContent ?? product.unit_content ?? 1);
  const basePrice = Number(product.basePrice ?? product.base_price ?? 0);
  const costPrice = Number(product.costPrice ?? product.cost_price ?? (unitContent > 0 ? basePrice / unitContent : 0));
  const salePrice = Number(product.salePrice ?? product.sale_price ?? 0);

  return {
    ...product,
    id: Number(product.id),
    supplierId: product.supplierId ?? product.supplier_id ?? null,
    category: product.category ?? product.code ?? "Umum",
    unit: product.unit ?? "pcs",
    unitContent,
    basePrice,
    costPrice,
    salePrice,
    minStock: Number(product.minStock ?? product.min_stock ?? 0),
    stock: Number(product.stock ?? 0),
    photoPath: product.photoPath ?? product.photo_path ?? null,
    qrCode: product.qrCode ?? product.qr_code ?? null
  };
}

function normalizeSale(sale) {
  const product = sale.product?.name ?? sale.product_name ?? sale.product ?? "";
  const unitSold = Number(sale.unitSold ?? sale.unit_sold ?? sale.qty ?? sale.quantity_sold ?? 0);
  const unitContent = Number(sale.unitContent ?? sale.unit_content ?? 1);
  const qty = Number(sale.qty ?? sale.quantity_sold ?? unitSold * unitContent);
  const profit = Number(sale.profit ?? 0);
  const profitPerUnit = Number(sale.profitPerUnit ?? sale.profit_per_unit ?? (qty > 0 ? profit / qty : 0));

  return {
    ...sale,
    id: Number(sale.id),
    userId: sale.userId ?? sale.user_id ?? null,
    productId: sale.productId ?? sale.product_id ?? null,
    product,
    date: sale.date ?? sale.sold_at ?? null,
    unitSold,
    unitContent,
    qty,
    profitPerUnit,
    profit
  };
}

function normalizePurchase(purchase) {
  return {
    ...purchase,
    id: Number(purchase.id),
    supplierId: purchase.supplierId ?? purchase.supplier_id ?? null,
    supplier: purchase.supplier?.name ?? purchase.supplier_name ?? purchase.supplier ?? "-",
    invoice: purchase.invoice ?? purchase.invoice_number ?? "-",
    invoicePhotoPath: purchase.invoicePhotoPath ?? purchase.invoice_photo_path ?? null,
    date: purchase.date ?? purchase.purchased_at ?? null,
    total: Number(purchase.total ?? 0)
  };
}

function normalizeRepacking(row) {
  const grossWeight = Number(row.grossWeight ?? row.gross_weight ?? 0);
  const shrinkage = Number(row.shrinkage ?? 0);
  return {
    ...row,
    id: Number(row.id),
    product: row.product?.name ?? row.product ?? row.source_product_name ?? "-",
    sourceProductId: row.sourceProductId ?? row.source_product_id ?? null,
    targetProductId: row.targetProductId ?? row.target_product_id ?? null,
    grossWeight,
    shrinkage,
    netWeight: Number(row.netWeight ?? row.net_weight ?? grossWeight - shrinkage),
    costPerKg: Number(row.costPerKg ?? row.cost_per_kg ?? row.cost_per_unit ?? 0)
  };
}

function normalizeActivity(row) {
  return {
    ...row,
    id: Number(row.id),
    message: row.message ?? row.activity ?? "-",
    createdAt: row.createdAt ?? row.created_at ?? "-"
  };
}

function normalizeUser(user) {
  return {
    ...user,
    id: Number(user.id),
    name: user.name ?? "-",
    email: user.email ?? "",
    role: user.role ?? "Employee",
    status: user.status ?? "Aktif",
    fingerprintEnabled: Boolean(user.fingerprintEnabled ?? user.fingerprint_enabled),
    cameraEnabled: Boolean(user.cameraEnabled ?? user.camera_enabled)
  };
}

function normalize(collection, row) {
  if (collection === "products") return normalizeProduct(row);
  if (collection === "sales") return normalizeSale(row);
  if (collection === "purchases") return normalizePurchase(row);
  if (collection === "repacking") return normalizeRepacking(row);
  if (collection === "activityLogs") return normalizeActivity(row);
  if (collection === "users") return normalizeUser(row);
  return row;
}

function toApiPayload(collection, item) {
  if (collection === "products") {
    const payload = {
      category: item.category,
      name: item.name,
      unit: item.unit,
      unit_content: Number(item.unitContent ?? item.unit_content ?? 1),
      base_price: Number(item.basePrice ?? item.base_price ?? 0),
      sale_price: Number(item.salePrice ?? item.sale_price ?? 0),
      stock: Number(item.stock ?? 0),
      min_stock: Number(item.minStock ?? item.min_stock ?? 0),
      barcode: item.barcode ?? null
    };

    const supplierId = item.supplierId ?? item.supplier_id;
    if (supplierId) payload.supplier_id = Number(supplierId);
    return payload;
  }

  if (collection === "sales") {
    return {
      user_id: item.userId ?? item.user_id ?? 2,
      product_id: Number(item.productId ?? item.product_id),
      sold_at: item.date ?? item.sold_at,
      unit_sold: Number(item.unitSold ?? item.unit_sold ?? 0),
      unit_content: Number(item.unitContent ?? item.unit_content ?? 1),
      notes: item.notes ?? null
    };
  }

  if (collection === "users") {
    const payload = {
      name: item.name,
      email: item.email || `${String(item.name ?? "user").toLowerCase().replace(/\s+/g, ".")}@example.com`,
      role: item.role ?? "Employee",
      status: item.status ?? "Aktif"
    };

    if (item.password) payload.password = item.password;
    return payload;
  }

  return item;
}

async function listFromApi(collection, params = {}) {
  const query = new URLSearchParams({ page: "1", limit: "100", ...params });
  const payload = await request(`${endpointFor(collection)}?${query.toString()}`);
  return extractRows(payload).map((row) => normalize(collection, row));
}

function listFromStore(collection) {
  return (readStore()[collection] ?? []).map((row) => normalize(collection, row));
}

export async function list(collection, params = {}) {
  try {
    return await listFromApi(collection, params);
  } catch (error) {
    console.warn(`API ${collection} tidak tersedia, memakai localStorage.`, error);
    return listFromStore(collection);
  }
}

export async function add(collection, item) {
  try {
    const payload = await request(endpointFor(collection), {
      method: "POST",
      body: JSON.stringify(toApiPayload(collection, item))
    });
    return normalize(collection, payload?.data ?? payload ?? item);
  } catch (error) {
    console.warn(`Gagal POST ${collection}, menyimpan ke localStorage.`, error);
    const data = readStore();
    const rows = data[collection] ?? [];
    const next = { ...item, id: item.id ? Number(item.id) : Date.now() };
    data[collection] = [next, ...rows];
    writeStore(data);
    return normalize(collection, next);
  }
}

export async function update(collection, id, changes) {
  try {
    const payload = await request(`${endpointFor(collection)}/${id}`, {
      method: "PUT",
      body: JSON.stringify(toApiPayload(collection, changes))
    });
    return normalize(collection, payload?.data ?? payload ?? changes);
  } catch (error) {
    console.warn(`Gagal PUT ${collection}/${id}, memperbarui localStorage.`, error);
    const data = readStore();
    const rows = data[collection] ?? [];
    data[collection] = rows.map((row) => String(row.id) === String(id) ? { ...row, ...changes, id: row.id } : row);
    writeStore(data);
    return normalize(collection, { id, ...changes });
  }
}

export async function remove(collection, id) {
  try {
    await request(`${endpointFor(collection)}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.warn(`Gagal DELETE ${collection}/${id}, menghapus dari localStorage.`, error);
  }

  const data = readStore();
  const rows = data[collection] ?? [];
  data[collection] = rows.filter((row) => String(row.id) !== String(id));
  writeStore(data);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value ?? 0);
}

export async function getDashboardStats() {
  const [products, suppliers, sales] = await Promise.all([
    list("products"),
    list("suppliers"),
    list("sales")
  ]);
  const stockValue = products.reduce((sum, product) => sum + product.stock * product.costPrice, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);

  return {
    totalProducts: products.length,
    totalSuppliers: suppliers.length,
    stockValue,
    totalProfit,
    stockAlerts: products.filter((product) => product.stock <= product.minStock)
  };
}
