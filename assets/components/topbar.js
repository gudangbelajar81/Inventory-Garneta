import {
  getSession,
  isSuperAdminLocked,
  listRegisteredSuperAdmins,
  resetToEmployee,
  saveRegisteredSuperAdmin,
  setSuperAdminLock,
  verifySuperAdminPassword
} from "../js/auth.js";
import { getTheme, saveTheme } from "../js/theme.js";

export function topbar() {
  const session = getSession();
  const superAdmins = listRegisteredSuperAdmins();
  const theme = getTheme();
  const superAdminLocked = session.role === "Super Admin" && isSuperAdminLocked();

  return `
    <header class="topbar-shell sticky top-0 z-10 border-b border-green-700/20 px-4 py-3 shadow-lg shadow-green-900/10 backdrop-blur-xl">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase text-green-50">Single Page Application</p>
          <h2 class="text-lg font-bold text-white">Retail Inventory & Profit Monitoring</h2>
        </div>
        <div class="flex items-center gap-3">
          <div class="rounded-md bg-white/16 px-3 py-2 text-right text-sm ring-1 ring-white/20">
            <p id="current-date" class="font-semibold text-white">-</p>
            <p id="current-time" class="text-xs font-bold text-orange-100">-</p>
          </div>
          <select id="role-switcher" class="rounded-md border border-white/30 bg-white px-3 py-2 text-sm text-slate-900" ${superAdminLocked ? "disabled" : ""}>
            <option ${session.role === "Super Admin" ? "selected" : ""}>Super Admin</option>
            <option ${session.role === "Employee" ? "selected" : ""}>Employee</option>
          </select>
          ${session.role === "Super Admin" ? `
            <button id="super-admin-lockout" class="rounded-md bg-white/16 px-3 py-2 text-sm font-bold text-white ring-1 ring-white/20" type="button">
              ${superAdminLocked ? "Lockout ON" : "Lockout OFF"}
            </button>
          ` : ""}
          <div class="text-right text-sm">
            <p class="font-semibold text-white">${session.name}</p>
            <p class="text-green-50">${session.role}</p>
          </div>
          <button id="theme-menu-button" class="grid h-10 w-10 place-items-center rounded-md bg-white/16 text-lg font-bold text-white ring-1 ring-white/20" type="button" aria-label="Pengaturan warna">⚙</button>
        </div>
      </div>
      <div id="theme-panel" class="theme-panel module-card hidden p-4 text-slate-900">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="font-bold">Racik Warna</h3>
          <button id="close-theme-panel" class="rounded-md px-2 py-1 text-sm font-bold text-slate-500" type="button">...</button>
        </div>
        <div class="grid gap-3">
          <label class="block">
            <span class="text-sm font-semibold">Sidebar & Topbar</span>
            <input id="theme-primary" class="mt-1 h-10 w-full rounded-md" type="color" value="${theme.primary}" />
          </label>
          <label class="block">
            <span class="text-sm font-semibold">Aksen Gradasi</span>
            <input id="theme-accent" class="mt-1 h-10 w-full rounded-md" type="color" value="${theme.accent}" />
          </label>
          <label class="block">
            <span class="text-sm font-semibold">Warna Halaman</span>
            <input id="theme-page" class="mt-1 h-10 w-full rounded-md" type="color" value="${theme.page}" />
          </label>
          <button id="save-theme" class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold" type="button">Simpan Warna</button>
        </div>
      </div>
      <div id="super-admin-password-modal" class="fixed inset-0 z-50 hidden place-items-center bg-slate-950/40 px-4">
        <form id="super-admin-password-form" class="module-card w-full max-w-sm p-5">
          <h3 class="text-lg font-bold">Password Super Admin</h3>
          <p class="mt-1 text-sm text-slate-500">Pilih nama Super Admin yang terdaftar, lalu masukkan password.</p>
          <label class="mt-4 block">
            <span class="text-sm font-semibold">Nama Super Admin</span>
            <select id="super-admin-id" class="input-field mt-1" required>
              ${superAdmins.map((admin) => `<option value="${admin.id}">${admin.name}</option>`).join("")}
            </select>
          </label>
          <label class="mt-4 block">
            <span class="text-sm font-semibold">Password</span>
            <div class="relative mt-1">
              <input id="super-admin-password" class="input-field pr-12" type="password" autocomplete="current-password" required />
              <button id="toggle-super-admin-password" type="button" class="absolute inset-y-0 right-2 grid w-9 place-items-center rounded-md text-xs font-bold text-slate-500 hover:bg-green-50 hover:text-green-700" aria-label="Lihat password">
                <span id="password-eye-open">LIHAT</span>
                <span id="password-eye-closed" class="hidden">TUTUP</span>
              </button>
            </div>
          </label>
          <p id="super-admin-password-error" class="mt-3 hidden rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"></p>
          <button id="show-super-admin-setup" type="button" class="mt-3 text-sm font-bold text-green-700">Buat / Reset Super Admin</button>
          <div id="super-admin-setup" class="mt-4 hidden rounded-md border border-green-100 bg-green-50 p-3">
            <label class="block">
              <span class="text-sm font-semibold">Nama Super Admin</span>
              <input id="setup-super-admin-name" class="input-field mt-1" value="${superAdmins[0]?.name ?? "Admin Gudang"}" />
            </label>
            <label class="mt-3 block">
              <span class="text-sm font-semibold">Password Baru</span>
              <input id="setup-super-admin-password" class="input-field mt-1" type="password" />
            </label>
            <button id="save-super-admin-setup" type="button" class="mt-3 w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white">Simpan dan Masuk</button>
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <button id="cancel-super-admin-password" type="button" class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Batal</button>
            <button class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold">Masuk</button>
          </div>
        </form>
      </div>
    </header>
  `;
}

