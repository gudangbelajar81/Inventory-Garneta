import { formatCurrency, list } from "../../assets/js/api.js";
import { can } from "../../assets/js/auth.js";
import { table } from "../../assets/components/table.js";

function productColumns() {
  return [
    { key: "category", label: "Kategori" },
    { key: "name", label: "Nama Barang" },
    { key: "unit", label: "Unit" },
    { key: "unitContent", label: "Isi/Unit", render: (row) => row.unitContent ?? 1 },
    { key: "basePrice", label: "Harga Dasar", render: (row) => can("view_cost_price") ? formatCurrency(row.basePrice ?? 0) : "-" },
    { key: "costPrice", label: "HPP", render: (row) => can("view_cost_price") ? formatCurrency(row.costPrice ?? 0) : "-" },
    { key: "salePrice", label: "Harga Jual", render: (row) => formatCurrency(row.salePrice ?? 0) },
    { key: "stock", label: "Stok" }
  ];
}

function filterProducts(products, keyword) {
  const query = keyword.trim().toLowerCase();
  if (!query) return products;

  return products.filter((product) => {
    const searchable = [
      product.category,
      product.name,
      product.unit,
      product.unitContent,
      product.basePrice,
      product.costPrice,
      product.salePrice,
      product.stock
    ].join(" ").toLowerCase();

    return searchable.includes(query);
  });
}

export async function render() {
  const products = await list("products");

  return `
    <section class="space-y-5">
      <div>
        <h2 class="text-xl font-bold">Pencarian Barang</h2>
        <p class="text-sm text-slate-500">Cari berdasarkan nama, kategori, unit, stok, harga dasar, HPP, atau harga jual.</p>
      </div>
      <div class="soft-panel p-4">
        <label class="block">
          <span class="text-sm font-semibold">Kata Kunci</span>
          <input id="product-search" class="input-field mt-1" placeholder="Contoh: beras, sak, 14500" autofocus />
        </label>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span id="search-summary">Menampilkan ${products.length} barang.</span>
          <a class="font-semibold text-green-700" href="#/barang">Kelola Barang</a>
        </div>
      </div>
      <div id="search-results">
        ${table(productColumns(), products)}
      </div>
    </section>
  `;
}

export async function afterRender() {
  const products = await list("products");
  const input = document.querySelector("#product-search");
  const results = document.querySelector("#search-results");
  const summary = document.querySelector("#search-summary");

  input?.addEventListener("input", () => {
    const filtered = filterProducts(products, input.value);
    if (results) results.innerHTML = table(productColumns(), filtered);
    if (summary) summary.textContent = `Menampilkan ${filtered.length} dari ${products.length} barang.`;
  });
}
