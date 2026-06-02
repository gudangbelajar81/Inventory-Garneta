import { add, list, remove, update } from "../../assets/js/api.js";
import {
  can,
  deleteRegisteredSuperAdmin,
  listRegisteredSuperAdmins,
  saveRegisteredSuperAdmin
} from "../../assets/js/auth.js";
import { table } from "../../assets/components/table.js";

export async function render() {
  if (!can("manage_users")) {
    return `<div class="module-card p-6"><h2 class="text-xl font-bold">Akses dibatasi</h2><p class="mt-2 text-slate-500">Employee tidak dapat mengelola user.</p></div>`;
  }

  const apiUsers = await list("users");
  const superAdmins = listRegisteredSuperAdmins();
  const rows = mergeUsers(apiUsers, superAdmins);

  return `
    <section class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold">Users</h2>
          <p class="text-sm text-slate-500">Daftarkan Super Admin dengan nama dan password. Password tidak ditampilkan ke user lain.</p>
        </div>
        <button id="add-user-row" class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold">Tambah Super Admin</button>
      </div>

      <div id="user-editor" class="hidden">
        ${userForm()}
      </div>

      ${table([
        { key: "name", label: "Nama" },
        { key: "role", label: "Role" },
        { key: "password", label: "Password", render: () => "Tersembunyi" },
        { key: "fingerprintEnabled", label: "Sidik Jari", render: (row) => row.fingerprintEnabled ? "Aktif" : "Tidak" },
        { key: "cameraEnabled", label: "Camera", render: (row) => row.cameraEnabled ? "Aktif" : "Tidak" },
        { key: "status", label: "Status" },
        { key: "actions", label: "Aksi", render: (row) => row.role === "Super Admin" ? `
          <div class="flex flex-wrap gap-2">
            <button class="edit-user rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700" data-id="${row.id}">Edit</button>
            <button class="delete-user rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700" data-id="${row.id}">Hapus</button>
          </div>
        ` : "-" }
      ], rows)}
    </section>
  `;
}

function mergeUsers(apiUsers, superAdmins) {
  const employeeRows = apiUsers.filter((user) => user.role !== "Super Admin");
  return [
    ...superAdmins.map((admin) => ({
      id: admin.id,
      name: admin.name,
      role: "Super Admin",
      status: admin.status ?? "Aktif",
      fingerprintEnabled: admin.fingerprintEnabled,
      cameraEnabled: admin.cameraEnabled
    })),
    ...employeeRows
  ];
}

function userForm() {
  return `
    <form id="user-form" class="soft-panel p-4">
      <input type="hidden" name="id" />
      <input type="hidden" name="passwordHash" />
      <div class="mb-4">
        <h3 id="user-form-title" class="font-bold">Tambah Super Admin</h3>
        <p class="text-sm text-slate-500">Password hanya dipakai untuk verifikasi Super Admin dan tidak tampil di tabel.</p>
      </div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label class="block">
          <span class="text-sm font-semibold">Nama</span>
          <input name="name" class="input-field mt-1" placeholder="Contoh: Admin Gudang" required />
        </label>
        <label class="block">
          <span class="text-sm font-semibold">Password</span>
          <div class="relative mt-1">
            <input id="user-password" name="password" class="input-field pr-14" type="password" autocomplete="new-password" />
            <button id="toggle-user-password" type="button" class="absolute inset-y-0 right-2 rounded-md px-2 text-xs font-bold text-slate-500 hover:bg-green-50 hover:text-green-700">LIHAT</button>
          </div>
        </label>
        <label class="block">
          <span class="text-sm font-semibold">Status</span>
          <select name="status" class="input-field mt-1">
            <option>Aktif</option>
            <option>Nonaktif</option>
          </select>
        </label>
        <div class="grid gap-2">
          <span class="text-sm font-semibold">Verifikasi Tambahan</span>
          <div class="flex flex-wrap gap-2">
            <button id="enable-fingerprint" type="button" class="rounded-md border border-green-200 bg-white px-3 py-2 text-xs font-semibold text-green-700">Sidik Jari</button>
            <button id="enable-camera" type="button" class="rounded-md border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-700">Camera</button>
          </div>
          <input type="hidden" name="fingerprintEnabled" value="false" />
          <input type="hidden" name="cameraEnabled" value="false" />
          <p id="auth-method-status" class="text-xs font-semibold text-slate-500">Belum aktif.</p>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <button id="cancel-user-form" type="button" class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Batal</button>
        <button id="save-user-button" class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold">Simpan</button>
      </div>
    </form>
  `;
}

