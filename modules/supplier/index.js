import { list } from "../../assets/js/api.js";
import { can } from "../../assets/js/auth.js";
import { table } from "../../assets/components/table.js";

export function render() {
  if (!can("manage_suppliers")) {
    return `<div class="module-card p-6"><h2 class="text-xl font-bold">Akses dibatasi</h2><p class="mt-2 text-slate-500">Employee tidak dapat melihat data supplier.</p></div>`;
  }

  return `
    <section class="space-y-4">
      <h2 class="text-xl font-bold">Supplier</h2>
      ${table([
        { key: "name", label: "Nama" },
        { key: "phone", label: "Kontak" },
        { key: "notes", label: "Catatan" }
      ], list("suppliers"))}
    </section>
  `;
}
