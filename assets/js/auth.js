const SESSION_KEY = "retail_inventory_session";

const defaultSession = {
  name: "Admin Gudang",
  role: "Super Admin",
  permissions: [
    "full_access",
    "manage_products",
    "manage_suppliers",
    "manage_purchases",
    "manage_sales",
    "view_profit",
    "view_cost_price",
    "manage_users",
    "view_reports"
  ]
};

export function getSession() {
  const saved = localStorage.getItem(SESSION_KEY);
  if (!saved) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(defaultSession));
    return defaultSession;
  }

  return JSON.parse(saved);
}

export function switchRole(role) {
  const employeeSession = {
    name: "Kasir Toko",
    role: "Employee",
    permissions: ["view_products", "view_sale_price", "scan_products", "input_sales", "view_stock"]
  };

  const nextSession = role === "Employee" ? employeeSession : defaultSession;
  localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
  return nextSession;
}

export function can(permission) {
  const session = getSession();
  return session.permissions.includes("full_access") || session.permissions.includes(permission);
}