export async function afterRender() {
  const admins = listRegisteredSuperAdmins();
  const editor = document.querySelector("#user-editor");
  const form = document.querySelector("#user-form");
  const title = document.querySelector("#user-form-title");
  const saveButton = document.querySelector("#save-user-button");
  const status = document.querySelector("#auth-method-status");

  const setMethodStatus = () => {
    if (!form || !status) return;
    const methods = [];
    if (form.elements.fingerprintEnabled.value === "true") methods.push("Sidik jari aktif");
    if (form.elements.cameraEnabled.value === "true") methods.push("Camera aktif");
    status.textContent = methods.length ? methods.join(", ") : "Belum aktif.";
  };

  const resetForm = () => {
    form?.reset();
    if (!form) return;
    form.elements.id.value = "";
    form.elements.passwordHash.value = "";
    form.elements.fingerprintEnabled.value = "false";
    form.elements.cameraEnabled.value = "false";
    if (title) title.textContent = "Tambah Super Admin";
    if (saveButton) saveButton.textContent = "Simpan";
    setMethodStatus();
  };

  document.querySelector("#add-user-row")?.addEventListener("click", () => {
    resetForm();
    editor?.classList.remove("hidden");
  });

  document.querySelector("#cancel-user-form")?.addEventListener("click", () => {
    resetForm();
    editor?.classList.add("hidden");
  });

  document.querySelector("#toggle-user-password")?.addEventListener("click", () => {
    const password = document.querySelector("#user-password");
    if (!password) return;
    const hidden = password.type === "password";
    password.type = hidden ? "text" : "password";
    document.querySelector("#toggle-user-password").textContent = hidden ? "TUTUP" : "LIHAT";
  });

  document.querySelector("#enable-fingerprint")?.addEventListener("click", async () => {
    if (!form) return;
    if (window.PublicKeyCredential) {
      form.elements.fingerprintEnabled.value = "true";
    } else {
      alert("Browser/perangkat belum mendukung WebAuthn atau sidik jari.");
      form.elements.fingerprintEnabled.value = "false";
    }
    setMethodStatus();
  });

  document.querySelector("#enable-camera")?.addEventListener("click", async () => {
    if (!form) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      form.elements.cameraEnabled.value = "true";
    } catch (error) {
      alert("Camera belum diizinkan atau tidak tersedia.");
      form.elements.cameraEnabled.value = "false";
    }
    setMethodStatus();
  });

  document.querySelectorAll(".edit-user").forEach((button) => {
    button.addEventListener("click", () => {
      const admin = admins.find((item) => item.id === Number(button.dataset.id));
      if (!admin || !form) return;

      form.elements.id.value = admin.id;
      form.elements.name.value = admin.name;
      form.elements.password.value = "";
      form.elements.passwordHash.value = admin.passwordHash;
      form.elements.status.value = admin.status ?? "Aktif";
      form.elements.fingerprintEnabled.value = String(Boolean(admin.fingerprintEnabled));
      form.elements.cameraEnabled.value = String(Boolean(admin.cameraEnabled));
      if (title) title.textContent = "Edit Super Admin";
      if (saveButton) saveButton.textContent = "Update";
      setMethodStatus();
      editor?.classList.remove("hidden");
      editor?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll(".delete-user").forEach((button) => {
    button.addEventListener("click", async () => {
      const admin = admins.find((item) => item.id === Number(button.dataset.id));
      if (!confirm(`Hapus Super Admin "${admin?.name ?? "ini"}"?`)) return;

      try {
        deleteRegisteredSuperAdmin(button.dataset.id);
        await remove("users", button.dataset.id);
        location.reload();
      } catch (error) {
        alert(error.message);
      }
    });
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const id = formData.get("id");
    const user = {
      id,
      name: formData.get("name").trim(),
      role: "Super Admin",
      status: formData.get("status"),
      password: formData.get("password"),
      passwordHash: formData.get("passwordHash"),
      fingerprintEnabled: formData.get("fingerprintEnabled") === "true",
      cameraEnabled: formData.get("cameraEnabled") === "true"
    };

    const saved = saveRegisteredSuperAdmin(user);
    user.id = saved.id;
    if (id) {
      await update("users", id, user);
    } else {
      await add("users", user);
    }

    form.elements.id.value = saved.id;
    location.reload();
  });
}
