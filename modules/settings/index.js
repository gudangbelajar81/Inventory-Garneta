export function render() {
  return `
    <section class="space-y-4">
      <h2 class="text-xl font-bold">Settings</h2>
      <div class="module-card p-4">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="block">
            <span class="text-sm font-semibold">Nama Toko</span>
            <input class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value="Toko Grosir Sembako" />
          </label>
          <label class="block">
            <span class="text-sm font-semibold">Minimum Stock Default</span>
            <input type="number" class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value="10" />
          </label>
        </div>
      </div>
    </section>
  `;
}
