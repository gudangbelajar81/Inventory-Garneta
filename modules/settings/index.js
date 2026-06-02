import { API_BASE_URL } from "../../assets/js/api.js";

export function render() {
  return `
    <section class="space-y-4">
      <h2 class="text-xl font-bold">Settings</h2>
      <div class="module-card p-4">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="block">
            <span class="text-sm font-semibold">Nama Toko</span>
            <input class="input-field mt-1" value="Toko Grosir Sembako" />
          </label>
          <label class="block">
            <span class="text-sm font-semibold">Minimum Stock Default</span>
            <input type="number" class="input-field mt-1" value="10" />
          </label>
          <label class="block md:col-span-2">
            <span class="text-sm font-semibold">Base URL API</span>
            <input id="api-base-url" class="input-field mt-1" value="${API_BASE_URL}" />
          </label>
        </div>
        <div class="mt-4 flex justify-end">
          <button id="save-settings" class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold">Simpan Settings</button>
        </div>
      </div>
    </section>
  `;
}

export function afterRender() {
  document.querySelector("#save-settings")?.addEventListener("click", () => {
    const apiUrl = document.querySelector("#api-base-url")?.value?.trim();
    if (!apiUrl) return;

    localStorage.setItem("retail_inventory_api_base_url", apiUrl);
    alert("Settings tersimpan. Halaman akan dimuat ulang.");
    location.reload();
  });
}
