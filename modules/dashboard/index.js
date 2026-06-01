import { formatCurrency, getDashboardStats, list } from "../../assets/js/api.js";
import { table } from "../../assets/components/table.js";

export function render() {
  const stats = getDashboardStats();
  const logs = list("activityLogs");
  const cards = [
    ["Total Barang", stats.totalProducts, "linear-gradient(135deg, #dcfce7, #f0fdf4)"],
    ["Total Supplier", stats.totalSuppliers, "linear-gradient(135deg, #ffedd5, #fff7ed)"],
    ["Nilai Stok", formatCurrency(stats.stockValue), "linear-gradient(135deg, #ecfccb, #ffffff)"],
    ["Total Profit", formatCurrency(stats.totalProfit), "linear-gradient(135deg, #bbf7d0, #fed7aa)"]
  ];

  return `
    <section class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        ${cards.map(([label, value, color]) => `
          <div class="module-card p-4" style="background: ${color};">
            <p class="text-sm font-semibold text-slate-600">${label}</p>
            <p class="mt-2 text-2xl font-bold">${value}</p>
          </div>
        `).join("")}
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="module-card p-4">
          <h3 class="mb-3 font-bold">Stock Alert</h3>
          ${table([
            { key: "name", label: "Barang" },
            { key: "stock", label: "Stok" },
            { key: "minStock", label: "Minimum" }
          ], stats.stockAlerts)}
        </div>
        <div class="module-card p-4">
          <h3 class="mb-3 font-bold">Aktivitas Terbaru</h3>
          ${table([
            { key: "createdAt", label: "Waktu" },
            { key: "message", label: "Aktivitas" }
          ], logs)}
        </div>
      </div>
    </section>
  `;
}
