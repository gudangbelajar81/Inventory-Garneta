import { formatCurrency, list } from "../../assets/js/api.js";
import { table } from "../../assets/components/table.js";

const STORE_KEY = "retail_inventory_shopping_calculator";

function readRows() {
  return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
}

function writeRows(rows) {
  localStorage.setItem(STORE_KEY, JSON.stringify(rows));
}

function calculateSubtotal(row) {
  return Number(row.qty ?? 0) * Number(row.amount ?? 0);
}

function findProduct(products, name) {
  const query = name.trim().toLowerCase();
  return products.find((product) => product.name.toLowerCase() === query)
    ?? products.find((product) => product.name.toLowerCase().includes(query) || query.includes(product.name.toLowerCase()));
}

function resolveAmount(products, name) {
  const product = findProduct(products, name);
  return Number(product?.basePrice ?? 0);
}

function parseWhatsAppText(text, products) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const normalized = line.replace(/[,@*=|]/g, " ");
      const numbers = normalized.match(/\d+(?:[.,]\d+)?/g) ?? [];
      if (numbers.length < 1) return null;

      const qty = Number(numbers[numbers.length - 1].replace(",", "."));
      const firstNumberIndex = normalized.search(/\d/);
      const name = normalized.slice(0, firstNumberIndex).replace(/[-:]/g, "").trim();
      const amount = resolveAmount(products, name);

      if (!name || Number.isNaN(qty) || Number.isNaN(amount)) return null;
      return { id: Date.now() + Math.random(), name, qty, amount };
    })
    .filter(Boolean);
}

export async function render() {
  const rows = readRows();
  const products = await list("products");
  const total = rows.reduce((sum, row) => sum + calculateSubtotal(row), 0);

  return `
    <section class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold">Kalkulator Belanja</h2>
          <p class="text-sm text-slate-500">Jumlah otomatis dari Harga Dasar menu Barang. Subtotal = Harga Dasar x Banyak Belanja.</p>
        </div>
        <button id="add-shopping-row" class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold">Tambah Baris</button>
      </div>

      <div class="module-card p-4">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <label class="block">
            <span class="text-sm font-semibold">Input cepat dari WhatsApp</span>
            <textarea id="wa-shopping-text" class="input-field mt-1 min-h-28" placeholder="Contoh:
Payung 5
Beras Premium 2
Gula Pasir 1"></textarea>
          </label>
          <div class="flex flex-col justify-end gap-2">
            <button id="parse-wa-shopping" class="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white">Proses Paste WA</button>
            <button id="clear-shopping" class="rounded-md border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">Kosongkan Semua</button>
            <div class="rounded-md bg-gradient-to-br from-green-100 to-orange-100 p-3">
              <p class="text-sm font-semibold text-slate-600">Total Belanja</p>
              <p class="mt-1 text-2xl font-bold text-green-800">${formatCurrency(total)}</p>
            </div>
          </div>
        </div>
      </div>

      <div id="shopping-editor" class="hidden">
        ${shoppingForm(products)}
      </div>

      ${table([
        { key: "name", label: "Nama Barang" },
        { key: "qty", label: "Banyak Belanja" },
        { key: "amount", label: "Jumlah", render: (row) => formatCurrency(row.amount) },
        { key: "subtotal", label: "Subtotal Belanja", render: (row) => formatCurrency(calculateSubtotal(row)) },
        { key: "actions", label: "Aksi", render: (row) => `
          <div class="flex flex-wrap gap-2">
            <button class="edit-shopping rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700" data-id="${row.id}">Edit</button>
            <button class="delete-shopping rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700" data-id="${row.id}">Hapus</button>
          </div>
        ` }
      ], rows)}
    </section>
  `;
}

function shoppingForm(products) {
  return `
    <form id="shopping-form" class="soft-panel p-4">
      <input type="hidden" name="id" />
      <div class="grid gap-4 md:grid-cols-4">
        <label class="block md:col-span-2">
          <span class="text-sm font-semibold">Nama Barang</span>
          <input name="name" class="input-field mt-1" list="shopping-products" required />
          <datalist id="shopping-products">
            ${products.map((product) => `<option value="${product.name}"></option>`).join("")}
          </datalist>
        </label>
        <label class="block">
          <span class="text-sm font-semibold">Banyak Belanja</span>
          <input name="qty" class="input-field mt-1" type="number" min="0" step="0.01" value="1" required />
        </label>
        <label class="block">
          <span class="text-sm font-semibold">Jumlah</span>
          <input name="amount" class="input-field mt-1 bg-slate-100" type="number" min="0" step="1" value="0" readonly required />
        </label>
      </div>
      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <button id="cancel-shopping-form" type="button" class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Batal</button>
        <button id="save-shopping-button" class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold">Simpan</button>
      </div>
    </form>
  `;
}

export async function afterRender() {
  const rows = readRows();
  const products = await list("products");
  const editor = document.querySelector("#shopping-editor");
  const form = document.querySelector("#shopping-form");
  const saveButton = document.querySelector("#save-shopping-button");

  const resetForm = () => {
    form?.reset();
    if (form?.elements.id) form.elements.id.value = "";
    if (saveButton) saveButton.textContent = "Simpan";
  };

  const syncAmountFromProduct = () => {
    if (!form) return;
    form.elements.amount.value = resolveAmount(products, form.elements.name.value);
  };

  form?.elements.name?.addEventListener("input", syncAmountFromProduct);

  document.querySelector("#add-shopping-row")?.addEventListener("click", () => {
    resetForm();
    editor?.classList.remove("hidden");
  });

  document.querySelector("#cancel-shopping-form")?.addEventListener("click", () => {
    resetForm();
    editor?.classList.add("hidden");
  });

  document.querySelector("#parse-wa-shopping")?.addEventListener("click", () => {
    const text = document.querySelector("#wa-shopping-text")?.value ?? "";
    const parsedRows = parseWhatsAppText(text, products);
    if (parsedRows.length === 0) {
      alert("Format belum terbaca. Gunakan contoh: Payung 5. Pastikan nama barang ada di menu Barang.");
      return;
    }

    writeRows([...parsedRows, ...readRows()]);
    location.reload();
  });

  document.querySelector("#clear-shopping")?.addEventListener("click", () => {
    if (!confirm("Kosongkan semua baris kalkulator belanja?")) return;
    writeRows([]);
    location.reload();
  });

  document.querySelectorAll(".edit-shopping").forEach((button) => {
    button.addEventListener("click", () => {
      const row = rows.find((item) => String(item.id) === String(button.dataset.id));
      if (!row || !form) return;

      form.elements.id.value = row.id;
      form.elements.name.value = row.name;
      form.elements.qty.value = row.qty;
      form.elements.amount.value = row.amount;
      if (saveButton) saveButton.textContent = "Update";
      editor?.classList.remove("hidden");
      editor?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll(".delete-shopping").forEach((button) => {
    button.addEventListener("click", () => {
      const nextRows = readRows().filter((row) => String(row.id) !== String(button.dataset.id));
      writeRows(nextRows);
      location.reload();
    });
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const id = formData.get("id") || Date.now();
    const row = {
      id,
      name: formData.get("name").trim(),
      qty: Number(formData.get("qty")),
      amount: resolveAmount(products, formData.get("name").trim())
    };
    const exists = rows.some((item) => String(item.id) === String(id));
    writeRows(exists ? rows.map((item) => String(item.id) === String(id) ? row : item) : [row, ...rows]);
    location.reload();
  });
}
