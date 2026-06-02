import { formatCurrency, list } from "../../assets/js/api.js";
import { can } from "../../assets/js/auth.js";
import { table } from "../../assets/components/table.js";

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthLabel() {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date());
}

function getCurrentMonthDays() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1);
    const dateYear = date.getFullYear();
    const dateMonth = String(date.getMonth() + 1).padStart(2, "0");
    const dateDay = String(date.getDate()).padStart(2, "0");
    return `${dateYear}-${dateMonth}-${dateDay}`;
  });
}

function normalizeSale(sale) {
  const qty = Number(sale.qty ?? sale.quantity_sold ?? 0);
  const profit = Number(sale.profit ?? 0);

  return {
    ...sale,
    date: sale.date ?? sale.sold_at ?? today(),
    qty,
    profit,
    product: sale.product?.name ?? sale.product_name ?? sale.product ?? "-"
  };
}

function dailyReport(sales) {
  const grouped = sales.reduce((result, sale) => {
    const date = sale.date ?? today();
    if (!result[date]) {
      result[date] = { date, transactionCount: 0, totalQty: 0, totalProfit: 0 };
    }

    result[date].transactionCount += 1;
    result[date].totalQty += Number(sale.qty ?? 0);
    result[date].totalProfit += Number(sale.profit ?? 0);
    return result;
  }, {});

  return getCurrentMonthDays()
    .map((date) => grouped[date] ?? { date, transactionCount: 0, totalQty: 0, totalProfit: 0 })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function salesChart(reports) {
  const visibleReports = [...reports].reverse();
  const maxProfit = Math.max(...visibleReports.map((report) => report.totalProfit), 1);
  const monthProfit = reports.reduce((sum, row) => sum + row.totalProfit, 0);

  return `
    <div class="module-card p-4">
      <div class="mb-4">
        <h3 class="font-bold">Grafik Penjualan</h3>
        <p class="text-sm text-slate-500">Pergerakan keuntungan harian bulan ini.</p>
      </div>
      <div class="mb-4 rounded-md bg-gradient-to-br from-green-100 to-orange-100 p-4">
        <p class="text-sm font-semibold text-slate-600">Akumulasi Bulan Ini</p>
        <p class="mt-1 text-2xl font-bold text-green-800">${formatCurrency(monthProfit)}</p>
      </div>
      <div class="sales-chart" aria-label="Grafik keuntungan harian">
        ${visibleReports.map((report) => {
          const height = Math.max((report.totalProfit / maxProfit) * 100, report.totalProfit > 0 ? 10 : 3);
          const day = Number(report.date.slice(-2));

          return `
            <button
              class="sales-chart-bar"
              style="height: ${height}%"
              title="${report.date}: ${formatCurrency(report.totalProfit)}"
              data-date="${report.date}"
              data-profit="${report.totalProfit}"
            >
              <span>${day}</span>
            </button>
          `;
        }).join("")}
      </div>
      <div class="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>1</span>
        <span>${getMonthLabel()}</span>
        <span>${visibleReports.length}</span>
      </div>
      <div id="sales-chart-result" class="mt-4 rounded-md border border-green-100 bg-white p-4">
        <p class="text-sm font-semibold text-slate-500">Hasil Grafik</p>
        <p class="mt-1 text-lg font-bold text-slate-900">Klik bar grafik untuk melihat nominal harian.</p>
      </div>
    </div>
  `;
}

export async function render() {
  if (!can("view_reports")) {
    return `<div class="module-card p-6"><h2 class="text-xl font-bold">Akses dibatasi</h2><p class="mt-2 text-slate-500">Employee tidak dapat membuka laporan finansial.</p></div>`;
  }

  const purchases = await list("purchases");
  const sales = (await list("sales")).map(normalizeSale);
  const reports = dailyReport(sales);

  return `
    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-xl font-bold">Laporan</h2>
        <button class="rounded-md bg-success px-4 py-2 text-sm font-semibold text-white">Export Excel</button>
      </div>

      ${salesChart(reports)}

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

export function afterRender() {
  const result = document.querySelector("#sales-chart-result");

  document.querySelectorAll(".sales-chart-bar").forEach((button) => {
    button.addEventListener("click", () => {
      const profit = Number(button.dataset.profit ?? 0);
      if (!result) return;

      result.innerHTML = `
        <p class="text-sm font-semibold text-slate-500">Grafik ${button.dataset.date}</p>
        <p class="mt-1 text-2xl font-bold text-green-700">${formatCurrency(profit)}</p>
        <p class="mt-1 text-sm text-slate-500">Nominal keuntungan dari bar grafik yang dipilih.</p>
      `;
    });
  });
}
