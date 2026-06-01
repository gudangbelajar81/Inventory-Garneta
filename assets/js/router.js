const routes = {
  dashboard: "../../modules/dashboard/index.js",
  barang: "../../modules/barang/index.js",
  pencarian: "../../modules/pencarian/index.js",
  supplier: "../../modules/supplier/index.js",
  pembelian: "../../modules/pembelian/index.js",
  repacking: "../../modules/repacking/index.js",
  penjualan: "../../modules/penjualan/index.js",
  laporan: "../../modules/laporan/index.js",
  scanner: "../../modules/scanner/index.js",
  users: "../../modules/users/index.js",
  settings: "../../modules/settings/index.js"
};

export function getCurrentRoute() {
  return location.hash.replace("#/", "") || "dashboard";
}

export async function renderRoute(target) {
  const route = getCurrentRoute();
  const modulePath = routes[route] ?? routes.dashboard;
  const page = await import(modulePath);
  target.innerHTML = page.render();

  if (typeof page.afterRender === "function") {
    page.afterRender();
  }

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === route);
  });
}

export function startRouter(target) {
  window.addEventListener("hashchange", () => renderRoute(target));
  return renderRoute(target);
}
