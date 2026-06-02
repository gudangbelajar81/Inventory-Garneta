const SESSION_KEY = "retail_inventory_session";
const SUPER_ADMINS_KEY = "retail_inventory_super_admins";
const SUPER_ADMIN_LOCK_KEY = "retail_inventory_super_admin_locked";

const superAdminSession = {
  id: 1,
  name: "Admin Gudang",
  email: "admin@example.com",
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

const employeeSession = {
  name: "Kasir Toko",
  email: "kasir@example.com",
  role: "Employee",
  permissions: [
    "view_products",
    "manage_products",
    "view_sale_price",
    "view_cost_price",
    "view_suppliers",
    "manage_suppliers",
    "manage_purchases",
    "scan_products",
    "input_sales",
    "view_stock"
  ]
};

const defaultSuperAdmins = [
  {
    id: 1,
    name: "Admin Gudang",
    role: "Super Admin",
    status: "Aktif",
    passwordHash: encodePassword("password123"),
    fingerprintEnabled: false,
    cameraEnabled: false
  }
];

function encodePassword(password) {
  return btoa(unescape(encodeURIComponent(password)));
}

function readSuperAdmins() {
  const saved = localStorage.getItem(SUPER_ADMINS_KEY);
  if (!saved) {
    localStorage.setItem(SUPER_ADMINS_KEY, JSON.stringify(defaultSuperAdmins));
    return structuredClone(defaultSuperAdmins);
  }

  return JSON.parse(saved);
}

function writeSuperAdmins(admins) {
  localStorage.setItem(SUPER_ADMINS_KEY, JSON.stringify(admins));
}

export function getSession() {
  const saved = localStorage.getItem(SESSION_KEY);
  if (!saved) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(employeeSession));
    return employeeSession;
  }

  return JSON.parse(saved);
}

export function getSuperAdminProfile() {
  return readSuperAdmins()[0] ?? defaultSuperAdmins[0];
}

export function listRegisteredSuperAdmins() {
  return readSuperAdmins();
}

export function saveRegisteredSuperAdmin(admin) {
  const admins = readSuperAdmins();
  const next = {
    id: admin.id ? Number(admin.id) : Date.now(),
    name: admin.name.trim(),
    role: "Super Admin",
    status: admin.status ?? "Aktif",
    passwordHash: admin.password ? encodePassword(admin.password) : admin.passwordHash,
    fingerprintEnabled: Boolean(admin.fingerprintEnabled),
    cameraEnabled: Boolean(admin.cameraEnabled)
  };

  if (!next.passwordHash) {
    throw new Error("Password Super Admin wajib diisi.");
  }

  const exists = admins.some((item) => item.id === next.id);
  writeSuperAdmins(exists ? admins.map((item) => item.id === next.id ? next : item) : [next, ...admins]);
  return next;
}

export function deleteRegisteredSuperAdmin(id) {
  const admins = readSuperAdmins();
  if (admins.length <= 1) {
    throw new Error("Minimal harus ada satu Super Admin aktif.");
  }

  writeSuperAdmins(admins.filter((admin) => String(admin.id) !== String(id)));
}

export function verifySuperAdminPassword(adminId, password) {
  const admin = readSuperAdmins().find((item) => item.id === Number(adminId));
  if (!admin || admin.passwordHash !== encodePassword(password)) {
    throw new Error("Password Super Admin salah.");
  }

  const nextSession = {
    ...superAdminSession,
    id: admin.id,
    name: admin.name
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
  localStorage.setItem(SUPER_ADMIN_LOCK_KEY, "true");
  return nextSession;
}

export function resetToEmployee() {
  localStorage.removeItem(SUPER_ADMIN_LOCK_KEY);
  localStorage.setItem(SESSION_KEY, JSON.stringify(employeeSession));
  return employeeSession;
}

export function isSuperAdminLocked() {
  return localStorage.getItem(SUPER_ADMIN_LOCK_KEY) === "true";
}

export function setSuperAdminLock(locked) {
  if (locked) {
    localStorage.setItem(SUPER_ADMIN_LOCK_KEY, "true");
  } else {
    localStorage.removeItem(SUPER_ADMIN_LOCK_KEY);
  }
}

export function switchRole(role) {
  if (role === "Employee" && isSuperAdminLocked()) {
    return getSession();
  }

  const nextSession = role === "Super Admin" ? superAdminSession : employeeSession;
  localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
  return nextSession;
}

export function can(permission) {
  const session = getSession();
  if (!session) return false;
  return session.permissions.includes("full_access") || session.permissions.includes(permission);
}