export function bindTopbar() {
  const updateClock = () => {
    const now = new Date();
    const date = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(now);
    const time = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(now);

    const dateElement = document.querySelector("#current-date");
    const timeElement = document.querySelector("#current-time");
    if (dateElement) dateElement.textContent = date;
    if (timeElement) timeElement.textContent = time;
  };

  updateClock();
  setInterval(updateClock, 1000);

  const roleSwitcher = document.querySelector("#role-switcher");
  const passwordModal = document.querySelector("#super-admin-password-modal");
  const passwordForm = document.querySelector("#super-admin-password-form");
  const superAdminSelect = document.querySelector("#super-admin-id");
  const passwordInput = document.querySelector("#super-admin-password");
  const passwordError = document.querySelector("#super-admin-password-error");
  const currentRole = getSession().role;
  const themePanel = document.querySelector("#theme-panel");
  const saveCurrentTheme = () => {
    saveTheme({
      primary: document.querySelector("#theme-primary")?.value,
      accent: document.querySelector("#theme-accent")?.value,
      page: document.querySelector("#theme-page")?.value
    });
  };

  document.querySelector("#theme-menu-button")?.addEventListener("click", () => {
    themePanel?.classList.toggle("hidden");
  });

  document.querySelector("#close-theme-panel")?.addEventListener("click", () => {
    themePanel?.classList.add("hidden");
  });

  ["#theme-primary", "#theme-accent", "#theme-page"].forEach((selector) => {
    document.querySelector(selector)?.addEventListener("input", saveCurrentTheme);
  });

  document.querySelector("#save-theme")?.addEventListener("click", () => {
    saveCurrentTheme();
    themePanel?.classList.add("hidden");
  });

  const closePasswordModal = () => {
    passwordModal?.classList.add("hidden");
    passwordModal?.classList.remove("grid");
    if (passwordInput) passwordInput.value = "";
    passwordError?.classList.add("hidden");
    if (roleSwitcher) roleSwitcher.value = getSession().role;
  };

  roleSwitcher?.addEventListener("change", (event) => {
    if (event.target.value === "Super Admin" && currentRole !== "Super Admin") {
      passwordModal?.classList.remove("hidden");
      passwordModal?.classList.add("grid");
      passwordInput?.focus();
      return;
    }

    if (event.target.value === "Employee") {
      resetToEmployee();
      location.reload();
    }
  });

  document.querySelector("#super-admin-lockout")?.addEventListener("click", () => {
    setSuperAdminLock(false);
    location.reload();
  });

  passwordForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      verifySuperAdminPassword(superAdminSelect?.value, passwordInput?.value ?? "");
      location.reload();
    } catch (error) {
      if (passwordError) {
        passwordError.textContent = error.message;
        passwordError.classList.remove("hidden");
      }
    }
  });

  document.querySelector("#cancel-super-admin-password")?.addEventListener("click", closePasswordModal);

  document.querySelector("#toggle-super-admin-password")?.addEventListener("click", () => {
    if (!passwordInput) return;
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    document.querySelector("#password-eye-open")?.classList.toggle("hidden", isHidden);
    document.querySelector("#password-eye-closed")?.classList.toggle("hidden", !isHidden);
  });

  document.querySelector("#show-super-admin-setup")?.addEventListener("click", () => {
    document.querySelector("#super-admin-setup")?.classList.toggle("hidden");
  });

  document.querySelector("#save-super-admin-setup")?.addEventListener("click", () => {
    const name = document.querySelector("#setup-super-admin-name")?.value?.trim();
    const password = document.querySelector("#setup-super-admin-password")?.value;

    if (!name || !password) {
      alert("Nama dan password baru wajib diisi.");
      return;
    }

    const selectedId = superAdminSelect?.value || Date.now();
    saveRegisteredSuperAdmin({
      id: selectedId,
      name,
      password,
      status: "Aktif"
    });
    verifySuperAdminPassword(selectedId, password);
    location.reload();
  });
}
