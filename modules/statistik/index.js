import { formatCurrency, list } from "../../assets/js/api.js";
import { listPriceHistory } from "../../assets/js/priceHistory.js";
import { table } from "../../assets/components/table.js";

function groupHistory(rows) {
  return rows.reduce((result, row) => {
    const key = row.productId ?? row.productName;
    if (!result[key]) {
      result[key] = {
        productId: row.productId,
        productName: row.productName,
        rows: []
      };
    }
    result[key].rows.push(row);
    return result;
  }, {});
}

function priceChart(historyRows) {
  const rows = [...historyRows].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
  const maxPrice = Math.max(...rows.map((row) => Number(row.basePrice)), 1);

  return `
    <div class="sales-chart" aria-label="Grafik perubahan harga barang">
      ${rows.map((row, index) => {
        const height = Math.max((Number(row.basePrice) / maxPrice) * 100, 8);
        const date = new Date(row.recordedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });

        return `
          <button
            class="sales-chart-bar"
            style="height: ${height}%"
            title="${row.productName}: ${formatCurrency(row.basePrice)}"
            data-price="${row.basePrice}"
            data-date="${date}"
          >
            <span>${index + 1}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

export async function render() {
  const products = await list("products");
  const history = listPriceHistory();
  const grouped = groupHistory(history);
  const productOptions = products.map((product) => `
    <option value="${product.id}">${product.name}</option>
  `).join("");
  const selectedProductId = products[0]?.id;
  const selectedHistory = grouped[selectedProductId]?.rows ?? history.filter((row) => row.productName === products[0]?.name);

  return `
    <section class="space-y-5">
      <div>
        <h2 class="text-xl font-bold">Statistik</h2>
        <p class="text-sm text-slate-500">Grafik perubahan harga dasar barang dari waktu ke waktu. Harga dasar di menu Barang selalu memakai update terakhir.</p>
      </div>

      <div class="module-card p-4">
        <div class="mb-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <h3 class="font-bold">Grafik Perubahan Harga</h3>
            <p class="text-sm text-slate-500">Histori tersimpan dari input Barang, scanner, atau foto saat nanti dihubungkan.</p>
          </div>
          <label class="block">
            <span class="text-sm font-semibold">Pilih Barang</span>
            <select id="stat-product" class="input-field mt-1">
              ${productOptions}
            </select>
          </label>
        </div>
        <div id="stat-chart">
          ${selectedHistory.length ? priceChart(selectedHistory) : `<div class="rounded-md bg-slate-50 p-6 text-sm text-slate-500">Belum ada histori harga. Ubah Harga Dasar di menu Barang untuk mulai merekam statistik.</div>`}
        </div>
      </div>

      <div class="module-card p-4">
        <h3 class="mb-3 font-bold">Histori Harga</h3>
        ${table([
          { key: "recordedAt", label: "Waktu", render: (row) => new Date(row.recordedAt).toLocaleString("id-ID") },
          { key: "productName", label: "Barang" },
          { key: "basePrice", label: "Harga Dasar", render: (row) => formatCurrency(row.basePrice) },
          { key: "source", label: "Sumber" }
        ], history)}
      </div>
    </section>
  `;
}

export function afterRender() {
  const grouped = groupHistory(listPriceHistory());
  const chart = document.querySelector("#stat-chart");

  document.querySelector("#stat-product")?.addEventListener("change", (event) => {
    const rows = grouped[event.target.value]?.rows ?? [];
    if (!chart) return;
    chart.innerHTML = rows.length
      ? priceChart(rows)
      : `<div class="rounded-md bg-slate-50 p-6 text-sm text-slate-500">Belum ada histori harga untuk barang ini.</div>`;
  });
}
