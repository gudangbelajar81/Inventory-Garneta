const STORE_KEY = "retail_inventory_data";

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
    { id: 1, date: "2026-05-30", product: "Beras Premium", qty: 35, total: 507500, profit: 70000 },
    { id: 2, date: "2026-05-31", product: "Gula Pasir", qty: 20, total: 300000, profit: 36000 }
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

  const data = JSON.parse(saved);
  data.products = (data.products ?? []).map((product) => ({
    ...product,
    category: product.category ?? product.code ?? "Umum",
    unit: product.unit ?? "pcs",
    unitContent: Number(product.unitContent ?? 1),
    basePrice: product.basePrice !== undefined
      ? Number(product.basePrice)
      : Number(product.costPrice ?? 0) * Number(product.unitContent ?? 1),
    costPrice: Number(product.basePrice ?? 0) > 0
      ? Number(product.basePrice) / Math.max(Number(product.unitContent ?? 1), 1)
      : Number(product.costPrice ?? 0)
  }));

  return data;
}

function writeStore(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

export function list(collection) {
  return readStore()[collection] ?? [];
}

export function add(collection, item) {
  const data = readStore();
  const rows = data[collection] ?? [];
  const next = { id: Date.now(), ...item };
  data[collection] = [next, ...rows];
  writeStore(data);
  return next;
}

export function update(collection, id, changes) {
  const data = readStore();
  const rows = data[collection] ?? [];
  data[collection] = rows.map((row) => row.id === Number(id) ? { ...row, ...changes, id: row.id } : row);
  writeStore(data);
}

export function remove(collection, id) {
  const data = readStore();
  const rows = data[collection] ?? [];
  data[collection] = rows.filter((row) => row.id !== Number(id));
  writeStore(data);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function getDashboardStats() {
  const data = readStore();
  const stockValue = data.products.reduce((sum, product) => sum + product.stock * product.costPrice, 0);
  const totalProfit = data.sales.reduce((sum, sale) => sum + sale.profit, 0);

  return {
    totalProducts: data.products.length,
    totalSuppliers: data.suppliers.length,
    stockValue,
    totalProfit,
    stockAlerts: data.products.filter((product) => product.stock <= product.minStock)
  };
}
