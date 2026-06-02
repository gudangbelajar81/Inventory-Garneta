import { add, formatCurrency, list, remove, update } from "../../assets/js/api.js";
import { can } from "../../assets/js/auth.js";
import { recordPriceHistory } from "../../assets/js/priceHistory.js";
import { table } from "../../assets/components/table.js";

const unitOptions = ["sak", "karton/dus", "jligen", "kg", "liter", "pcs"];

export async function render() {
  const products = await list("products");

  return `
    <section class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold">Barang</h2>
          <p class="text-sm text-slate-500">Input manual kategori, unit kemasan, isi per unit, harga, dan stok.</p>
        </div>
        ${can("manage_products") ? `<button id="toggle-product-form" class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold">Tambah Barang</button>` : ""}
      </div>
      ${can("manage_products") ? productForm() : ""}
      ${table([
        { key: "category", label: "Kategori" },
        { key: "name", label: "Nama" },
        { key: "unit", label: "Unit" },
        { key: "unitContent", label: "Isi/Unit", render: (row) => row.unitContent ?? 1 },
        { key: "basePrice", label: "Harga Dasar", render: (row) => can("view_cost_price") ? formatCurrency(row.basePrice ?? 0) : "-" },
        { key: "stock", label: "Stok" },
        { key: "costPrice", label: "HPP", render: (row) => can("view_cost_price") ? formatCurrency(row.costPrice) : "-" },
        { key: "salePrice", label: "Harga Jual", render: (row) => formatCurrency(row.salePrice) },
        { key: "profit", label: "Profit/Unit", render: (row) => can("view_profit") ? formatCurrency(row.salePrice - row.costPrice) : "-" },
        { key: "actions", label: "Aksi", render: (row) => can("manage_products") ? `
          <div class="flex flex-wrap gap-2">
            <button class="edit-product rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700" data-id="${row.id}">Edit</button>
            <button class="delete-product rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700" data-id="${row.id}">Hapus</button>
          </div>
        ` : "-" }
      ], products)}
    </section>
  `;
}

function productForm() {
  return `
    <form id="product-form" class="soft-panel hidden p-4">
      <input type="hidden" name="id" />
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="product-form-title" class="font-bold">Tambah Barang</h3>
          <p class="text-sm text-slate-500">HPP otomatis dari harga dasar dibagi isi/unit.</p>
        </div>
      </div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label class="block">
          <span class="text-sm font-semibold">Kategori Barang</span>
          <input name="category" class="input-field mt-1" placeholder="Contoh: Beras" required />
        </label>
        <label class="block">
          <span class="text-sm font-semibold">Nama Barang</span>
          <input name="name" class="input-field mt-1" placeholder="Contoh: Beras Premium" required />
        </label>
        <label class="block">
          <span class="text-sm font-semibold">Unit</span>
          <select name="unit" class="input-field mt-1" required>
            ${unitOptions.map((unit) => `<option value="${unit}">${unit}</option>`).join("")}
          </select>
        </label>
        <label class="block">
          <span class="text-sm font-semibold">Harga Dasar</span>
          <input name="basePrice" class="input-field mt-1" type="number" min="0" step="1" value="0" required />
        </label>
        <label class="block">
          <span class="text-sm font-semibold">Unit Isi</span>
          <input name="unitContent" class="input-field mt-1" type="number" min="1" step="1" value="1" required />
        </label>
        <label class="block">
          <span class="text-sm font-semibold">Stok</span>
          <input name="stock" class="input-field mt-1" type="number" min="0" step="0.01" value="0" required />
        </label>
        <label class="block">
          <span class="text-sm font-semibold">Stok Minimum</span>
          <input name="minStock" class="input-field mt-1" type="number" min="0" step="0.01" value="10" required />
        </label>
        <label class="block">
          <span class="text-sm font-semibold">HPP Otomatis</span>
          <input name="costPrice" class="input-field mt-1 bg-slate-100" type="number" min="0" step="1" value="0" readonly />
        </label>
        <label class="block">
          <span class="text-sm font-semibold">Harga Jual</span>
          <input name="salePrice" class="input-field mt-1" type="number" min="0" step="1" value="0" required />
        </label>
      </div>
      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" id="cancel-product-form" class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Batal</button>
        <button id="save-product-button" class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold">Simpan Barang</button>
      </div>
    </form>
  `;
}

export async function afterRender() {
  const products = await list("products");
  const form = document.querySelector("#product-form");
  const title = document.querySelector("#product-form-title");
  const saveButton = document.querySelector("#save-product-button");

  const resetForm = () => {
    form?.reset();
    if (form?.elements.id) form.elements.id.value = "";
    if (title) title.textContent = "Tambah Barang";
    if (saveButton) saveButton.textContent = "Simpan Barang";
    updateCostPrice();
  };

  document.querySelector("#toggle-product-form")?.addEventListener("click", () => {
    resetForm();
    form?.classList.remove("hidden");
  });

  document.querySelector("#cancel-product-form")?.addEventListener("click", () => {
    resetForm();
    form?.classList.add("hidden");
  });

  const basePriceInput = form?.elements.basePrice;
  const unitContentInput = form?.elements.unitContent;
  const costPriceInput = form?.elements.costPrice;
  const updateCostPrice = () => {
    const basePrice = Number(basePriceInput?.value ?? 0);
    const unitContent = Math.max(Number(unitContentInput?.value ?? 1), 1);
    if (costPriceInput) costPriceInput.value = Math.round(basePrice / unitContent);
  };

  basePriceInput?.addEventListener("input", updateCostPrice);
  unitContentInput?.addEventListener("input", updateCostPrice);

  document.querySelectorAll(".edit-product").forEach((button) => {
    button.addEventListener("click", () => {
      const product = products.find((item) => item.id === Number(button.dataset.id));
      if (!product || !form) return;

      form.elements.id.value = product.id;
      form.elements.category.value = product.category ?? "";
      form.elements.name.value = product.name ?? "";
      form.elements.unit.value = product.unit ?? "sak";
      form.elements.basePrice.value = product.basePrice ?? 0;
      form.elements.unitContent.value = product.unitContent ?? 1;
      form.elements.stock.value = product.stock ?? 0;
      form.elements.minStock.value = product.minStock ?? 0;
      form.elements.salePrice.value = product.salePrice ?? 0;
      updateCostPrice();

      if (title) title.textContent = "Edit Barang";
      if (saveButton) saveButton.textContent = "Update Barang";
      form.classList.remove("hidden");
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll(".delete-product").forEach((button) => {
    button.addEventListener("click", async () => {
      const product = products.find((item) => item.id === Number(button.dataset.id));
      const confirmed = confirm(`Hapus barang "${product?.name ?? "ini"}"?`);
      if (!confirmed) return;

      await remove("products", button.dataset.id);
      location.reload();
    });
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const basePrice = Number(formData.get("basePrice"));
    const unitContent = Math.max(Number(formData.get("unitContent")), 1);
    const product = {
      category: formData.get("category").trim(),
      name: formData.get("name").trim(),
      unit: formData.get("unit"),
      unitContent,
      basePrice,
      stock: Number(formData.get("stock")),
      minStock: Number(formData.get("minStock")),
      costPrice: Math.round(basePrice / unitContent),
      salePrice: Number(formData.get("salePrice"))
    };

    const id = formData.get("id");
    if (id) {
      await update("products", id, product);
      recordPriceHistory({ ...product, id }, "barang");
    } else {
      const savedProduct = await add("products", product);
      recordPriceHistory(savedProduct, "barang");
    }

    location.reload();
  });
}
