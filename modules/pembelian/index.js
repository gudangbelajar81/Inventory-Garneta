import { formatCurrency, list } from "../../assets/js/api.js";
import { can } from "../../assets/js/auth.js";
import { table } from "../../assets/components/table.js";

export function render() {
  if (!can("manage_purchases")) {
    return `<div class="module-card p-6"><h2 class="text-xl font-bold">Akses dibatasi</h2><p class="mt-2 text-slate-500">Employee tidak dapat membuka transaksi pembelian.</p></div>`;
  }

  return `
    <section class="space-y-4">
      <div>
        <h2 class="text-xl font-bold">Pembelian</h2>
        <p class="text-sm text-slate-500">Transaksi pembelian, histori harga, upload nota, dan kamera.</p>
      </div>
      ${table([
        { key: "date", label: "Tanggal" },
        { key: "supplier", label: "Supplier" },
        { key: "invoice", label: "Nota" },
        { key: "total", label: "Total", render: (row) => formatCurrency(row.total) }
      ], list("purchases"))}
    </section>
  `;
}
