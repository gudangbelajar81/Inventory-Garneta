const menu = [
  ["dashboard", "Dashboard"],
  ["barang", "Barang"],
  ["pencarian", "Pencarian Barang"],
  ["supplier", "Supplier"],
  ["pembelian", "Pembelian"],
  ["repacking", "Repacking"],
  ["penjualan", "Penjualan"],
  ["laporan", "Laporan"],
  ["scanner", "Scanner"],
  ["users", "Users"],
  ["settings", "Settings"]
];

export function sidebar() {
  return `
    <aside class="sidebar min-h-screen border-r border-white/70 bg-white/80 p-4 backdrop-blur-xl">
      <div class="mb-6 rounded-lg bg-gradient-to-br from-green-100 via-white to-orange-100 p-4">
        <p class="text-sm font-semibold text-green-700">Retail Inventory</p>
        <h1 class="text-xl font-bold text-slate-950">Gudang & Profit</h1>
      </div>
      <nav class="space-y-1">
        ${menu.map(([route, label]) => `
          <a class="nav-link block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-green-50" data-route="${route}" href="#/${route}">
            ${label}
          </a>
        `).join("")}
      </nav>
    </aside>
  `;
}

export function mobileNav() {
  return `
    <nav class="mobile-nav fixed inset-x-0 bottom-0 z-20 grid-cols-5 border-t border-green-100 bg-white/95 text-xs shadow-lg backdrop-blur">
      ${menu.slice(0, 5).map(([route, label]) => `
        <a class="nav-link px-2 py-3 text-center text-slate-700" data-route="${route}" href="#/${route}">${label}</a>
      `).join("")}
    </nav>
  `;
}
