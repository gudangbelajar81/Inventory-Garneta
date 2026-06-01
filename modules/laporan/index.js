import { formatCurrency, list } from "../../assets/js/api.js";
import { can } from "../../assets/js/auth.js";
import { table } from "../../assets/components/table.js";

export function render() {
  if (!can("view_reports")) {
    return `<div class="module-card p-6"><h2 class="text-xl font-bold">Akses dibatasi</h2><p class="mt-2 text-slate-500">Employee tidak dapat membuka laporan finansial.</p></div>`;
  }

  const purchases = list("purchases");
  const sales = list("sales");

  return `
    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-xl font-bold">Laporan</h2>
        <button class="rounded-md bg-success px-4 py-2 text-sm font-semibold text-white">Export Excel</button>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="module-card p-4">
          <h3 class="mb-3 font-bold">Laporan Pembelian</h3>
          ${table([
            { key: "date", label: "Tanggal" },
            { key: "supplier", label: "Supplier" },
            { key: "total", label: "Total", render: (row) => formatCurrency(row.total) }
          ], purchases)}
        </div>
        <div class="module-card p-4">
          <h3 class="mb-3 font-bold">Laporan Profit</h3>
          ${table([
            { key: "date", label: "Tanggal" },
            { key: "product", label: "Barang" },
            { key: "profit", label: "Profit", render: (row) => formatCurrency(row.profit) }
          ], sales)}
        </div>
      </div>
    </section>
  `;
}
