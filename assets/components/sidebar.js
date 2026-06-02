const menu = [
  ["dashboard", "Dashboard"],
  ["barang", "Barang"],
  ["pencarian", "Pencarian Barang"],
  ["supplier", "Supplier"],
  ["pembelian", "Pembelian"],
  ["kalkulator-belanja", "Kalkulator Belanja"],
  ["statistik", "Statistik"],
  ["repacking", "Repacking"],
  ["penjualan", "Penjualan"],
  ["laporan", "Laporan"],
  ["scanner", "Scanner"],
  ["users", "Users"],
  ["settings", "Settings"]
];

const SIDEBAR_THEME_KEY = "retail_inventory_sidebar_theme";

export function applySidebarTheme() {
  document.body.dataset.sidebarTheme = localStorage.getItem(SIDEBAR_THEME_KEY) || "custom";
}

export function sidebar() {
  applySidebarTheme();

  return `
    <aside class="sidebar sidebar-shell min-h-screen border-r border-green-700/30 p-4 backdrop-blur-xl">
      <div class="sidebar-brand mb-6 rounded-lg p-4">
        <p class="text-sm font-semibold text-green-700">Retail Inventory</p>
        <h1 class="text-xl font-bold text-slate-950">Gudang & Profit</h1>
      </div>
      <nav class="space-y-1">
        ${menu.map(([route, label]) => `
          <a class="nav-link block rounded-md px-3 py-2 text-sm text-white/92 hover:bg-white/14" data-route="${route}" href="#/${route}">
            ${label}
          </a>
        `).join("")}
      </nav>
    </aside>
  `;
}

export function mobileNav() {
  return `
    <nav class="mobile-nav fixed inset-x-0 bottom-0 z-20 grid-cols-5 border-t border-green-100 bg-gradient-to-r from-green-700 via-green-600 to-orange-400 text-xs shadow-lg backdrop-blur">
      ${menu.slice(0, 5).map(([route, label]) => `
        <a class="nav-link px-2 py-3 text-center text-white" data-route="${route}" href="#/${route}">${label}</a>
      `).join("")}
    </nav>
  `;
}
