import { add, list, remove, update } from "../../assets/js/api.js";
import { can } from "../../assets/js/auth.js";
import { table } from "../../assets/components/table.js";

export async function render() {
  if (!can("manage_suppliers") && !can("view_suppliers")) {
    return `<div class="module-card p-6"><h2 class="text-xl font-bold">Akses dibatasi</h2><p class="mt-2 text-slate-500">Role ini tidak dapat melihat data supplier.</p></div>`;
  }

  const suppliers = await list("suppliers");
  const canManage = can("manage_suppliers");

  return `
    <section class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold">Supplier</h2>
          <p class="text-sm text-slate-500">Admin dapat menambah, melihat, mengedit, dan menghapus data supplier.</p>
        </div>
        ${canManage ? `<button id="add-supplier-row" class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold">Tambah Supplier</button>` : ""}
      </div>

      ${canManage ? supplierForm() : ""}

      ${table([
        { key: "name", label: "Nama" },
        { key: "phone", label: "Kontak" },
        { key: "address", label: "Alamat", render: (row) => row.address ?? "-" },
        { key: "notes", label: "Catatan" },
        { key: "actions", label: "Aksi", render: (row) => canManage ? `
          <div class="flex flex-wrap gap-2">
            <button class="edit-supplier rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700" data-id="${row.id}">Edit</button>
            <button class="delete-supplier rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700" data-id="${row.id}">Hapus</button>
          </div>
        ` : "-" }
      ], suppliers)}
    </section>
  `;
}

function supplierForm() {
  return `
    <form id="supplier-form" class="soft-panel hidden p-4">
      <input type="hidden" name="id" />
      <div class="mb-4">
        <h3 id="supplier-form-title" class="font-bold">Tambah Supplier</h3>
        <p class="text-sm text-slate-500">Isi data supplier lalu simpan.</p>
      </div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label class="block">
          <span class="text-sm font-semibold">Nama Supplier</span>
          <input name="name" class="input-field mt-1" required />
        </label>
        <label class="block">
          <span class="text-sm font-semibold">Kontak</span>
          <input name="phone" class="input-field mt-1" />
        </label>
        <label class="block md:col-span-2">
          <span class="text-sm font-semibold">Alamat</span>
          <input name="address" class="input-field mt-1" />
        </label>
        <label class="block md:col-span-2 xl:col-span-4">
          <span class="text-sm font-semibold">Catatan</span>
          <input name="notes" class="input-field mt-1" />
        </label>
      </div>
      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <button id="cancel-supplier-form" type="button" class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Batal</button>
        <button id="save-supplier-button" class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold">Simpan</button>
      </div>
    </form>
  `;
}

export async function afterRender() {
  const suppliers = await list("suppliers");
  const form = document.querySelector("#supplier-form");
  const title = document.querySelector("#supplier-form-title");
  const saveButton = document.querySelector("#save-supplier-button");

  const resetForm = () => {
    form?.reset();
    if (form?.elements.id) form.elements.id.value = "";
    if (title) title.textContent = "Tambah Supplier";
    if (saveButton) saveButton.textContent = "Simpan";
  };

  document.querySelector("#add-supplier-row")?.addEventListener("click", () => {
    resetForm();
    form?.classList.remove("hidden");
  });

  document.querySelector("#cancel-supplier-form")?.addEventListener("click", () => {
    resetForm();
    form?.classList.add("hidden");
  });

  document.querySelectorAll(".edit-supplier").forEach((button) => {
    button.addEventListener("click", () => {
      const supplier = suppliers.find((item) => item.id === Number(button.dataset.id));
      if (!supplier || !form) return;

      form.elements.id.value = supplier.id;
      form.elements.name.value = supplier.name ?? "";
      form.elements.phone.value = supplier.phone ?? "";
      form.elements.address.value = supplier.address ?? "";
      form.elements.notes.value = supplier.notes ?? "";
      if (title) title.textContent = "Edit Supplier";
      if (saveButton) saveButton.textContent = "Update";
      form.classList.remove("hidden");
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll(".delete-supplier").forEach((button) => {
    button.addEventListener("click", async () => {
      const supplier = suppliers.find((item) => item.id === Number(button.dataset.id));
      const confirmed = confirm(`Hapus supplier "${supplier?.name ?? "ini"}"?`);
      if (!confirmed) return;

      await remove("suppliers", button.dataset.id);
      location.reload();
    });
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const supplier = {
      name: formData.get("name").trim(),
      phone: formData.get("phone").trim(),
      address: formData.get("address").trim(),
      notes: formData.get("notes").trim()
    };
    const id = formData.get("id");

    if (id) {
      await update("suppliers", id, supplier);
    } else {
      await add("suppliers", supplier);
    }

    location.reload();
  });
}
