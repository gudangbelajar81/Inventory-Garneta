import { add, formatCurrency, list, remove, update } from "../../assets/js/api.js";
import { can } from "../../assets/js/auth.js";
import { table } from "../../assets/components/table.js";

function today() {
  return formatDate(new Date());
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
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
    return formatDate(date);
  });
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

function reportMap(reports) {
  return reports.reduce((result, report) => {
    result[report.date] = report;
    return result;
  }, {});
}

function salesCalendar(reports) {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const days = getCurrentMonthDays();
  const byDate = reportMap(reports);
  const monthProfit = reports.reduce((sum, row) => sum + row.totalProfit, 0);
  const canViewProfit = can("view_profit");
  const weekDays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  return `
    <div class="module-card compact-calendar p-4">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-bold">Kalender Laporan Penjualan</h3>
          <p class="text-sm text-slate-500">Klik tanggal untuk melihat keuntungan harian. Klik bulan untuk total akumulasi.</p>
        </div>
        <button
          id="month-profit-button"
          class="rounded-md bg-gradient-to-r from-green-100 to-orange-100 px-4 py-2 text-sm font-bold text-green-800"
          data-profit="${monthProfit}"
          data-label="${getMonthLabel()}"
        >
          ${getMonthLabel()}
        </button>
      </div>
      <div class="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500">
        ${weekDays.map((day) => `<div class="py-2">${day}</div>`).join("")}
      </div>
      <div class="grid grid-cols-7 gap-2">
        ${Array.from({ length: firstDay }, () => `<div class="calendar-empty"></div>`).join("")}
        ${days.map((date) => {
          const report = byDate[date] ?? { totalProfit: 0, transactionCount: 0 };
          const dayNumber = Number(date.slice(-2));
          const hasProfit = report.totalProfit > 0;

          return `
            <button
              class="calendar-day ${hasProfit ? "has-profit" : "no-profit"}"
              data-date="${date}"
              data-profit="${report.totalProfit}"
              data-transactions="${report.transactionCount}"
            >
              <span class="calendar-date-number">${dayNumber}</span>
              <span class="calendar-profit-pill">${canViewProfit ? (hasProfit ? formatCurrency(report.totalProfit) : "0") : "-"}</span>
            </button>
          `;
        }).join("")}
      </div>
      <div id="calendar-result" class="mt-4 rounded-md border border-green-100 bg-white p-4">
        <p class="text-sm font-semibold text-slate-500">Hasil</p>
        <p class="mt-1 text-lg font-bold text-slate-900">Pilih tanggal atau klik bulan.</p>
      </div>
    </div>
  `;
}

function salesChart(reports) {
  const visibleReports = [...reports].reverse();
  const maxProfit = Math.max(...visibleReports.map((report) => report.totalProfit), 1);
  const monthProfit = reports.reduce((sum, row) => sum + row.totalProfit, 0);
  const canViewProfit = can("view_profit");

  return `
    <div class="module-card p-4">
      <div class="mb-4">
        <h3 class="font-bold">Grafik Penjualan</h3>
        <p class="text-sm text-slate-500">Pergerakan keuntungan harian bulan ini.</p>
      </div>
      <div class="mb-4 rounded-md bg-gradient-to-br from-green-100 to-orange-100 p-4">
        <p class="text-sm font-semibold text-slate-600">Akumulasi Bulan Ini</p>
        <p class="mt-1 text-2xl font-bold text-green-800">${canViewProfit ? formatCurrency(monthProfit) : "-"}</p>
      </div>
      <div class="sales-chart" aria-label="Grafik keuntungan harian">
        ${visibleReports.map((report) => {
          const height = Math.max((report.totalProfit / maxProfit) * 100, report.totalProfit > 0 ? 10 : 3);
          const day = Number(report.date.slice(-2));

          return `
            <button
              class="sales-chart-bar"
              style="height: ${height}%"
              title="${report.date}: ${canViewProfit ? formatCurrency(report.totalProfit) : "-"}"
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
    </div>
  `;
}

function normalizeSale(sale) {
  const qty = Number(sale.qty ?? 0);
  const unitSold = Number(sale.unitSold ?? qty);
  const unitContent = Number(sale.unitContent ?? 1);
  const profit = Number(sale.profit ?? 0);
  const profitPerUnit = Number(sale.profitPerUnit ?? (qty > 0 ? profit / qty : 0));

  return {
    ...sale,
    unitSold,
    unitContent,
    qty,
    profitPerUnit,
    profit
  };
}

export function render() {
  const sales = list("sales").map(normalizeSale);
  const products = list("products");
  const reports = dailyReport(sales);
  const canInputSales = can("manage_sales") || can("input_sales");

  return `
    <section class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold">Penjualan</h2>
          <p class="text-sm text-slate-500">Gunakan tombol untuk berganti antara laporan harian dan input penjualan.</p>
        </div>
        <div class="flex rounded-lg border border-green-100 bg-white p-1 shadow-sm">
          <button class="sales-tab rounded-md px-4 py-2 text-sm font-semibold" data-target="sales-report">Laporan Harian</button>
          <button class="sales-tab rounded-md px-4 py-2 text-sm font-semibold" data-target="sales-input">Input Penjualan</button>
        </div>
      </div>

      <div id="sales-report" class="sales-panel space-y-5">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="module-card p-4">
            <p class="text-sm text-slate-500">Total Hari</p>
            <p class="mt-2 text-2xl font-bold">${reports.length}</p>
          </div>
          <div class="module-card p-4">
            <p class="text-sm text-slate-500">Total Transaksi</p>
            <p class="mt-2 text-2xl font-bold">${reports.reduce((sum, row) => sum + row.transactionCount, 0)}</p>
          </div>
          <div class="module-card p-4">
            <p class="text-sm text-slate-500">Barang Terjual</p>
            <p class="mt-2 text-2xl font-bold">${reports.reduce((sum, row) => sum + row.totalQty, 0)}</p>
          </div>
          <div class="module-card p-4">
            <p class="text-sm text-slate-500">Total Keuntungan</p>
            <p class="mt-2 text-2xl font-bold">${can("view_profit") ? formatCurrency(reports.reduce((sum, row) => sum + row.totalProfit, 0)) : "-"}</p>
          </div>
        </div>

        <div class="sales-report-grid">
          ${salesCalendar(reports)}
          ${salesChart(reports)}
        </div>
      </div>

      <div id="sales-input" class="sales-panel hidden">
        ${canInputSales ? inputTable(sales, products) : `<div class="rounded-md bg-orange-50 p-4 text-sm text-orange-700">Role ini tidak memiliki izin input penjualan.</div>`}
      </div>
    </section>
  `;
}

function inputTable(sales, products) {
  return `
    <div class="module-card p-4">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-bold">Daftar Inputan Penjualan</h3>
          <p class="text-sm text-slate-500">Tambah baris baru atau perbaiki data yang sudah ada.</p>
        </div>
        <button id="add-sale-row" class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold">Tambah Baris</button>
      </div>
      <div id="sale-editor" class="hidden">
        ${salesForm(products)}
      </div>
      <div class="mt-4">
        ${table([
          { key: "date", label: "Tanggal" },
          { key: "product", label: "Nama Barang" },
          { key: "unitSold", label: "Unit Terjual" },
          { key: "unitContent", label: "Isi/Unit" },
          { key: "qty", label: "Banyak Terjual" },
          { key: "profitPerUnit", label: "Profit/Unit", render: (row) => can("view_profit") ? formatCurrency(row.profitPerUnit) : "-" },
          { key: "profit", label: "Keuntungan", render: (row) => can("view_profit") ? formatCurrency(row.profit) : "-" },
          { key: "actions", label: "Aksi", render: (row) => `
            <div class="flex flex-wrap gap-2">
              <button class="edit-sale rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700" data-id="${row.id}">Edit</button>
              <button class="delete-sale rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700" data-id="${row.id}">Hapus</button>
            </div>
          ` }
        ], sales)}
      </div>
    </div>
  `;
}

function salesForm(products) {
  return `
    <form id="sales-form" class="soft-panel grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
      <input type="hidden" name="id" />
      <input type="hidden" name="product" />
      <label class="block">
        <span class="text-sm font-semibold">Tanggal</span>
        <input name="date" class="input-field mt-1" type="date" value="${today()}" required />
      </label>
      <label class="block">
        <span class="text-sm font-semibold">Nama Barang</span>
        <select name="productId" class="input-field mt-1" required>
          <option value="">Pilih barang</option>
          ${products.map((product) => `
            <option value="${product.id}">${product.name} - ${product.category ?? "Umum"}</option>
          `).join("")}
        </select>
      </label>
      <label class="block">
        <span class="text-sm font-semibold">Unit Terjual</span>
        <input name="unitSold" class="input-field mt-1" type="number" min="0" step="0.01" value="1" required />
      </label>
      <label class="block">
        <span class="text-sm font-semibold">Isi/Unit</span>
        <input name="unitContent" class="input-field mt-1 bg-slate-100" type="number" min="1" step="0.01" value="1" readonly />
      </label>
      <label class="block">
        <span class="text-sm font-semibold">Profit/Unit</span>
        <input name="profitPerUnit" class="input-field mt-1 bg-slate-100" type="number" min="0" step="1" value="0" readonly />
      </label>
      <label class="block">
        <span class="text-sm font-semibold">Banyak Terjual</span>
        <input name="qty" class="input-field mt-1 bg-slate-100" type="number" min="0" step="0.01" value="1" readonly />
      </label>
      <label class="block">
        <span class="text-sm font-semibold">Keuntungan</span>
        <input name="profit" class="input-field mt-1 bg-slate-100" type="number" min="0" step="1" value="0" readonly />
      </label>
      <div class="flex items-end gap-2 md:col-span-2 xl:col-span-4">
        <button id="cancel-sale-edit" type="button" class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Batal</button>
        <button id="save-sale-button" class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold">Simpan Baris</button>
      </div>
    </form>
  `;
}

export function afterRender() {
  const sales = list("sales").map(normalizeSale);
  const products = list("products");
  const editor = document.querySelector("#sale-editor");
  const form = document.querySelector("#sales-form");
  const saveButton = document.querySelector("#save-sale-button");

  const showPanel = (targetId) => {
    document.querySelectorAll(".sales-panel").forEach((panel) => {
      panel.classList.toggle("hidden", panel.id !== targetId);
    });
    document.querySelectorAll(".sales-tab").forEach((button) => {
      button.classList.toggle("btn-gradient", button.dataset.target === targetId);
      button.classList.toggle("text-slate-600", button.dataset.target !== targetId);
    });
  };

  document.querySelectorAll(".sales-tab").forEach((button) => {
    button.addEventListener("click", () => showPanel(button.dataset.target));
  });
  showPanel("sales-report");

  const result = document.querySelector("#calendar-result");
  document.querySelectorAll(".calendar-day").forEach((button) => {
    button.addEventListener("click", () => {
      const profit = Number(button.dataset.profit ?? 0);
      const transactions = Number(button.dataset.transactions ?? 0);
      if (!result) return;

      result.innerHTML = `
        <p class="text-sm font-semibold text-slate-500">Keuntungan ${button.dataset.date}</p>
        <p class="mt-1 text-2xl font-bold text-green-700">${can("view_profit") ? formatCurrency(profit) : "-"}</p>
        <p class="mt-1 text-sm text-slate-500">${transactions} transaksi tercatat pada tanggal ini.</p>
      `;
    });
  });

  document.querySelector("#month-profit-button")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const profit = Number(button.dataset.profit ?? 0);
    if (!result) return;

    result.innerHTML = `
      <p class="text-sm font-semibold text-slate-500">Akumulasi ${button.dataset.label}</p>
      <p class="mt-1 text-2xl font-bold text-green-700">${can("view_profit") ? formatCurrency(profit) : "-"}</p>
      <p class="mt-1 text-sm text-slate-500">Total keuntungan selama 1 bulan berjalan.</p>
    `;
  });

  document.querySelectorAll(".sales-chart-bar").forEach((button) => {
    button.addEventListener("click", () => {
      const profit = Number(button.dataset.profit ?? 0);
      if (!result) return;

      result.innerHTML = `
        <p class="text-sm font-semibold text-slate-500">Grafik ${button.dataset.date}</p>
        <p class="mt-1 text-2xl font-bold text-green-700">${can("view_profit") ? formatCurrency(profit) : "-"}</p>
        <p class="mt-1 text-sm text-slate-500">Nominal keuntungan dari bar grafik yang dipilih.</p>
      `;
    });
  });

  const resetForm = () => {
    form?.reset();
    if (form?.elements.id) form.elements.id.value = "";
    if (form?.elements.date) form.elements.date.value = today();
    if (saveButton) saveButton.textContent = "Simpan Baris";
    updateSaleCalculation();
  };

  const updateSaleCalculation = () => {
    if (!form) return;
    const unitSold = Number(form.elements.unitSold?.value ?? 0);
    const unitContent = Math.max(Number(form.elements.unitContent?.value ?? 1), 1);
    const profitPerUnit = Number(form.elements.profitPerUnit?.value ?? 0);
    const qty = unitSold * unitContent;
    const profit = qty * profitPerUnit;

    form.elements.qty.value = Number.isInteger(qty) ? qty : qty.toFixed(2);
    form.elements.profit.value = Math.round(profit);
  };

  const applySelectedProduct = () => {
    if (!form) return;
    const product = products.find((item) => item.id === Number(form.elements.productId?.value));
    if (!product) {
      form.elements.product.value = "";
      form.elements.unitContent.value = 1;
      form.elements.profitPerUnit.value = 0;
      updateSaleCalculation();
      return;
    }

    form.elements.product.value = product.name;
    form.elements.unitContent.value = Number(product.unitContent ?? 1);
    form.elements.profitPerUnit.value = Math.max(Number(product.salePrice ?? 0) - Number(product.costPrice ?? 0), 0);
    updateSaleCalculation();
  };

  form?.elements.productId?.addEventListener("change", applySelectedProduct);
  form?.elements.unitSold?.addEventListener("input", updateSaleCalculation);

  document.querySelector("#add-sale-row")?.addEventListener("click", () => {
    resetForm();
    editor?.classList.remove("hidden");
  });

  document.querySelector("#cancel-sale-edit")?.addEventListener("click", () => {
    resetForm();
    editor?.classList.add("hidden");
  });

  document.querySelectorAll(".edit-sale").forEach((button) => {
    button.addEventListener("click", () => {
      const sale = sales.find((item) => item.id === Number(button.dataset.id));
      if (!sale || !form) return;

      form.elements.id.value = sale.id;
      form.elements.date.value = sale.date ?? today();
      form.elements.product.value = sale.product ?? "";
      const selectedProduct = products.find((product) => product.id === Number(sale.productId))
        ?? products.find((product) => product.name === sale.product);
      form.elements.productId.value = selectedProduct?.id ?? "";
      form.elements.unitSold.value = sale.unitSold ?? sale.qty ?? 0;
      if (selectedProduct) {
        applySelectedProduct();
      } else {
        form.elements.unitContent.value = sale.unitContent ?? 1;
        form.elements.profitPerUnit.value = sale.profitPerUnit ?? 0;
      }
      form.elements.qty.value = sale.qty ?? 0;
      form.elements.profit.value = sale.profit ?? 0;
      updateSaleCalculation();
      if (saveButton) saveButton.textContent = "Update Baris";
      editor?.classList.remove("hidden");
      editor?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll(".delete-sale").forEach((button) => {
    button.addEventListener("click", () => {
      const sale = sales.find((item) => item.id === Number(button.dataset.id));
      const confirmed = confirm(`Hapus input penjualan "${sale?.product ?? "ini"}"?`);
      if (!confirmed) return;

      remove("sales", button.dataset.id);
      location.reload();
    });
  });

  document.querySelector("#sales-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const currentForm = event.currentTarget;
    const formData = new FormData(currentForm);
    const unitSold = Number(formData.get("unitSold"));
    const unitContent = Math.max(Number(formData.get("unitContent")), 1);
    const profitPerUnit = Number(formData.get("profitPerUnit"));
    const qty = unitSold * unitContent;
    const profit = Math.round(qty * profitPerUnit);
    const sale = {
      date: formData.get("date"),
      product: formData.get("product").trim(),
      productId: Number(formData.get("productId")),
      unitSold,
      unitContent,
      profitPerUnit,
      qty,
      profit,
      total: 0
    };

    const id = formData.get("id");
    if (id) {
      update("sales", id, sale);
    } else {
      add("sales", sale);
    }

    location.reload();
  });
}
