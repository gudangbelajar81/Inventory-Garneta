
    // ── Haptic helper ──
    const haptic = (pattern) => {
      if (navigator.vibrate) navigator.vibrate(pattern);
    };

    // --- HTML5 QR Code Scanner ---
    let html5QrcodeScanner = null;
    function togglePosScanner() {
      const container = document.getElementById('pos-reader-container');
      if (!container) return;
      
      haptic([50, 30, 50]);
      
      if (container.style.display === 'none') {
        container.style.display = 'block';
        if (!html5QrcodeScanner) {
          html5QrcodeScanner = new Html5QrcodeScanner("pos-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
          html5QrcodeScanner.render((decodedText) => {
             const inputEl = document.getElementById('pos-product-input');
             if (inputEl) {
               const matched = state.data.products.find(p => p.barcode === decodedText || p.name === decodedText);
               inputEl.value = matched ? matched.name : decodedText;
               inputEl.dispatchEvent(new Event('input', { bubbles: true }));
             }
             haptic([50, 30, 50]);
             html5QrcodeScanner.clear();
             container.style.display = 'none';
             html5QrcodeScanner = null;
          }, () => {});
        }
      } else {
        container.style.display = 'none';
        if (html5QrcodeScanner) {
          html5QrcodeScanner.clear();
          html5QrcodeScanner = null;
        }
      }
    }

    const state = {
      route: "dashboard",
      role: localStorage.getItem("role") || "Admin",
      currentUser: JSON.parse(localStorage.getItem("currentUser") || "null"),
      data: { products: [], suppliers: [], purchases: [], sales: [], users: [], priceHistory: [], auditLogs: [], dashboard: {} }
    };
    // Expose state to window for Smart Search
    window.state = state;
    let scannerStream = null;
    let scannerActive = false;
    let invoiceStream = null;
    window.deferredInstallPrompt = null;

    const rupiah = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(String(value || 0).replace(/[^0-9-]/g, "")));
    const today = () => new Date().toISOString().slice(0, 10);
    const el = (id) => document.getElementById(id);
    const API_URL = window.location.protocol === "file:" ? "http://127.0.0.1:3000/api" : "/api";

    async function gas(action, payload = {}) {
      let response;
      let headers = { "Content-Type": "application/json" };
      const token = localStorage.getItem("jwt_token");
      if (token) headers["Authorization"] = "Bearer " + token;

      try {
        response = await fetch(API_URL, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ action, payload })
        });
      } catch (error) {
        throw new Error("Tidak bisa terhubung ke server. Buka http://127.0.0.1:3000/ atau pastikan node server.js sedang berjalan.");
      }

      const text = await response.text();
      const result = text ? JSON.parse(text) : null;

      if (!response.ok) {
        if (response.status === 400 && result?.message && result.message.includes("Akses ditolak")) {
           localStorage.removeItem("jwt_token");
           alert(result.message);
           window.location.reload();
        }
        throw new Error(result?.message || result?.error || `API ${response.status}`);
      }

      if (action === "login" || action === "verifySuperAdmin") {
          if (result?.data?.token) {
              localStorage.setItem("jwt_token", result.data.token);
          }
      }

      return result?.data !== undefined ? result.data : result;
    }

    async function clearAuditLogs() {
      if (!confirm("Yakin ingin menghapus semua log aktivitas?")) return;
      try {
        await gas("clearAuditLogs");
        await load();
        alert("Semua log aktivitas berhasil dihapus!");
      } catch (err) {
        alert("Gagal menghapus log: " + err.message);
      }
    }
    window.clearAuditLogs = clearAuditLogs;

    async function load() {
      state.data = await gas("bootstrap");
      renderShell();
      render();
    }

    function employees() { return state.data.employees || []; }
    function cashAdvances() { return state.data.cashAdvances || []; }
    function payrolls() { return state.data.payrolls || []; }

    function renderShell() {
      let navHtml = menus.map(([key, label]) => `<button data-route="${key}" class="${state.route === key ? "active" : ""}">${label}</button>`).join("");
      const superMode = state.role === "Super Admin";
      
      navHtml += `<div style="flex:1;"></div>`;
      navHtml += `<button onclick="document.getElementById('login-modal').classList.remove('hidden'); document.getElementById('login-name').focus();" class="${superMode ? 'hidden' : ''}" style="border: 1px solid var(--primary); color: var(--primary); background: transparent; padding: 4px 12px; font-size: 0.75rem; height: 32px; border-radius: 12px; white-space: nowrap; flex-shrink: 0; min-width: auto; max-width: none;">Super Admin</button>`;
      navHtml += `<button onclick="if(confirm('Keluar dari Super Admin?')) { state.role = 'Admin'; saveState(); renderShell(); render(); }" class="${superMode ? '' : 'hidden'}" style="border: 1px solid var(--orange); color: var(--orange); background: transparent; padding: 4px 12px; font-size: 0.75rem; height: 32px; border-radius: 12px; white-space: nowrap; flex-shrink: 0; min-width: auto; max-width: none;">Keluar</button>`;

      el("nav").innerHTML = navHtml;
      
      el("nav").querySelectorAll("button[data-route]").forEach((button) => {
        button.onclick = () => {
          state.route = button.dataset.route;
          renderShell();
          render();
        };
      });
      el("role-label").textContent = superMode ? `Super Admin: ${state.currentUser?.name || ""}` : "Admin";
      applyBrandAssets();
    }

    
      // Workspace state for Gaji page
      window.gajiWorkspace = localStorage.getItem('gajiWorkspace') || 'karyawan';
      
      function switchGajiWorkspace(workspace) {
        window.gajiWorkspace = workspace;
        localStorage.setItem('gajiWorkspace', workspace);
        render();
      }
      
      function gaji() {
  const activeEmpId = window.gajiActiveEmpId || null;
  
  if (!activeEmpId) {
    // List Karyawan View
    return `
    <section class="workspace">
      <div class="workspace-header">
        <h2 class="workspace-title">👥 Data Karyawan & Gaji</h2>
        <p class="subtitle">Pilih karyawan untuk mengelola profil, kasbon, dan penggajiannya.</p>
        <button class="btn primary" onclick="editEmployee('')" style="margin-top:1rem;">+ Karyawan Baru</button>
      </div>
      <div class="workspace-content">
        <div class="card">
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Nama</th><th>Tipe</th><th>Gaji Pokok</th><th>Total Kasbon Aktif</th></tr></thead>
              <tbody>
                ${employees().map(e => {
                  const unpaidBons = cashAdvances().filter(c => c.employeeId == e.id && c.status === 'Belum Lunas');
                  const totalBon = unpaidBons.reduce((sum, c) => sum + Number(c.amount), 0);
                  return `<tr onclick="openEmployeeDashboard('${e.id}')" style="cursor:pointer; transition:all 0.3s ease;" onmouseover="this.style.background='rgba(0,255,204,0.05)'" onmouseout="this.style.background='transparent'">
                    <td><strong style="color:var(--mint); text-decoration:underline; text-underline-offset:3px;">${escapeHtml(e.name)}</strong></td>
                    <td>${e.salaryType}</td>
                    <td>${rupiah(e.baseSalary)}</td>
                    <td style="color: #f43f5e;">${totalBon > 0 ? rupiah(totalBon) : '-'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>`;
  }
  
  // Detail Karyawan View
  const emp = employees().find(e => e.id == activeEmpId);
  if (!emp) {
    window.gajiActiveEmpId = null;
    return gaji();
  }
  
  const unpaidBons = cashAdvances().filter(c => c.employeeId == emp.id && c.status === 'Belum Lunas');
  const totalBon = unpaidBons.reduce((sum, c) => sum + Number(c.amount), 0);
  
  setTimeout(bindGajiEvents, 100);
  
  return `
  <section class="workspace">
    <div class="workspace-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <button class="btn soft" onclick="openEmployeeDashboard(null)" style="margin-bottom:1rem;">&larr; Kembali ke Daftar Karyawan</button>
        <h2 class="workspace-title">Dashboard: ${emp.name}</h2>
        <p class="subtitle">Kelola profil, riwayat kasbon, dan proses penggajian.</p>
      </div>
    </div>
    
    <div class="workspace-content">
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); align-items: start;">
        
        <!-- Panel Kiri: Profil & Kasbon -->
        <div>
          <div class="card">
            <h3>Profil Karyawan</h3>
            <form id="form-employee" class="grid forms" style="grid-template-columns: 1fr;">
              <input type="hidden" name="id" value="${emp.id}">
              ${input("name", "Nama Karyawan", true, "text", emp.name)}
              ${input("phone", "Nomor HP", false, "text", emp.phone || "")}
              ${input("joinDate", "Tanggal Masuk", true, "date", emp.joinDate ? emp.joinDate.slice(0,10) : '')}
              ${select("salaryType", "Tipe Gaji", ["Bulanan", "Harian"], emp.salaryType)}
              ${input("baseSalary", "Gaji Pokok (Rp)", true, "text", "")}
              <div class="form-actions" style="grid-column: 1 / -1; position:sticky; bottom:-16px; background:var(--card-bg); padding:16px; margin: 16px -16px -16px -16px; border-top:1px solid rgba(255,255,255,0.05); z-index:10; display:flex; justify-content:flex-end; gap:8px; border-radius:0 0 16px 16px; box-shadow:0 -20px 40px rgba(0,0,0,0.3); backdrop-filter:blur(10px);">
                <button type="button" class="btn danger" onclick="hapusKaryawan('${emp.id}')" style="padding:12px 16px;">Hapus</button>
                <button type="submit" class="btn primary" style="flex:1; font-size:1.1rem; padding:12px 16px; box-shadow:0 4px 12px rgba(0,255,204,0.3);">💾 Update Profil</button>
              </div>
            </form>
          </div>
          
          <div class="card" style="margin-top:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h3>Riwayat Kasbon</h3>
              <button class="btn soft" onclick="tambahKasbon('${emp.id}')">+ Kasbon Baru</button>
            </div>
            
            <form id="form-bon" class="grid forms" style="display:none; grid-template-columns: 1fr; background:var(--bg); padding:1rem; border-radius:8px; margin-top:1rem;">
              <input type="hidden" name="id" value="">
              <input type="hidden" name="employeeId" value="${emp.id}">
              ${input("date", "Tanggal", true, "date", today())}
              ${input("amount", "Nominal Kasbon (Rp)", true, "text")}
              ${input("notes", "Keterangan", false, "text", "")}
              <div class="form-actions" style="grid-column: 1 / -1; position:sticky; bottom:-16px; background:var(--card-bg); padding:16px; margin: 16px -16px -16px -16px; border-top:1px solid rgba(255,255,255,0.05); z-index:10; display:flex; justify-content:flex-end; gap:8px; border-radius:0 0 16px 16px; box-shadow:0 -20px 40px rgba(0,0,0,0.3); backdrop-filter:blur(10px);">
                <button type="button" class="btn soft" onclick="document.getElementById('form-bon').style.display='none'" style="padding:12px 16px;">Batal</button>
                <button type="submit" class="btn primary" style="flex:1; font-size:1.1rem; padding:12px 16px; box-shadow:0 4px 12px rgba(0,255,204,0.3);">💾 Simpan Bon</button>
              </div>
            </form>
            
            <div class="table-wrap" style="margin-top:1rem;">
              <table class="table" style="font-size:0.9rem;">
                <thead><tr><th>Tgl</th><th>Nominal</th><th>Ket</th><th style="text-align:right;">Aksi</th></tr></thead>
                <tbody>
                  ${unpaidBons.length === 0 ? '<tr><td colspan="4" class="text-center muted">Tidak ada utang kasbon</td></tr>' : ''}
                  ${unpaidBons.map(c => `<tr>
                    <td>${c.date ? escapeHtml(c.date.slice(0,10)) : ''}</td>
                    <td style="color:#f43f5e;">${rupiah(c.amount)}</td>
                    <td>${c.notes || '-'}</td>
                    <td style="text-align:right;">
                      <button class="btn soft" style="padding:4px 8px;font-size:0.8rem;margin-right:4px;" onclick="editBon('${c.id}')">✏️</button>
                      <button class="btn soft" style="padding:4px 8px;font-size:0.8rem;" onclick="hapusBon('${c.id}')">❌</button>
                    </td>
                  </tr>`).join('')}
                </tbody>
              </table>
              <div style="margin-top:1rem; text-align:right; font-weight:bold; font-size:1.1rem;">
                Total Kasbon: <span style="color:#f43f5e;">${rupiah(totalBon)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Panel Kanan: Hitung Gaji -->
        <div>
          <div class="card" style="border: 1px solid var(--primary); background: rgba(0, 240, 255, 0.02);">
            <h3>💰 Hitung & Bayar Gaji</h3>
            <form id="form-payroll" class="grid forms" style="grid-template-columns: 1fr;">
              <input type="hidden" name="employeeId" value="${emp.id}">
              <input type="hidden" name="totalBon" value="${totalBon}">
              
              <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 1rem;">
                ${input("periodStart", "Periode Mulai (Tgl Masuk)", false, "date")}
                ${input("periodEnd", "Periode Akhir (Hari Ini)", false, "date")}
              </div>
              <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 1rem;">
                ${input("leaveDays", "Potong Libur (Hari)", false, "number", 0)}
                <label>Hari Kerja Aktual<input name="attendanceDays" type="text" readonly style="background:var(--bg);font-weight:bold;"></label>
              </div>
              
              <div style="background: var(--bg); padding: 1.5rem; border-radius: 8px; margin-top: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                  <span>Gaji Pokok / Hitungan: <br><span id="payroll-basic-breakdown" style="font-size:0.8rem;opacity:0.7;"></span></span>
                  <strong id="payroll-basic-salary" style="font-size:1.1rem;">Rp 0</strong>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; align-items:center;">
                  <span style="color: #f43f5e;">Bayar / Cicil Kasbon:</span>
                  <div style="text-align:right; width: 50%;">
                    <input type="text" name="cicilKasbon" id="payroll-cicil" class="number-format" oninput="formatNumberInput(this)" style="text-align:right; color:#f43f5e; font-weight:bold; width:100%;" placeholder="0">
                    <div style="font-size:0.8rem; opacity:0.7; margin-top:4px;">Total Utang: ${rupiah(totalBon)}</div>
                  </div>
                </div>
                
                <hr style="border-color: rgba(255,255,255,0.1); margin: 1rem 0;">
                <div style="display: flex; justify-content: space-between; font-size: 1.25rem;">
                  <span>Gaji Bersih Diterima:</span>
                  <strong id="payroll-net" style="color: #10b981;">Rp 0</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-top:0.5rem;">
                  <span>Sisa Bon Bulan Depan:</span>
                  <strong id="payroll-sisa-bon" style="color: #f43f5e;">Rp 0</strong>
                </div>
              </div>
              
              ${input("notes", "Keterangan (Opsional)")}
              
              <label style="display:flex;align-items:center;gap:8px;margin-top:0.5rem;font-size:0.9rem;">
                <input type="checkbox" name="resetJoinDate" checked style="width:auto;margin:0;"> 
                Set "Tanggal Masuk" ke besok (Centang jika lanjut kerja)
              </label>
              
              <div class="form-actions" style="grid-column: 1 / -1; position:sticky; bottom:-16px; background:var(--card-bg); padding:16px; margin: 16px -16px -16px -16px; border-top:1px solid rgba(255,255,255,0.05); z-index:10; display:flex; justify-content:flex-end; gap:8px; border-radius:0 0 16px 16px; box-shadow:0 -20px 40px rgba(0,0,0,0.3); backdrop-filter:blur(10px);">
                <button type="button" class="btn soft" onclick="document.getElementById('form-payroll').style.display='none'" style="padding:12px 16px;">Batal</button>
                <button type="submit" class="btn success" style="flex:1; font-size:1.1rem; padding:12px 16px; box-shadow:0 4px 12px rgba(0,255,204,0.3);">💸 Cairkan Gaji</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

window.openEmployeeDashboard = function(id) {
  window.gajiActiveEmpId = id || null;
  render();
};

window.tambahKasbon = function(empId) {
  const f = document.getElementById('form-bon');
  if(f) {
    f.style.display = 'grid';
    f.elements.id.value = '';
    f.elements.amount.value = '';
    f.elements.notes.value = '';
    f.elements.date.value = today();
    f.scrollIntoView();
  }
};

window.editEmployee = function(id) {
  if (!id) {
     const name = prompt("Masukkan Nama Karyawan Baru:");
     if (name) {
        gas("add", { collection: "employees", id: null, item: { name: name, phone: "", joinDate: today(), salaryType: "Harian", baseSalary: 0, status: "Aktif" }})
        .then(() => { alert("Berhasil ditambahkan. Silakan klik Kelola untuk melengkapi profil."); load(); })
        .catch(e => alert(e.message));
     }
  }
};

window.hapusKaryawan = async function(id) {
  if (!confirm("Yakin ingin menghapus data karyawan ini?")) return;
  window.gajiActiveEmpId = null;
  render();
  try {
    await gas("remove", { collection: "employees", id });
    await load();
  } catch(err) {
    alert("Gagal menghapus karyawan: " + err.message);
  }
};

window.editBon = function(id) {
  const bon = cashAdvances().find(c => c.id == id);
  if (bon) {
    const f = document.getElementById('form-bon');
    if (f) {
      f.style.display = 'grid';
      f.elements.id.value = bon.id;
      f.elements.employeeId.value = bon.employeeId;
      f.elements.date.value = bon.date ? bon.date.slice(0,10) : '';
      f.elements.amount.value = formatInitialNumber(bon.amount);
      f.elements.notes.value = bon.notes;
      f.scrollIntoView();
    }
  }
};

window.hapusBon = async function(id) {
  const removed = (state.data.cashAdvances || []).find(r => String(r.id) === String(id));
  state.data.cashAdvances = (state.data.cashAdvances || []).filter(r => String(r.id) !== String(id));
  render();
  try {
    await gas("remove", { collection: "cashAdvances", id });
  } catch(err) {
    if (removed) state.data.cashAdvances.push(removed);
    render();
    alert(err.message);
  }
};

function bindGajiEvents() {
  if (!window.gajiActiveEmpId) return;
  const empId = window.gajiActiveEmpId;
  const emp = employees().find(e => e.id == empId);
  if (!emp) return;
  
  // Format initial values
  const formEmp = document.getElementById("form-employee");
  if (formEmp && formEmp.elements.baseSalary) {
    formEmp.elements.baseSalary.value = formatInitialNumber(emp.baseSalary);
    formEmp.elements.baseSalary.addEventListener("input", function() { formatNumberInput(this); });
  }
  
  const formBon = document.getElementById("form-bon");
  if (formBon && formBon.elements.amount) {
    formBon.elements.amount.addEventListener("input", function() { formatNumberInput(this); });
  }

  // Employee Submit
  if (formEmp) {
    formEmp.onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const payload = {
        name: form.elements.name.value,
        phone: form.elements.phone.value,
        joinDate: form.elements.joinDate.value,
        salaryType: form.elements.salaryType.value,
        baseSalary: plainNumber(form.elements.baseSalary.value),
        status: 'Aktif'
      };
      const id = form.elements.id.value;
      try {
        await gas(id ? "update" : "add", { collection: "employees", id, item: payload });
        alert("Profil Karyawan berhasil diperbarui");
        await load();
      } catch(err) { alert(err.message); }
    };
  }
  
  // Kasbon Submit
  if (formBon) {
    formBon.onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const payload = {
        employeeId: form.elements.employeeId.value,
        date: form.elements.date.value,
        amount: plainNumber(form.elements.amount.value),
        notes: form.elements.notes.value,
        status: "Belum Lunas"
      };
      const id = form.elements.id.value;
      try {
        await gas(id ? "update" : "add", { collection: "cashAdvances", id, item: payload });
        alert("Bon berhasil dicatat");
        await load();
      } catch(err) { alert(err.message); }
    };
  }
  
  // Payroll Logic
  const pStart = document.getElementsByName("periodStart")[0];
  const pEnd = document.getElementsByName("periodEnd")[0];
  const pLeave = document.getElementsByName("leaveDays")[0];
  const payrollDays = document.getElementsByName("attendanceDays")[0];
  const cicilInput = document.getElementById("payroll-cicil");
  
  const unpaidBons = cashAdvances().filter(c => c.employeeId == empId && c.status === 'Belum Lunas');
  const totalBon = unpaidBons.reduce((sum, c) => sum + Number(c.amount), 0);
  
  // Initialize start/end dates
  if (pStart && !pStart.value && emp.joinDate) pStart.value = emp.joinDate.split('T')[0];
  if (pEnd && !pEnd.value) pEnd.value = today();
  
  const calcPayroll = () => {
      const fEmp = document.getElementById("form-employee");
      let currentSalaryType = emp.salaryType;
      let currentBaseSalary = emp.baseSalary;
      if (fEmp) {
         currentSalaryType = fEmp.elements.salaryType.value;
         currentBaseSalary = plainNumber(fEmp.elements.baseSalary.value);
      }

      let actualDays = 0;
      if (currentSalaryType === 'Harian') {
        if (pStart && pEnd && pStart.value && pEnd.value) {
          const d1 = new Date(pStart.value);
          const d2 = new Date(pEnd.value);
          const diffTime = d2 - d1;
          const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24))) + 1;
          const leave = Number(pLeave ? pLeave.value : 0) || 0;
          actualDays = Math.max(0, diffDays - leave);
        }
        if(payrollDays) payrollDays.value = actualDays;
      } else {
        if(payrollDays) payrollDays.value = 1;
        actualDays = 1;
      }
      
      let basicCalc = 0;
      let breakdownText = "";
      if (currentSalaryType === 'Harian') {
        const dailyRate = Math.round(currentBaseSalary / 30);
        basicCalc = dailyRate * actualDays;
        breakdownText = `(${rupiah(dailyRate)}/hr x ${actualDays}hr)`;
      } else {
        basicCalc = currentBaseSalary;
        breakdownText = "(1 Bulan)";
      }
      
      const cicil = plainNumber(cicilInput ? cicilInput.value : 0) || 0;
      const net = basicCalc - cicil;
      const sisaBon = Math.max(0, totalBon - cicil);
      
      const brkElement = document.getElementById("payroll-basic-breakdown");
      if (brkElement) brkElement.innerText = breakdownText;
      const basicEl = document.getElementById("payroll-basic-salary");
      if (basicEl) basicEl.innerText = rupiah(basicCalc);
      const netEl = document.getElementById("payroll-net");
      if (netEl) netEl.innerText = rupiah(net);
      const sisaEl = document.getElementById("payroll-sisa-bon");
      if (sisaEl) sisaEl.innerText = rupiah(sisaBon);
      
      return basicCalc;
    };
    
    // Auto-fill cicilan
    if (cicilInput && !cicilInput.value) {
       let basicCalc = calcPayroll();
       let defaultCicil = Math.min(totalBon, basicCalc);
       cicilInput.value = formatInitialNumber(defaultCicil);
    }
    
    if (pStart) pStart.addEventListener("input", calcPayroll);
    if (pEnd) pEnd.addEventListener("input", calcPayroll);
    if (pLeave) pLeave.addEventListener("input", calcPayroll);
    if (cicilInput) cicilInput.addEventListener("input", calcPayroll);
    if (formEmp) {
      formEmp.elements.salaryType.addEventListener("change", calcPayroll);
      formEmp.elements.baseSalary.addEventListener("input", calcPayroll);
    }
  
  calcPayroll(); // Run once
  
  // Submit Payroll
  const formPayroll = document.getElementById("form-payroll");
  if (formPayroll) {
    formPayroll.onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      
      let actualDays = Number(form.elements.attendanceDays.value || 0);
      let basicCalc = emp.salaryType === 'Harian' ? (Math.round(emp.baseSalary / 30) * actualDays) : emp.baseSalary;
      
      const cicil = plainNumber(form.elements.cicilKasbon.value || 0);
      if (cicil > totalBon) {
        alert("Nominal cicilan tidak boleh lebih besar dari total utang kasbon!");
        return;
      }
      
      const net = basicCalc - cicil;
      const bonIds = unpaidBons.map(c => c.id);
      
      if (!confirm(`Yakin bayar gaji ${emp.name} sejumlah ${rupiah(net)}?\nPotong Kasbon: ${rupiah(cicil)}`)) return;
      
      const payload = {
        employeeId: empId,
        periodStart: form.elements.periodStart.value,
        periodEnd: form.elements.periodEnd.value,
        attendanceDays: actualDays,
        basicSalaryCalculated: basicCalc,
        totalDeductionBon: cicil, // the actual deduction amount
        netSalary: net,
        notes: form.elements.notes.value,
        resetJoinDate: form.elements.resetJoinDate.checked,
        bonIds: bonIds, // we pass all active bon IDs to be cleared
        sisaBonBaru: Math.max(0, totalBon - cicil) // tell server to create new bon
      };
      
      try {
        await gas("add", { collection: "payrolls", id: null, item: payload });
        alert("Gaji berhasil dibayarkan!");
        await load();
      } catch(err) { alert(err.message); }
    };
  }
}


        function render() {
      const label = menus.find(([key]) => key === state.route)?.[1] || "Dashboard";
      if (state.route === 'ngitung') {
        el("page-title").innerHTML = `<span style="display:flex; align-items:center; gap:10px;">🧮 <span onclick="state.route='dashboard';renderShell();render()" style="cursor:pointer; font-size:1.6rem; font-weight:900; color:var(--text); line-height:1; display:flex; align-items:center; justify-content:center; transform:translateY(-2px); transition:all 0.2s;" title="Kembali ke Dashboard">↺</span></span>`;
      } else {
        el("page-title").textContent = label;
      }
      
      if (state.route === 'dashboard' || state.route === 'ngitung') {
        el("main-topbar").style.display = "";
      } else {
        el("main-topbar").style.display = "none";
      }
      
      if (["laporan", "statistik", "audit", "users"].includes(state.route) && state.role !== "Super Admin") {
        el("content").innerHTML = `<div class="card"><h2>Akses dibatasi</h2><p class="muted">Menu ini hanya bisa diakses Super Admin.</p></div>`;
        return;
      }
      const views = { dashboard, "neural-hub": neuralHub, barang, supplier, pembelian, ngitung, riwayatNgitung, hutangNgitung, kalkulator, penjualan, laporan, statistik, audit, users, gaji, settings };
      el("content").innerHTML = views[state.route] ? views[state.route]() : `<div class="card"><h2>Menu tidak ditemukan</h2><p class="muted">Route: ${state.route}</p></div>`;
      bindForms();
    }

    function neuralHub() {
    // Modul untuk Admin (hanya 4 + pembelian)
    const adminModules = [
      { id: "barang", name: "Barang", icon: "📦", desc: "Manajemen produk", core: true },
      { id: "penjualan", name: "Penjualan", icon: "💵", desc: "Input transaksi", core: true },

      { id: "pembelian", name: "Pembelian", icon: "🛒", desc: "Restock barang" }
    ];
      
      // Modul untuk Super Admin (semua)
      const superAdminModules = [
        { id: "barang", name: "Barang", icon: "📦", desc: "Manajemen produk", core: true },
        { id: "penjualan", name: "Penjualan", icon: "💵", desc: "Input transaksi", core: true },
        { id: "pembelian", name: "Pembelian", icon: "🛒", desc: "Restock barang" },
        { id: "kalkulator", name: "Kalkulator", icon: "🧮", desc: "Hitung belanja" },

        { id: "laporan", name: "Laporan", icon: "📈", desc: "Laporan harian" },
        { id: "statistik", name: "Statistik", icon: "📊", desc: "Analisis data" },
        { id: "users", name: "Users", icon: "👤", desc: "Manajemen user" },
        { id: "audit", name: "Audit Log", icon: "📋", desc: "Riwayat aktivitas" },
        { id: "settings", name: "Setting", icon: "⚙️", desc: "Pengaturan" }
      ];
      
      const modules = isSuperAdmin() ? superAdminModules : adminModules;
      
      const d = state.data.dashboard || {};
      
      return `<section class="grid">
        <div class="grid stats">
          ${stat("Total Barang", d.totalProducts)}

          ${stat("Nilai Stok", rupiah(d.stockValue))}
          ${isSuperAdmin() ? stat("Keuntungan", rupiah(d.totalProfit)) : ""}
        </div>
        <div class="card">
          <h2>🧠 Neural Hub - AI Command Center</h2>
          <p class="muted">Pusat kendali sistem - klik modul untuk navigasi cepat</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:16px;">
            ${modules.map(m => `
              <button class="btn ${m.core ? 'primary' : 'soft'}" onclick="state.route='${m.id}';renderShell();render()" style="padding:16px;text-align:center;flex-direction:column;gap:8px;height:auto;">
                <span style="font-size:2rem">${m.icon}</span>
                <span style="font-weight:700">${m.name}</span>
                <span style="font-size:11px;opacity:0.8">${m.desc}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </section>`;
    }

    function dashboard() {
      // Initialize Neural Hub Dashboard
      setTimeout(function() {
        if (window.NeuralHub) {
          window.NeuralHub.init();
        }
      }, 100);
      
      return `<section id="neural-dashboard-container" style="min-height:calc(100vh - 140px);">
        <!-- Neural Hub Dashboard akan di-render oleh JavaScript -->
      </section>`;
    }


    function invoiceAiTools() {
      return `<div class="grid">
        <div class="grid forms">
          <label>Import Foto Nota JPG/JPEG/PNG
            <input id="invoice-image-file" type="file" accept="image/jpeg,image/jpg,image/png">
          </label>
          <div class="actions" style="align-self:end">
            <button class="btn soft" id="open-invoice-camera">Buka Kamera</button>
            <button class="btn danger hidden" id="close-invoice-camera">Tutup Kamera</button>
          </div>
        </div>
        <video id="invoice-camera-video" class="scanner-preview hidden" playsinline></video>
        <canvas id="invoice-canvas" class="hidden"></canvas>
        <div class="actions">
          <button class="btn primary" id="analyze-invoice-file">Analisa Foto</button>
          <button class="btn primary hidden" id="capture-invoice-photo">Foto & Analisa</button>
          <button class="btn soft" id="copy-invoice-result">Copy Hasil</button>
          <button class="btn soft" id="parse-invoice-draft">Jadikan Draft</button>
        </div>
        <label>Perintah AI
          <textarea id="invoice-ai-instruction" class="input-area expandable" placeholder="Contoh: ambil nama barang dan harga saja. Atau: jumlahkan total belanja pada nota ini."></textarea>
        </label>
        <label>Hasil
          <textarea id="invoice-ai-result" class="input-area expandable" placeholder="Hasil AI akan muncul di sini dan bisa diedit/copy."></textarea>
        </label>
        <div>
          <div class="actions" style="justify-content:space-between">
            <h3>Draft Pembelian dari Nota</h3>
            <div class="actions" style="grid-column: 1 / -1; position:sticky; bottom:-16px; background:var(--card-bg); padding:16px; margin: 16px -16px -16px -16px; border-top:1px solid rgba(255,255,255,0.05); z-index:10; display:flex; justify-content:flex-end; gap:8px; border-radius:0 0 16px 16px; box-shadow:0 -20px 40px rgba(0,0,0,0.3); backdrop-filter:blur(10px);">
              <button class="btn danger" id="clear-invoice-draft" style="padding:12px 16px;">Kosongkan</button>
              <button class="btn primary" id="save-invoice-draft" style="flex:1; font-size:1.1rem; padding:12px 16px; box-shadow:0 4px 12px rgba(0,255,204,0.3);">💾 Simpan ke Barang</button>
            </div>
          </div>
          <div id="invoice-draft-table">${invoiceDraftTable()}</div>
        </div>
        <p class="muted">Jika hasil AI berupa JSON nota, klik Jadikan Draft. Koreksi baris yang salah, hapus item keliru, lalu simpan ke Barang/Pembelian.</p>
      </div>`;
    }

    // Workspace state for Barang page
    window.barangWorkspace = localStorage.getItem('barangWorkspace') || 'list';
    
    function switchBarangWorkspace(workspace) {
      window.barangWorkspace = workspace;
      localStorage.setItem('barangWorkspace', workspace);
      render();
    }
    
    function barang() {
      // Admin: hanya search & form. Super Admin: semua tab
      const adminWorkspaces = [
        { id: 'search', icon: '🔍', label: 'Cari' },
        { id: 'form', icon: '➕', label: 'Form' },
        { id: 'list', icon: '📋', label: 'Daftar' }
      ];

      const superAdminWorkspaces = [
        { id: 'search', icon: '🔍', label: 'Cari' },
        { id: 'form', icon: '➕', label: 'Form' },
        { id: 'ai-input', icon: '🎤', label: 'AI Input' },
        { id: 'ai', icon: '🤖', label: 'AI Nota' },
        { id: 'import', icon: '📥', label: 'Import' },
        { id: 'scanner', icon: '📷', label: 'Scanner' },
        { id: 'list', icon: '📋', label: 'Daftar' }
      ];

      const workspaces = isSuperAdmin() ? superAdminWorkspaces : adminWorkspaces;
      
      const activeWorkspace = window.barangWorkspace || 'list';
      
      // Render toolbar
      const toolbar = `<div class="workspace-toolbar">
        ${workspaces.map(ws => `
          <button class="workspace-tab ${activeWorkspace === ws.id ? 'active' : ''}" 
                  onclick="switchBarangWorkspace('${ws.id}')">
            <span class="workspace-icon">${ws.icon}</span>
            <span class="workspace-label">${ws.label}</span>
          </button>
        `).join('')}
      </div>`;
      
      // Render active workspace content
      let workspaceContent = '';
      switch(activeWorkspace) {
        case 'search':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>🔍 Pencarian Barang</h3>
              <div class="search-container">
                <input type="text" id="search-barang-input" placeholder="Cari nama, kategori, atau barcode..." oninput="searchBarang(this.value)">
                <button class="btn soft" onclick="clearSearchBarang()">Clear</button>
              </div>
              <div id="search-barang-results" style="margin-top:12px;"></div>
            </div>
          </div>`;
          break;
        case 'form':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📝 Form Barang</h3>
              ${productForm()}
            </div>
          </div>`;
          break;
        case 'ai-input':
          workspaceContent = `<div class="workspace-content">
            ${window.generateAIInputPanel ? window.generateAIInputPanel('barang') : '<div class="card"><p>AI Input Center loading...</p></div>'}
          </div>`;
          // Initialize AI Input Center after render
          setTimeout(() => {
            if (window.initAIInputCenter) window.initAIInputCenter();
          }, 100);
          break;
        case 'ai':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>🤖 AI Nota ke Barang</h3>
              ${invoiceAiTools()}
            </div>
          </div>`;
          break;
        case 'import':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📥 Import Barang</h3>
              ${productImportTools()}
            </div>
          </div>`;
          break;
        case 'scanner':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📷 Scanner HP</h3>
              ${productScannerTools()}
            </div>
          </div>`;
          break;
        case 'list':
        default:
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📋 Daftar Barang (${state.data.products?.length || 0})</h3>
              ${productRows()}
            </div>
          </div>`;
      }
      
      return `<section class="barang-workspace">
        ${toolbar}
        ${workspaceContent}
      </section>`;
    }

    // Workspace state for Pembelian page
    window.pembelianWorkspace = localStorage.getItem('pembelianWorkspace') || 'list';
    
    function switchPembelianWorkspace(workspace) {
      window.pembelianWorkspace = workspace;
      localStorage.setItem('pembelianWorkspace', workspace);
      render();
    }
    
    function pembelian() {
      const workspaces = [
        { id: 'search', icon: '🔍', label: 'Cari' },
        { id: 'form', icon: '➕', label: 'Form' },
        { id: 'wa', icon: '📱', label: 'Paste WA' },
        { id: 'list', icon: '📋', label: 'Daftar' }
      ];
      
      const activeWorkspace = window.pembelianWorkspace || 'list';
      
      const toolbar = `<div class="workspace-toolbar">
        ${workspaces.map(ws => `
          <button class="workspace-tab ${activeWorkspace === ws.id ? 'active' : ''}" 
                  onclick="switchPembelianWorkspace('${ws.id}')">
            <span class="workspace-icon">${ws.icon}</span>
            <span class="workspace-label">${ws.label}</span>
          </button>
        `).join('')}
      </div>`;
      
      let workspaceContent = '';
      switch(activeWorkspace) {
        case 'search':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>🔍 Pencarian Pembelian</h3>
              <div class="search-container">
                <input type="text" id="search-pembelian-input" placeholder="Cari barang atau tanggal..." oninput="searchPembelian(this.value)">
                <button class="btn soft" onclick="clearSearchPembelian()">Clear</button>
              </div>
              <div id="search-pembelian-results" style="margin-top:12px;"></div>
            </div>
          </div>`;
          break;
        case 'form':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📝 Form Pembelian</h3>
              ${purchaseForm()}
            </div>
          </div>`;
          break;
        case 'wa':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📱 Paste dari WhatsApp</h3>
              <label>Daftar Pembelian dari WA
                <textarea id="pembelian-wa-text" class="input-area expandable" placeholder="Format: NamaBarang Qty Harga
Contoh:
Beras Premium 5 250000
Gula Pasir 2 24000
Minyak Goreng 3 45000"></textarea>
              </label>
              <div id="pembelian-wa-preview" style="margin-top:16px;"></div>
            </div>
          </div>`;
          break;
        case 'list':
        default:
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📋 Daftar Pembelian (${state.data.purchases?.length || 0})</h3>
              ${purchaseRows()}
            </div>
          </div>`;
      }
      
      return `<section class="barang-workspace">
        ${toolbar}
        ${workspaceContent}
      </section>`;
    }

    // Workspace state for Kalkulator page
    window.kalkulatorWorkspace = localStorage.getItem('kalkulatorWorkspace') || 'list';
    
    function switchKalkulatorWorkspace(workspace) {
      window.kalkulatorWorkspace = workspace;
      localStorage.setItem('kalkulatorWorkspace', workspace);
      render();
    }
    
    window.calcState = { expr: '', current: '0', resetOnNext: false };
    window.calcPress = function(btn) {
      const state = window.calcState;
      const display = document.getElementById('calc-display');
      const exprDiv = document.getElementById('calc-expr');
      
      if (!display) return;
      
      if (btn === 'C') {
        state.expr = ''; state.current = '0'; state.resetOnNext = false;
      } else if (btn === 'DEL') {
        if (!state.resetOnNext) {
          state.current = state.current.slice(0, -1) || '0';
        }
      } else if (btn === '=') {
        try {
          let toEval = state.expr + state.current;
          let result = new Function('return ' + toEval)();
          state.current = String(Math.round(result * 100000000) / 100000000);
          state.expr = '';
          state.resetOnNext = true;
        } catch(e) {
          state.current = 'Error';
          state.resetOnNext = true;
        }
      } else if (['+', '-', '*', '/'].includes(btn)) {
        state.expr += state.current + btn;
        state.resetOnNext = true;
      } else {
        if (state.resetOnNext) {
          state.current = btn === '.' ? '0.' : btn;
          state.resetOnNext = false;
        } else {
          if (btn === '.' && state.current.includes('.')) return;
          state.current = state.current === '0' && btn !== '.' ? btn : state.current + btn;
        }
      }
      
      display.innerText = state.current;
      exprDiv.innerText = state.expr.replace(/\*/g, '×').replace(/\//g, '÷');
    };

    window.ngitungRows = [{ id: Date.now(), name: '', price: '', qty: '' }];
    window.ngitungHistory = [];
    if (typeof gas === 'function') {
      gas('getSetting', { key: 'ngitungHistory', fallback: '[]' }).then(res => {
        try {
          window.ngitungHistory = JSON.parse(res);
          window.ngitungRenderTable();
        } catch(e) {}
      });
    }

    window.ngitungRenderTable = function() {
      const tbody = document.getElementById('ngitung-tbody');
      if (!tbody) return;
      
      let html = '';
      let total = 0;
      
      window.ngitungRows.forEach((row, index) => {
        const qty = Number(String(row.qty).replace(/[^0-9-.]/g, '')) || 1;
        const price = Number(String(row.price).replace(/[^0-9-]/g, '')) || 0;
        const rawAmount = row.price ? price * qty : 0;
        const amount = Math.ceil(rawAmount / 500) * 500;
        total += amount;
        
        const val = escapeAttr(row.rawInput !== undefined ? row.rawInput : (row.name ? `${row.name} ${row.price || ''} ${row.qty !== 1 ? row.qty : ''}`.trim() : ''));
        
        html += `
          <div class="ngitung-row" style="padding: 6px 0; border-bottom: 1px solid var(--border);">
            <div style="display:flex; align-items:center; width:100%;">
              <div style="position: relative; width: 65%;">
                <input type="text" autocomplete="off" value="${val}" onclick="this.select()" oninput="ngitungShowSuggestions(this, ${row.id}, event); ngitungParseAndUpdate(this, ${row.id})" onkeydown="ngitungKeydown(this, ${row.id}, event)" onchange="ngitungFocusNext(this, ${row.id})" placeholder="Cth: Bawang 3000 5" style="width: 100%; font-size: 1.05rem; padding: 12px 10px; border-radius: 8px; margin: 0; border: none; background: var(--field-bg);">
                <div id="ngitung-sug-${row.id}" class="smart-search-dropdown hidden" style="width: 140%; min-width: 280px; z-index: 100;"></div>
              </div>
              <div style="width: 27%; text-align: right; font-weight: bold; font-size: 1rem; color: var(--primary); white-space:nowrap; padding: 0 5px; text-overflow: ellipsis; overflow: hidden;" class="row-amount">${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)}</div>
              <button onclick="ngitungRemoveRow(${row.id})" ${window.ngitungRows.length === 1 ? 'disabled' : ''} style="width: 8%; background: transparent; border: none; font-size: 1.2rem; color: var(--red); cursor: pointer; padding: 0; text-align: center;">🗑</button>
            </div>
          </div>
        `;
      });
      
      tbody.innerHTML = html;
      document.getElementById('ngitung-total').innerText = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(total);
      if (window.ngitungCalculateChange) window.ngitungCalculateChange();
      
      const datalist = document.getElementById('ngitung-history-list');
      if (datalist) {
        datalist.innerHTML = window.ngitungHistory.map(name => `<option value="${escapeAttr(name)}">`).join('');
      }
    };

    window.ngitungHideSuggestions = function(id) {
      const sug = document.getElementById(`ngitung-sug-${id}`);
      if (sug) sug.classList.add('hidden');
    };

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.ngitung-row')) {
        document.querySelectorAll('.smart-search-dropdown').forEach(el => el.classList.add('hidden'));
      }
    });

    window.ngitungApplySuggestion = function(id, name, price, category) {
      const row = window.ngitungRows.find(r => r.id === id);
      if (!row) return;
      
      const sug = document.getElementById(`ngitung-sug-${id}`);
      const input = sug ? sug.previousElementSibling : null;
      
      if (input && input.tagName === 'INPUT') {
        if (category && category.toLowerCase() === 'sayur') {
          input.value = `${name} `;
        } else {
          input.value = `${name} ${price}`;
        }
        window.ngitungParseAndUpdate(input, id);
        input.focus();
        setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 50);
      }
      window.ngitungHideSuggestions(id);
    };

    window.ngitungKeydown = function(el, id, e) {
      if (e.key === 'Enter') {
        const sug = document.getElementById(`ngitung-sug-${id}`);
        if (sug && !sug.classList.contains('hidden')) {
          const firstResult = sug.querySelector('.search-result-item');
          if (firstResult) {
            e.preventDefault();
            firstResult.click();
            return;
          }
        }
      }
    };

    window.ngitungShowSuggestions = function(el, id, e) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') return;
      const sug = document.getElementById(`ngitung-sug-${id}`);
      if (!sug) return;
      
      const val = el.value.trim().toLowerCase();
      // Jangan cari jika ada angka (karena user mungkin sedang mengetik jumlah atau harga)
      if (val.length < 2 || /\d/.test(val)) {
        sug.classList.add('hidden');
        return;
      }
      
      const products = window.state?.data?.products || [];
      const results = products.filter(p => p.name.toLowerCase().includes(val)).slice(0, 5);
      
      if (results.length === 0) {
        sug.classList.add('hidden');
        return;
      }
      
      let html = '<div class="smart-search-results"><div class="smart-search-section"><div class="smart-search-section-title" style="padding: 4px 10px;">Saran Barang</div>';
      
      results.forEach((p, idx) => {
        const price = Number(p.salePriceEcer) || Number(p.salePrice) || 0;
        const stock = p.stock || 0;
        const cat = p.category || 'Umum';
        const formattedPrice = new Intl.NumberFormat("id-ID").format(price);
        
        html += `
          <div class="search-result-item" onmousedown="event.preventDefault(); ngitungApplySuggestion(${id}, '${escapeAttr(p.name)}', ${price}, '${escapeAttr(cat)}')" ontouchstart="event.preventDefault(); ngitungApplySuggestion(${id}, '${escapeAttr(p.name)}', ${price}, '${escapeAttr(cat)}')" style="padding: 10px 12px; border-bottom: 1px solid var(--line); cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-radius: 8px; margin-bottom: 2px;" onmouseover="this.style.background='rgba(36,240,199,0.1)'" onmouseout="this.style.background='transparent'">
            <div style="flex:1;">
              <div style="font-weight: 600; font-size: 0.95rem; color: var(--text); display: flex; align-items:center; gap: 8px;">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;background:rgba(36,240,199,0.15);border-radius:6px;font-size:12px;">📦</span>
                ${escapeAttr(p.name)}
              </div>
              <div style="font-size: 0.75rem; color: var(--soft-text); margin-top: 4px; padding-left: 32px;">${escapeAttr(cat)} • Stok: <span style="${stock < 5 ? 'color:var(--orange)' : ''}">${stock}</span></div>
            </div>
            <div style="font-weight: 700; color: var(--green); white-space: nowrap;">Rp ${formattedPrice}</div>
          </div>
        `;
      });
      
      html += '</div></div>';
      sug.innerHTML = html;
      sug.classList.remove('hidden');
      
      // Pastikan dropdown scroll ke atas (terlihat di layar) terutama saat keyboard HP muncul
      setTimeout(() => {
        if (sug && !sug.classList.contains('hidden')) {
          sug.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    };

    window.ngitungParseAndUpdate = function(el, id) {
      const val = el.value;
      const row = window.ngitungRows.find(r => r.id === id);
      if (!row) return;
      row.rawInput = val;
      
      const cleanVal = val.trim();
      let name = cleanVal;
      let price = 0;
      let qty = 1;
      
      const match2 = cleanVal.match(/^(.*?)\s+(\d+)\s+([\d.,]+)$/);
      if (match2) {
        name = match2[1].trim();
        price = Number(match2[2]);
        qty = parseFloat(match2[3].replace(',', '.'));
      } else {
        const match1 = cleanVal.match(/^(.*?)\s+([\d.,]+)$/);
        if (match1) {
          let tempName = match1[1].trim();
          let tempNum = parseFloat(match1[2].replace(',', '.'));
          let prod = window.state?.data?.products?.find(p => p.name.toLowerCase() === tempName.toLowerCase());
          
          if (prod && (prod.category || '').toLowerCase() !== 'sayur' && tempNum < 100) {
             name = tempName;
             qty = tempNum;
             price = Number(prod.salePriceEcer) || Number(prod.salePrice) || 0;
          } else {
             name = tempName;
             price = Number(match1[2].replace(/[^0-9]/g, ''));
             qty = 1;
          }
        } else {
           let prod = window.state?.data?.products?.find(p => p.name.toLowerCase() === cleanVal.toLowerCase());
           if (prod && (prod.category || '').toLowerCase() !== 'sayur') {
              price = Number(prod.salePriceEcer) || Number(prod.salePrice) || 0;
           }
        }
      }
      
      name = name.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      
      // Hitung Diskon Bersyarat (Grosir/Tier)
      let finalPrice = price;
      let matchedProd = window.state?.data?.products?.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (matchedProd && Number(matchedProd.discountMinQty) > 0 && qty >= Number(matchedProd.discountMinQty)) {
          let discVal = Number(matchedProd.discountValue) || 0;
          if (discVal > 0) {
              if (matchedProd.discountType === '%') {
                  finalPrice = price - (price * discVal / 100);
              } else {
                  finalPrice = price - discVal;
              }
              if (finalPrice < 0) finalPrice = 0;
          }
      }
      
      row.name = name;
      row.price = finalPrice;
      row.qty = qty;
      
      const rawAmount = (finalPrice || 0) * (qty || 1);
      const amount = Math.ceil(rawAmount / 500) * 500;
      const parentDiv = el.closest('.ngitung-row');
      if (parentDiv) {
        const amountEl = parentDiv.querySelector('.row-amount');
        if (amountEl) {
          amountEl.innerText = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
        }
      }
      
      const isLastRow = window.ngitungRows[window.ngitungRows.length - 1].id === id;
      if (isLastRow && cleanVal.length > 0) {
        window.ngitungAddRow();
        if (parentDiv) {
           const btn = parentDiv.querySelector('button');
           if (btn) btn.disabled = false;
        }
      }
      
      let sum = 0;
      window.ngitungRows.forEach(r => {
         const rawAmt = (r.price || 0) * (r.qty || 1);
         sum += Math.ceil(rawAmt / 500) * 500;
      });
      const totalEl = document.getElementById('ngitung-total');
      if (totalEl) totalEl.innerText = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(sum);
    };

    window.ngitungFocusNext = function(el, id) {
      const row = window.ngitungRows.find(r => r.id === id);
      if (!row || !row.name || !row.price) return;
      
      if (row.name.trim().length > 1) {
         if (!window.ngitungHistory.includes(row.name)) {
           window.ngitungHistory.push(row.name);
           if (window.ngitungHistory.length > 100) window.ngitungHistory.shift();
           gas('setSetting', { key: 'ngitungHistory', value: JSON.stringify(window.ngitungHistory) });
           const datalist = document.getElementById('ngitung-history-list');
           if (datalist) datalist.innerHTML = window.ngitungHistory.map(n => `<option value="${escapeAttr(n)}">`).join('');
         }
      }
      
      // Focus the next row's input
      const tr = el.closest('.ngitung-row');
      if (tr && tr.nextElementSibling) {
         const nextInput = tr.nextElementSibling.querySelector('input[type="text"]');
         if (nextInput) nextInput.focus();
      }
    };

    window.ngitungVoiceToText = function(text) {
        let t = text.toLowerCase();
        
        t = t.replace(/setengah/gi, '0.5');
        t = t.replace(/seperempat/gi, '0.25');
        
        const map = {
            'nol': 0, 'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5,
            'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10, 'sebelas': 11
        };
        
        for (let k in map) {
            if(k!=='nol'&&k!=='sepuluh'&&k!=='sebelas') {
                t = t.replace(new RegExp('\\b' + k + '\\s+belas\\b', 'gi'), (10 + map[k]));
                t = t.replace(new RegExp('\\b' + k + '\\s+puluh\\b', 'gi'), (map[k] * 10));
            }
        }
        
        for (let k in map) {
            t = t.replace(new RegExp('\\b' + k + '\\b', 'gi'), map[k]);
        }
        
        t = t.replace(/(\d+)\s+0\.(\d+)/g, '$1.$2');
        
        t = t.replace(/(\d+)\s*ribu/gi, (m, p1) => parseInt(p1) * 1000);
        t = t.replace(/(\d+)\s*ratus/gi, (m, p1) => parseInt(p1) * 100);
        t = t.replace(/(\d+)\s*juta/gi, (m, p1) => parseInt(p1) * 1000000);
        
        t = t.replace(/\b(kilo|kg|rupiah|perak)\b/gi, '');
        
        return t.replace(/\s+/g, ' ').trim();
    };

    let html5NgitungScanner = null;
    window.toggleNgitungScanner = function() {
      const container = document.getElementById('ngitung-reader-container');
      if (!container) return;
      haptic([50, 30, 50]);
      
      if (container.style.display === 'none') {
        container.style.display = 'block';
        if (!html5NgitungScanner) {
          html5NgitungScanner = new Html5QrcodeScanner("ngitung-reader", { fps: 10, qrbox: { width: 300, height: 120 }, aspectRatio: 2.0 }, false);
          html5NgitungScanner.render((decodedText) => {
             const matched = state.data.products.find(p => p.barcode === decodedText || p.name === decodedText);
             const prodName = matched ? matched.name : decodedText;
             const prodPrice = matched ? (Number(matched.salePriceEcer) > 0 ? matched.salePriceEcer : matched.salePrice) : 0;
             const parsedVal = `${prodName} ${prodPrice} 1`;
             
             let row = window.ngitungRows.find(r => !r.rawInput || r.rawInput.trim() === '');
             if (!row) {
                window.ngitungAddRow();
                row = window.ngitungRows[window.ngitungRows.length - 1];
             }
             
             const inputEl = document.querySelector(`input[oninput*="${row.id}"]`);
             if (inputEl) {
                inputEl.value = parsedVal;
                window.ngitungParseAndUpdate(inputEl, row.id);
                window.ngitungFocusNext(inputEl, row.id);
             } else {
                row.rawInput = parsedVal;
                window.ngitungRenderTable();
             }
             
             haptic([50, 30, 50]);
             html5NgitungScanner.clear();
             container.style.display = 'none';
             html5NgitungScanner = null;
          }, () => {});
        }
      } else {
        container.style.display = 'none';
        if (html5NgitungScanner) {
          html5NgitungScanner.clear();
          html5NgitungScanner = null;
        }
      }
    };



    window.ngitungAddRow = function() {
      const newId = Date.now();
      window.ngitungRows.push({ id: newId, name: '', price: '', qty: '' });
      const tbody = document.getElementById('ngitung-tbody');
      if (tbody) {
        tbody.insertAdjacentHTML('beforeend', `
          <div class="ngitung-row" style="padding: 6px 0; border-bottom: 1px solid var(--border);">
            <div style="display:flex; align-items:center; width:100%;">
              <div style="position: relative; width: 65%;">
                <input type="text" autocomplete="off" value="" onclick="this.select()" oninput="ngitungShowSuggestions(this, ${newId}, event); ngitungParseAndUpdate(this, ${newId})" onkeydown="ngitungKeydown(this, ${newId}, event)" onchange="ngitungFocusNext(this, ${newId})" placeholder="Cth: Bawang 3000 5" style="width: 100%; font-size: 1.05rem; padding: 12px 10px; border-radius: 8px; margin: 0; border: none; background: var(--field-bg);">
                <div id="ngitung-sug-${newId}" class="smart-search-dropdown hidden" style="width: 140%; min-width: 280px; z-index: 100;"></div>
              </div>
              <div style="width: 27%; text-align: right; font-weight: bold; font-size: 1rem; color: var(--primary); white-space:nowrap; padding: 0 5px; text-overflow: ellipsis; overflow: hidden;" class="row-amount">Rp 0</div>
              <button onclick="ngitungRemoveRow(${newId})" style="width: 8%; background: transparent; border: none; font-size: 1.2rem; color: var(--red); cursor: pointer; padding: 0; text-align: center;">🗑</button>
            </div>
          </div>
        `);
      }
    };

    window.ngitungRenderHistory = async function(filter = 'all') {
      const container = document.getElementById('ngitung-history-ui-container');
      if (!container) return;
      try {
        const historyData = await gas("list", { collection: "ngitungSales" });
        const formatRibuan = (num) => new Intl.NumberFormat('id-ID').format(num);
        const history = filter === 'hutang' ? historyData.filter(trx => trx.status === 'Hutang') : historyData;
        if (history.length === 0) {
          container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">Belum ada riwayat transaksi.</div>';
          return;
        }
        let htmlStr = '';
        history.forEach(trx => {
          const isHutang = trx.status === 'Hutang';
          htmlStr += `
            <div style="background:var(--surface); padding:15px; border-radius:12px; margin-bottom:15px; border-left: 4px solid ${isHutang ? '#e74c3c' : '#2ecc71'};">
              <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <div style="font-size:0.85rem; color:var(--text-muted);">${new Date(trx.date).toLocaleString('id-ID')}</div>
                <div style="font-size:0.85rem; font-weight:bold; color:${isHutang ? '#e74c3c' : '#2ecc71'};">${trx.status}</div>
              </div>
              ${trx.customer_name ? `<div style="font-weight:bold; color:var(--text); margin-bottom:10px;">👤 ${trx.customer_name}</div>` : ''}
              <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span style="color:var(--text-muted);">Total Belanja:</span>
                <span style="font-weight:bold; color:var(--text);">Rp ${formatRibuan(trx.total_amount)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span style="color:var(--text-muted);">${(filter === 'hutang' && trx.installments && trx.installments.length > 0) ? 'Telah Dibayar (Awal):' : 'Telah Dibayar:'}</span>
                <span style="font-weight:bold; color:#2ecc71;">Rp ${formatRibuan((filter === 'hutang' && trx.installments && trx.installments.length > 0) ? (trx.paid_amount - (trx.installments || []).reduce((sum, i) => sum + Number(i.amount), 0)) : trx.paid_amount)}</span>
              </div>
              ${(filter === 'hutang' && trx.installments && trx.installments.length > 0) ? `
                <div style="margin:10px 0; padding:10px; background:var(--background); border-radius:8px; border:1px solid var(--border);">
                  <div style="font-size:0.8rem; font-weight:bold; margin-bottom:5px; color:var(--text-muted);">Riwayat Cicilan:</div>
                  ${trx.installments.map((c, idx) => `
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:3px;">
                      <span style="color:var(--text-muted);">${idx + 1}. ${new Date(c.date).toLocaleString('id-ID')}</span>
                      <span style="font-weight:bold; color:#2ecc71;">+ Rp ${formatRibuan(c.amount)}</span>
                    </div>
                  `).join('')}
                  <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-top:5px; padding-top:5px; border-top:1px dashed var(--border);">
                    <span style="color:var(--text-muted); font-weight:bold;">Total Terbayar Kini:</span>
                    <span style="font-weight:bold; color:#2ecc71;">Rp ${formatRibuan(trx.paid_amount)}</span>
                  </div>
                </div>
              ` : ''}
              ${isHutang ? `
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                  <span style="font-weight:bold; color:#e74c3c;">Sisa Hutang:</span>
                  <span style="font-weight:bold; color:#e74c3c;">Rp ${formatRibuan(trx.total_amount - trx.paid_amount)}</span>
                </div>
              ` : ''}
              
              <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px; border-top:1px dashed var(--border); padding-top:12px;">
                ${isHutang ? `<button onclick="ngitungBayarCicilan(${trx.id})" style="padding:6px 12px; border-radius:6px; border:none; background:var(--primary); color:#fff; font-size:0.8rem; font-weight:bold; cursor:pointer;">💸 Cicil</button>` : ''}
                <button onclick="ngitungReprint(${trx.id}, 'bluetooth')" style="padding:6px 12px; border-radius:6px; border:1px solid var(--border); background:transparent; color:var(--text); cursor:pointer; font-size:0.8rem; font-weight:bold;">🖨️ Thermal</button>
              </div>
            </div>
          `;
        });
        container.innerHTML = htmlStr;
      } catch (e) {
        container.innerHTML = 'Gagal memuat data.';
      }
    };

    window.ngitungReprint = async function(id, method) {
      try {
        const history = await gas("list", { collection: "ngitungSales" });
        const trx = history.find(h => h.id == id);
        if (!trx) return;
        
        const backupRows = [...window.ngitungRows];
        window.ngitungRows = Array.isArray(trx.items) ? trx.items : JSON.parse(trx.items);
        
        const paymentData = {
          status: trx.status,
          customerName: trx.customer_name || '',
          paidAmount: Number(trx.paid_amount),
          totalAmount: Number(trx.total_amount)
        };
        
        if (method === 'pdf') window.ngitungPrintPDF(paymentData);
        else if (method === 'bluetooth') await window.ngitungPrintBluetooth(paymentData);
        else if (method === 'wa') window.ngitungSendWA(paymentData);
        
        window.ngitungRows = backupRows;
      } catch (err) {
        alert("Gagal memuat data transaksi: " + err.message);
      }
    };

    window.ngitungBayarCicilan = async function(id) {
      const nominalStr = prompt('Masukkan nominal cicilan yang dibayarkan sekarang:');
      if (!nominalStr) return;
      const nominal = Number(nominalStr.replace(/[^0-9]/g, ''));
      if (nominal <= 0) return;
      
      try {
        const history = await gas("list", { collection: "ngitungSales" });
        const trx = history.find(h => h.id == id);
        if (!trx) return;
        
        trx.paid_amount = Number(trx.paid_amount) + nominal;
        if (trx.paid_amount >= trx.total_amount) {
          trx.status = 'Lunas';
        }
        trx.installments = trx.installments || [];
        trx.installments.push({ date: new Date().toISOString(), amount: nominal });
        
        await gas("update", { collection: "ngitungSales", id: trx.id, item: { ...trx, totalAmount: trx.total_amount, paidAmount: trx.paid_amount, customerName: trx.customer_name } });
        alert('Cicilan berhasil dibayarkan!');
        window.ngitungRenderHistory();
      } catch (e) {
        alert('Gagal memproses cicilan: ' + e.message);
      }
    };

    window.ngitungCalculateChange = function() {
      const totalText = document.getElementById('ngitung-total').textContent;
      const total = Number(totalText.replace(/[^0-9]/g, ''));
      const paidVal = document.getElementById('ngitung-payment-paid').value;
      const paid = Number(paidVal.replace(/[^0-9]/g, '')) || 0;
      const formatRibuan = (num) => new Intl.NumberFormat('id-ID').format(num);
      
      if (paid >= total) {
         document.getElementById('ngitung-payment-change-container').style.display = 'block';
         document.getElementById('ngitung-payment-debt-container').style.display = 'none';
         document.getElementById('ngitung-payment-customer-container').style.display = 'none';
         document.getElementById('ngitung-payment-change-label').textContent = 'Rp ' + formatRibuan(paid - total);
      } else {
         document.getElementById('ngitung-payment-change-container').style.display = 'none';
         document.getElementById('ngitung-payment-debt-container').style.display = 'block';
         document.getElementById('ngitung-payment-customer-container').style.display = 'block';
         document.getElementById('ngitung-payment-debt-label').textContent = 'Rp ' + formatRibuan(total - paid);
      }
    };

    window.ngitungProcessCheckout = function(method) {
      if (window.ngitungRows.length <= 1) {
        alert("Belum ada data belanjaan!");
        return;
      }
      let modal = document.getElementById('ngitung-payment-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ngitung-payment-modal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; justify-content:center; align-items:center; padding:20px;';
        modal.innerHTML = `
          <div style="background:var(--bg); width:100%; max-width:400px; border-radius:16px; padding:24px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
            <h3 style="margin-top:0; color:var(--text); text-align:center;">Proses Pembayaran</h3>
            <div style="margin-bottom:15px;">
              <label style="display:block; color:var(--text-muted); font-size:0.85rem; margin-bottom:5px;">Total Tagihan</label>
              <div id="ngitung-payment-total-label" style="font-size:1.8rem; font-weight:bold; color:var(--primary);">Rp 0</div>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; color:var(--text-muted); font-size:0.85rem; margin-bottom:5px;">Dibayar (Tunai)</label>
              <input type="tel" id="ngitung-payment-paid" placeholder="Masukkan jumlah uang..." style="width:100%; padding:14px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:1.2rem; font-weight:bold;" oninput="ngitungCalculateChange()">
            </div>
            <div id="ngitung-payment-change-container" style="margin-bottom:15px; padding:12px; border-radius:8px; background:rgba(46, 204, 113, 0.1); border:1px solid rgba(46, 204, 113, 0.3);">
              <label style="display:block; color:var(--text-muted); font-size:0.85rem; margin-bottom:5px;">Kembalian</label>
              <div id="ngitung-payment-change-label" style="font-size:1.3rem; font-weight:bold; color:#2ecc71;">Rp 0</div>
            </div>
            <div id="ngitung-payment-debt-container" style="margin-bottom:15px; display:none; padding:12px; border-radius:8px; background:rgba(231, 76, 60, 0.1); border:1px solid rgba(231, 76, 60, 0.3);">
              <label style="display:block; color:var(--text-muted); font-size:0.85rem; margin-bottom:5px;">Sisa Hutang</label>
              <div id="ngitung-payment-debt-label" style="font-size:1.3rem; font-weight:bold; color:#e74c3c;">Rp 0</div>
            </div>
            <div id="ngitung-payment-customer-container" style="margin-bottom:20px; display:none;">
              <label style="display:block; color:var(--text-muted); font-size:0.85rem; margin-bottom:5px;">Nama Pelanggan (Hutang)</label>
              <input type="text" id="ngitung-payment-customer" placeholder="Nama yang berhutang..." style="width:100%; padding:14px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:1rem;">
            </div>
            <div style="display:flex; gap:10px;">
              <button onclick="document.getElementById('ngitung-payment-modal').style.display='none'" style="flex:1; padding:14px; border-radius:8px; border:1px solid var(--border); background:transparent; color:var(--text); font-weight:bold; cursor:pointer;">Batal</button>
              <button id="ngitung-payment-submit" style="flex:2; padding:14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-weight:bold; cursor:pointer;">Simpan & Cetak</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }
      
      const totalText = document.getElementById('ngitung-total').textContent;
      document.getElementById('ngitung-payment-total-label').textContent = totalText;
      document.getElementById('ngitung-payment-paid').value = totalText.replace(/[^0-9]/g, '');
      document.getElementById('ngitung-payment-customer').value = '';
      window.ngitungCalculateChange();
      
      modal.style.display = 'flex';
      
      const submitBtn = document.getElementById('ngitung-payment-submit');
      submitBtn.onclick = async function() {
        const total = Number(totalText.replace(/[^0-9]/g, ''));
        const paid = Number(document.getElementById('ngitung-payment-paid').value.replace(/[^0-9]/g, '')) || 0;
        const customerName = document.getElementById('ngitung-payment-customer').value;
        const status = paid >= total ? 'Lunas' : 'Hutang';
        
        if (status === 'Hutang' && !customerName.trim()) {
          alert("Nama pelanggan wajib diisi untuk transaksi hutang!");
          return;
        }
        
        submitBtn.textContent = 'Menyimpan...';
        
        const payload = {
          date: new Date(),
          customerName: customerName.trim(),
          totalAmount: total,
          paidAmount: paid,
          status: status,
          items: window.ngitungRows.filter(r => r.name || r.price)
        };
        
        try {
          await gas("add", { collection: "ngitungSales", item: payload });
        } catch(e) {
          console.error(e);
        }
        
        submitBtn.textContent = 'Simpan & Cetak';
        modal.style.display = 'none';
        
        if (method === 'pdf') window.ngitungPrintPDF(payload);
        else if (method === 'bluetooth') window.ngitungPrintBluetooth(payload);
        else if (method === 'wa') window.ngitungSendWA(payload);
      };
    };

    window.ngitungRemoveRow = function(id) {
      if (window.ngitungRows.length <= 1) return;
      window.ngitungRows = window.ngitungRows.filter(r => r.id !== id);
      window.ngitungRenderTable();
    };

    window.ngitungSendWA = function(paymentData) {
      if (window.ngitungRows.length <= 1) {
        alert("Belum ada data belanjaan!");
        return;
      }
      const formatRibuan = (num) => new Intl.NumberFormat('id-ID').format(num);
      let text = "🛒 *NOTA BELANJA*\n----------------------------------\n";
      let total = 0;
      window.ngitungRows.forEach(row => {
        if (!row.name && !row.price) return;
        const qty = Number(String(row.qty).replace(/[^0-9-.]/g, '')) || 1;
        const price = Number(String(row.price).replace(/[^0-9-]/g, '')) || 0;
        const rawAmount = row.price ? price * qty : 0;
        const amount = Math.ceil(rawAmount / 500) * 500;
        total += amount;
        text += `• ${row.name}\n  ${qty} x Rp ${formatRibuan(price)} = *Rp ${formatRibuan(amount)}*\n`;
      });
      text += "----------------------------------\n";
      text += `*TOTAL: Rp ${formatRibuan(total)}*\n`;
      if (paymentData) {
        text += "----------------------------------\n";
        if (paymentData.status === 'Hutang') {
          text += `STATUS: BELUM LUNAS (Hutang)\n`;
          text += `Nama Pelanggan: ${paymentData.customerName}\n`;
          text += `Telah Dibayar: Rp ${formatRibuan(paymentData.paidAmount)}\n`;
          text += `Sisa Hutang: Rp ${formatRibuan(paymentData.totalAmount - paymentData.paidAmount)}\n`;
        } else {
          text += `STATUS: LUNAS\n`;
          text += `Telah Dibayar: Rp ${formatRibuan(paymentData.paidAmount)}\n`;
          text += `Kembali: Rp ${formatRibuan(paymentData.paidAmount - paymentData.totalAmount)}\n`;
        }
      }
      text += `\nTerima kasih atas kunjungan Anda!`;
      
      const waLink = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waLink, '_blank');
    };

    window.ngitungPrintPDF = function(paymentData) {
      if (window.ngitungRows.length <= 1) {
        alert("Belum ada data belanjaan!");
        return;
      }
      const formatRibuan = (num) => new Intl.NumberFormat('id-ID').format(num);
      let html = `<html><head><title>Nota Belanja</title>
        <style>
          @page { size: 58mm 150mm; margin: 0; }
          body { font-family: 'Courier New', Courier, monospace; padding: 4mm; font-size: 12px; width: 50mm; margin: 0 auto; color: #000; background: #fff; }
          .center { text-align: center; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 3px 0; vertical-align: top; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
        </style></head><body>
        <div class="center">
          <h2 style="margin:0;">Toko GARNETA</h2>
          <div style="margin-bottom:10px;">085123871118</div>
          <div>Tgl: ${new Date().toLocaleString('id-ID')}</div>
        </div>
        <div class="line"></div>
        <table>`;
      
      let total = 0;
      window.ngitungRows.forEach(row => {
        if (!row.name && !row.price) return;
        const qty = Number(String(row.qty).replace(/[^0-9-.]/g, '')) || 1;
        const price = Number(String(row.price).replace(/[^0-9-]/g, '')) || 0;
        const rawAmount = row.price ? price * qty : 0;
        const amount = Math.ceil(rawAmount / 500) * 500;
        total += amount;
        
        html += `<tr><td colspan="2">${row.name}</td></tr>
                 <tr><td>${qty} x ${formatRibuan(price)}</td><td class="right">${formatRibuan(amount)}</td></tr>`;
      });
      
      html += `</table>
        <div class="line"></div>
        <div style="display:flex; justify-content:space-between;" class="bold"><span>TOTAL:</span><span>Rp ${formatRibuan(total)}</span></div>`;
        
      if (paymentData) {
        html += `<div class="line"></div>`;
        if (paymentData.status === 'Hutang') {
           html += `<div style="display:flex; justify-content:space-between;"><span>Status:</span><span class="bold">HUTANG</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>Pelanggan:</span><span>${paymentData.customerName}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>Dibayar:</span><span>Rp ${formatRibuan(paymentData.paidAmount)}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>Sisa:</span><span class="bold">Rp ${formatRibuan(paymentData.totalAmount - paymentData.paidAmount)}</span></div>`;
        } else {
           html += `<div style="display:flex; justify-content:space-between;"><span>Status:</span><span class="bold">LUNAS</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>Dibayar:</span><span>Rp ${formatRibuan(paymentData.paidAmount)}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>Kembali:</span><span>Rp ${formatRibuan(paymentData.paidAmount - paymentData.totalAmount)}</span></div>`;
        }
      }
      
      html += `<div class="center" style="margin-top:20px;">
          Terima kasih atas<br>kunjungan Anda!
        </div>
        </body></html>`;
        
      let printFrame = document.getElementById('print-frame');
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'print-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '58mm';
        printFrame.style.height = '100vh';
        printFrame.style.opacity = '0';
        printFrame.style.pointerEvents = 'none';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
      }
      
      printFrame.contentWindow.document.open();
      printFrame.contentWindow.document.write(html);
      printFrame.contentWindow.document.close();
      
      setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      }, 500);
    };

    window.ngitungPrintBluetooth = async function(paymentData) {
        try {
          const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
              '000018f0-0000-1000-8000-00805f9b34fb',
              'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
              '49535343-fe7d-4ae5-8fa9-9fafd205e455',
              '000018f0-0000-1000-8000-00805f9b34fb'.replace('18f0', '18f0') // standard
            ]
          });
  
          const server = await device.gatt.connect();
          
          let service, characteristic;
          const serviceUUIDs = [
              { svc: '000018f0-0000-1000-8000-00805f9b34fb', char: '00002af1-0000-1000-8000-00805f9b34fb' }, // Standard
              { svc: '49535343-fe7d-4ae5-8fa9-9fafd205e455', char: '49535343-8841-43f4-a8d4-ecbe34729bb3' }, // Printer China generic
              { svc: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', char: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' }  // Epson/Star
          ];

          for (const s of serviceUUIDs) {
              try {
                  service = await server.getPrimaryService(s.svc);
                  characteristic = await service.getCharacteristic(s.char);
                  if (characteristic) break;
              } catch(e) { }
          }
          
          if (!characteristic) throw new Error("Sistem mengenali perangkat Bluetooth, tapi tidak menemukan service Print. Pastikan ini adalah Printer Thermal.");
          let encoder = new TextEncoder();
        const formatRibuan = (num) => new Intl.NumberFormat('id-ID').format(Number(String(num).replace(/[^0-9-]/g, '')) || 0);
          const formatLine = (left, right) => {
            const leftStr = String(left);
            const rightStr = formatRibuan(right);
            let spaceCount = 32 - leftStr.length - rightStr.length;
            if (spaceCount < 1) spaceCount = 1;
            return leftStr + ' '.repeat(spaceCount) + rightStr + '\n';
          };

          let data = [
            0x1b, 0x40, // init
            0x1b, 0x61, 0x01, // Center align
            0x1d, 0x21, 0x11, // Double size
            ...encoder.encode('Toko GARNETA\n'),
            0x1d, 0x21, 0x00, // Normal size
            ...encoder.encode('085123871118\n\n'),
            0x1b, 0x61, 0x00, // Left align
            ...encoder.encode('Tgl: ' + new Date().toLocaleString('id-ID') + '\n'),
            ...encoder.encode('--------------------------------\n')
          ];
          
          let total = 0;
          window.ngitungRows.forEach(row => {
            if (!row.name && !row.price) return;
            const qty = Number(String(row.qty).replace(/[^0-9-.]/g, '')) || 1;
            const price = Number(String(row.price).replace(/[^0-9-]/g, '')) || 0;
            const rawAmount = row.price ? price * qty : 0;
            const amount = Math.ceil(rawAmount / 500) * 500;
            total += amount;
            
            data.push(...encoder.encode(row.name + '\n'));
            data.push(...encoder.encode(formatLine(qty + " x " + formatRibuan(price), amount)));
          });
          
          data.push(...encoder.encode('--------------------------------\n'));
          data.push(...encoder.encode(formatLine('TOTAL:', total) + '\n'));
          
          if (paymentData) {
            data.push(...encoder.encode('--------------------------------\n'));
            if (paymentData.status === 'Hutang') {
              data.push(...encoder.encode(formatLine('Status:', 'HUTANG')));
              data.push(...encoder.encode(formatLine('Pelanggan:', paymentData.customerName)));
              data.push(...encoder.encode(formatLine('Dibayar:', paymentData.paidAmount)));
              data.push(...encoder.encode(formatLine('Sisa:', paymentData.totalAmount - paymentData.paidAmount) + '\n'));
            } else {
              data.push(...encoder.encode(formatLine('Status:', 'LUNAS')));
              data.push(...encoder.encode(formatLine('Dibayar:', paymentData.paidAmount)));
              data.push(...encoder.encode(formatLine('Kembali:', paymentData.paidAmount - paymentData.totalAmount) + '\n'));
            }
          }
          
          data.push(0x1b, 0x61, 0x01); // Center align
          data.push(...encoder.encode('\nTerima kasih atas\n'));
          data.push(...encoder.encode('kunjungan Anda!\n\n\n'));
          data.push(0x1b, 0x61, 0x00); // Left align
        
        let buffer = new Uint8Array(data);
        for (let i = 0; i < buffer.length; i += 512) {
          await characteristic.writeValue(buffer.slice(i, i + 512));
        }
        
        // Putuskan koneksi agar HP lain bisa gantian ngeprint
        if (device.gatt.connected) {
          device.gatt.disconnect();
        }
        
        alert("Berhasil mencetak!");
      } catch (error) {
        console.error(error);
        alert("Gagal koneksi ke printer Bluetooth: " + error.message);
      }
    };

    
      window.ngitungPrintUSB = function() {
        if (window.ngitungRows.length <= 1) {
            alert("Belum ada data belanjaan!");
            return;
        }

        let total = 0;
        let itemsHtml = window.ngitungRows.map(row => {
          if (!row.name && !row.price) return '';
          const qty = Number(String(row.qty).replace(/[^0-9-.]/g, '')) || 1;
          const price = Number(String(row.price).replace(/[^0-9-]/g, '')) || 0;
          const rawAmount = row.price ? price * qty : 0;
          const amount = Math.ceil(rawAmount / 500) * 500;
          total += amount;
          return `
            <div class="item-row">
              <div class="item-name">${row.name}</div>
              <div class="item-details">
                <span>${qty} x ${rupiah(price)}</span>
                <span>${rupiah(amount)}</span>
              </div>
            </div>
          `;
        }).join('');

        const receiptHtml = `
          <html>
            <head>
              <title>Cetak Struk</title>
              <style>
                @page { margin: 0; }
                body {
                  font-family: Arial, Helvetica, sans-serif; /* Font sans-serif jauh lebih jelas untuk printer thermal */
                  width: 44mm; /* Dipersempit agar tidak terpotong di margin kanan kertas 57mm */
                  margin: 0; /* Rata kiri */
                  padding: 0 4mm 0 0; /* Tarik teks dari kanan sedikit */
                  box-sizing: border-box;
                  font-size: 13px;
                  font-weight: 600; /* Ditebalkan agar tidak putus-putus */
                  color: #000000 !important; /* Wajib hitam pekat */
                  background: #fff;
                  line-height: 1.3;
                }
                .header { text-align: center; margin-bottom: 15px; }
                .header h2 { margin: 0 0 5px 0; font-size: 18px; font-weight: 900; color: #000000 !important; }
                .header div { font-weight: bold; color: #000000 !important; font-size: 12px; }
                .divider { border-top: 2px dashed #000000; margin: 10px 0; }
                .item-row { margin-bottom: 6px; }
                .item-name { font-weight: 900; font-size: 14px; color: #000000 !important; }
                .item-details { display: flex; justify-content: space-between; font-weight: bold; color: #000000 !important; }
                .total-section { display: flex; justify-content: space-between; font-weight: 900; font-size: 16px; margin-top: 10px; color: #000000 !important; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; font-weight: bold; color: #000000 !important; }
                * { color: #000000 !important; } /* Paksa semua elemen menjadi hitam pekat */
              </style>
            </head>
            <body>
              <div class="header">
                <h2 style="font-size: 22px; font-weight: 900; margin-bottom: 2px;">Toko GARNETA</h2>
                <div style="font-size: 14px; margin-bottom: 5px;">085123871118</div>
                <div>${new Date().toLocaleString('id-ID')}</div>
              </div>
              <div class="divider"></div>
              ${itemsHtml}
              <div class="divider"></div>
              <div class="total-section">
                <span>TOTAL</span>
                <span>${rupiah(total)}</span>
              </div>
              <div class="footer">
                Terima kasih atas<br>kunjungan Anda!
              </div>
              
                window.onload = function() {
                  window.print();
                  setTimeout(() => window.close(), 500);
                };
              <\/script>
            </body>
          </html>
        `;

        const printWindow = window.open("", "_blank", "width=300,height=500");
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
      };

      window.ngitungCalculateChange = function() {
        const paidInput = document.getElementById("ngitung-payment-paid");
        const changeDiv = document.getElementById("ngitung-payment-change");
        if(!paidInput || !changeDiv) return;
        
        let paidVal = paidInput.value.replace(/[^0-9]/g, '');
        if(paidVal) {
          paidInput.value = new Intl.NumberFormat('id-ID').format(paidVal);
        }
        
        const totalText = document.getElementById("ngitung-total").innerText.replace(/[^0-9]/g, '');
        const total = parseInt(totalText) || 0;
        const paid = parseInt(paidVal) || 0;
        
        if (!paid || paid === 0) {
          changeDiv.innerText = 'Kembali -';
          changeDiv.style.color = 'var(--text-muted)';
          return;
        }
        
        const diff = paid - total;
        if(diff < 0) {
          changeDiv.innerText = 'Kurang Rp ' + new Intl.NumberFormat('id-ID').format(Math.abs(diff));
          changeDiv.style.color = '#e74c3c';
        } else {
          changeDiv.innerText = 'Kembali Rp ' + new Intl.NumberFormat('id-ID').format(diff);
          changeDiv.style.color = '#2ecc71';
        }
      };

      window.ngitungClearAll = function() {
        window.ngitungRows = [{ id: Date.now(), name: '', price: '', qty: '' }];
        window.ngitungRenderTable();
        
        const paidInput = document.getElementById("ngitung-payment-paid");
        if(paidInput) paidInput.value = "";
        
        const customerInput = document.getElementById("ngitung-payment-customer");
        if(customerInput) customerInput.value = "";
        
        if(window.ngitungCalculateChange) window.ngitungCalculateChange();
      };

      function ngitung() {
        setTimeout(() => window.ngitungRenderTable(), 50);
        return `
          <style>
            /* FOCUS MODE: Sembunyikan menu nav atas saat di kasir */
            #nav { display: none !important; }
            .topbar { min-height: 0; padding-bottom: 0; }
          </style>
          <div style="max-width: 800px; margin: 0 auto; width: 100%; padding: 10px 5px;">
            <div style="margin-bottom:12px; display:flex; justify-content:flex-end;">
              <button onclick="toggleNgitungScanner()" style="padding:6px 12px; border-radius:6px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-weight:bold; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; gap:6px;">📷 Barcode</button>
            </div>
            
            <div id="ngitung-reader-container" style="display:none; width:100%; background:#000; border-radius:12px; overflow:hidden; margin-bottom:15px; max-width:400px; margin-left:auto; margin-right:auto;">
              <div id="ngitung-reader" style="width: 100%;"></div>
            </div>
          
          <div id="ngitung-tbody" style="display:flex; flex-direction:column;">
          </div>
          
          <div style="padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.2); margin-top: 10px;">
            <!-- Simple Summary -->
            <div id="ngitung-checkout-trigger" style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:bold; margin-bottom:2px;">TOTAL BELANJA</div>
                <div id="ngitung-total" style="font-size:1.4rem; color:var(--primary); font-weight:bold; line-height:1;">Rp 0</div>
              </div>
              <button onclick="document.getElementById('ngitung-checkout-panel').style.display='block'; this.style.display='none'; document.getElementById('ngitung-checkout-close').style.display='block';" style="padding:10px 20px; border-radius:8px; background:var(--primary); color:#fff; font-weight:bold; font-size:1rem; border:none; cursor:pointer; display:flex; align-items:center; gap:8px;">BAYAR ➔</button>
              <button id="ngitung-checkout-close" onclick="document.getElementById('ngitung-checkout-panel').style.display='none'; this.style.display='none'; document.getElementById('ngitung-checkout-trigger').querySelector('button').style.display='flex';" style="display:none; padding:8px 12px; border-radius:8px; background:transparent; border:1px solid rgba(255,255,255,0.1); color:var(--text); font-weight:bold; font-size:0.9rem; cursor:pointer;">❌ Batal</button>
            </div>
            
            <!-- Hidden Checkout Panel (Bottom Sheet Style) -->
            <div id="ngitung-checkout-panel" style="display:none; margin-top:15px; padding-top:15px; border-top:1px dashed rgba(255,255,255,0.1);">
              <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; margin-bottom:6px;">
                <input type="text" id="ngitung-payment-paid" oninput="window.ngitungCalculateChange()" placeholder="Dibayar (Rp)" style="width:100%; padding:8px; border-radius:6px; border:none; background:rgba(255,255,255,0.08); color:var(--text); font-size:1rem; font-weight:bold; text-align:center; outline:none; box-sizing:border-box;">
                <div id="ngitung-payment-change" style="width:100%; padding:8px; border-radius:6px; border:none; background:rgba(255,255,255,0.03); font-size:1rem; font-weight:bold; text-align:center; color:var(--text-muted); box-sizing:border-box; display:flex; align-items:center; justify-content:center;">Kembali -</div>
              </div>
              
              <div style="display:flex; gap:6px; align-items:stretch; margin-bottom:10px;">
                <input type="text" id="ngitung-payment-customer" placeholder="Nama Pelanggan (Opsional)" style="flex:1; padding:8px; border-radius:6px; border:none; background:rgba(255,255,255,0.05); color:var(--text); font-size:0.9rem; outline:none; box-sizing:border-box;">
                <button onclick="ngitungClearAll()" style="padding:0 12px; border-radius:6px; border:1px solid rgba(231,76,60,0.3); background:rgba(231,76,60,0.1); color:var(--red); font-weight:bold; font-size:0.8rem; cursor:pointer; white-space:nowrap; box-sizing:border-box; display:flex; align-items:center; justify-content:center;">🗑 Bersihkan</button>
              </div>
              
              <div style="display:flex; gap:6px; margin-bottom:0px; align-items:stretch;">
                <button onclick="window.ngitungPrintPDF()" style="padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.15); background:transparent; color:var(--text); font-weight:bold; font-size:0.85rem; cursor:pointer; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:4px;">📄 PDF</button>
                <button onclick="window.ngitungSendWA()" style="padding:10px; border-radius:6px; border:1px solid rgba(46,204,113,0.3); background:rgba(46,204,113,0.1); color:#2ecc71; font-weight:bold; font-size:0.85rem; cursor:pointer; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:4px;">💬 WA</button>
                <button onclick="window.ngitungPrintBluetooth()" style="flex:1; padding:10px; border-radius:6px; border:none; background:var(--primary); color:#fff; font-weight:bold; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 4px 12px rgba(0,255,204,0.2);">🖨️ Cetak</button>
              </div>
            </div>
          </div>
        </div>`;
      }
      
      function riwayatNgitung() {
        setTimeout(() => { if(window.ngitungRenderHistory) window.ngitungRenderHistory('all'); }, 50);
        return `
          <div style="max-width: 800px; margin: 0 auto; width: 100%; padding: 10px 5px;">
            <h2 style="margin-bottom:20px;">🕒 Riwayat Transaksi</h2>
            <div id="ngitung-history-ui-container">Memuat riwayat...</div>
          </div>
        `;
      }

      function hutangNgitung() {
        setTimeout(() => { if(window.ngitungRenderHistory) window.ngitungRenderHistory('hutang'); }, 50);
        return `
          <div style="max-width: 800px; margin: 0 auto; width: 100%; padding: 10px 5px;">
            <h2 style="margin-bottom:20px;">💸 Daftar Hutang</h2>
            <div id="ngitung-history-ui-container">Memuat hutang...</div>
          </div>
        `;
      }

    function kalkulator() {
      const rows = shoppingRows();
      const total = rows.reduce((sum, row) => sum + shoppingSubtotal(row), 0);
      
      const workspaces = [
        { id: 'form', icon: '🧮', label: 'Form' },
        { id: 'ai-input', icon: '🎤', label: 'AI Input' },
        { id: 'wa', icon: '📋', label: 'Copy WA' },
        { id: 'list', icon: '🛒', label: 'Daftar' }
      ];
      
      const activeWorkspace = window.kalkulatorWorkspace || 'list';
      
      const toolbar = `<div class="workspace-toolbar">
        ${workspaces.map(ws => `
          <button class="workspace-tab ${activeWorkspace === ws.id ? 'active' : ''}" 
                  onclick="switchKalkulatorWorkspace('${ws.id}')">
            <span class="workspace-icon">${ws.icon}</span>
            <span class="workspace-label">${ws.label}</span>
          </button>
        `).join('')}
      </div>`;
      
      let workspaceContent = '';
      switch(activeWorkspace) {
        case 'form':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>🧮 Form Kalkulator</h3>
              <form id="shopping-form" class="grid forms">
                ${hiddenId()}
                <label>Nama Barang<input name="name" list="shopping-products" required placeholder="Contoh: Beras Premium"></label>
                <datalist id="shopping-products">${state.data.products.map((p) => `<option value="${p.name}"></option>`).join("")}</datalist>
                ${input("qty", "Banyak Beli", true, "number")}
                ${input("amount", "Harga Dasar", false, "number")}
                ${formButtons()}
              </form>
            </div>
          </div>`;
          break;
        case 'ai-input':
          workspaceContent = `<div class="workspace-content">
            ${window.generateAIInputPanel ? window.generateAIInputPanel('kalkulator') : '<div class="card"><p>AI Input Center loading...</p></div>'}
          </div>`;
          // Initialize AI Input Center after render
          setTimeout(() => {
            if (window.initAIInputCenter) window.initAIInputCenter();
          }, 100);
          break;
        case 'wa':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📋 Copy Paste dari WA</h3>
              <label>Daftar Belanja
                <textarea id="shopping-wa-text" class="input-area expandable" placeholder="Contoh:
Payung 5
Gula Pasir 2
Beras Premium 1"></textarea>
              </label>
              <div class="actions" style="grid-column: 1 / -1; position:sticky; bottom:-16px; background:var(--card-bg); padding:16px; margin: 16px -16px -16px -16px; border-top:1px solid rgba(255,255,255,0.05); z-index:10; display:flex; justify-content:flex-end; gap:8px; border-radius:0 0 16px 16px; box-shadow:0 -20px 40px rgba(0,0,0,0.3); backdrop-filter:blur(10px);">
                <button class="btn danger" id="clear-shopping" style="padding:12px 16px;">Kosongkan</button>
                <button class="btn primary" id="parse-shopping-wa" style="flex:1; font-size:1.1rem; padding:12px 16px; box-shadow:0 4px 12px rgba(0,255,204,0.3);">💾 Proses Paste WA</button>
              </div>
            </div>
          </div>`;
          break;
        case 'list':
        default:
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>🛒 Daftar Belanja - Total: ${rupiah(total)}</h3>
              ${shoppingTable(rows)}
            </div>
          </div>`;
      }
      
      return `<section class="barang-workspace">
        ${toolbar}
        ${workspaceContent}
      </section>`;
    }

    // Workspace state for Penjualan page
    window.penjualanWorkspace = localStorage.getItem('penjualanWorkspace') || 'list';
    
    function switchPenjualanWorkspace(workspace) {
      window.penjualanWorkspace = workspace;
      localStorage.setItem('penjualanWorkspace', workspace);
      render();
    }
    
    function penjualan() {
      const workspaces = [
        { id: 'pos', icon: '🛒', label: 'Mesin Kasir (POS)' },
        { id: 'list', icon: '📅', label: 'Riwayat Transaksi' }
      ];
      
      const activeWorkspace = window.penjualanWorkspace || 'pos';
      
      const toolbar = `<div class="workspace-toolbar">
        ${workspaces.map(ws => `
          <button class="workspace-tab ${activeWorkspace === ws.id ? 'active' : ''}" 
                  onclick="switchPenjualanWorkspace('${ws.id}')">
            <span class="workspace-icon">${ws.icon}</span>
            <span class="workspace-label">${ws.label}</span>
          </button>
        `).join('')}
      </div>`;
      
      let workspaceContent = '';
      if (activeWorkspace === 'pos') {
        const rows = posRows();
        const totalCuan = rows.reduce((acc, row) => acc + Number(row.cuan || 0), 0);
        workspaceContent = `<div class="workspace-content">
          <div class="card">
            <h3>🛒 Mesin Kasir (POS)</h3>
            ${saleForm()}
          </div>
          <div class="card">
            <h3>Keranjang Penjualan${isSuperAdmin() ? ` - Total Cuan: <span style="color:#10b981;">${rupiah(totalCuan)}</span>` : ''}</h3>
            ${posTable(rows)}
            <div class="actions" style="grid-column: 1 / -1; position:sticky; bottom:-16px; background:var(--card-bg); padding:16px; margin: 16px -16px -16px -16px; border-top:1px solid rgba(255,255,255,0.05); z-index:10; display:flex; justify-content:flex-end; gap:8px; border-radius:0 0 16px 16px; box-shadow:0 -20px 40px rgba(0,0,0,0.3); backdrop-filter:blur(10px);">
              <button class="btn primary" id="save-pos" style="flex:1; font-size:1.1rem; padding:12px 16px; box-shadow:0 4px 12px rgba(0,255,204,0.3);">💾 Simpan Semua Transaksi</button>
            </div>
          </div>
        </div>`;
      } else {
        workspaceContent = `<div class="workspace-content">
          <div class="card">
            <h3>Riwayat Penjualan</h3>
            ${saleRows()}
          </div>
        </div>`;
      }
      
      return `<section class="barang-workspace">
        ${toolbar}
        ${workspaceContent}
      </section>`;
    }

    function laporan() {
      const rows = dailySales();
      
      // Hitung total bulan ini
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
      const monthlyProfit = rows
        .filter(row => row.date.startsWith(currentMonth))
        .reduce((sum, row) => sum + row.profit, 0);

      // Render Expandable Table
      const tableHTML = `<div class="table-wrap">
        <table class="expandable-table">
          <thead>
            <tr>
              <th style="width:50px"></th>
              <th>TANGGAL</th>
              <th style="text-align:right">KEUNTUNGAN</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, i) => `
              <tr class="expandable-row" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.arrow').classList.toggle('open');">
                <td style="text-align:center"><span class="arrow" style="display:inline-block; transition:transform 0.2s;">▼</span></td>
                <td style="font-weight:bold">${row.date}</td>
                <td style="text-align:right; font-weight:bold; color:${row.profit >= 0 ? '#10b981' : '#f43f5e'}">${rupiah(row.profit)}</td>
              </tr>
              <tr class="details-row hidden" style="background:var(--bg); border-bottom:2px solid var(--border);">
                <td colspan="3" style="padding:1rem;">
                  <table style="width:100%; margin:0; background:var(--card); box-shadow:none; border:1px solid var(--border);">
                    <thead>
                      <tr>
                        <th style="font-size:0.8rem; padding:0.5rem">Jam</th>
                        <th style="font-size:0.8rem; padding:0.5rem">Barang</th>
                        <th style="font-size:0.8rem; padding:0.5rem">Unit</th>
                        ${isSuperAdmin() ? '<th style="font-size:0.8rem; padding:0.5rem; text-align:right">Cuan</th>' : ''}
                        <th style="font-size:0.8rem; padding:0.5rem; text-align:center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${row.items.map(item => `
                        <tr>
                          <td style="font-size:0.9rem; padding:0.5rem">${new Date(item.date).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</td>
                          <td style="font-size:0.9rem; padding:0.5rem">${escapeAttr(item.productName)}</td>
                          <td style="font-size:0.9rem; padding:0.5rem">${item.unitSold}</td>
                          ${isSuperAdmin() ? `<td style="font-size:0.9rem; padding:0.5rem; text-align:right; color:${item.cuan >= 0 ? '#10b981' : '#f43f5e'}">${rupiah(item.cuan)}</td>` : ''}
                          <td style="font-size:0.9rem; padding:0.5rem; text-align:center">
                            <button class="btn danger small" onclick="deleteSale('${item.id}')" style="padding:0.25rem 0.5rem; font-size:0.8rem">Hapus</button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;

      return `<section class="grid">
        <div class="card" style="grid-column: 1 / -1; background: linear-gradient(135deg, #1e293b, #0f172a); border-left: 4px solid #10b981;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h3 style="margin:0; color:var(--text-muted); font-size:1rem;">Total Keuntungan Bulan Ini</h3>
              <p style="margin:0; font-size:0.9rem; color:var(--text-muted);">Periode: ${new Date().toLocaleDateString('id-ID', {month:'long', year:'numeric'})}</p>
            </div>
            <h2 style="margin:0; color:#10b981; font-size:2rem;">${rupiah(monthlyProfit)}</h2>
          </div>
        </div>
        
        <div class="card">
          <h2>Laporan Penjualan Harian</h2>
          ${tableHTML}
        </div>
        
        <div class="card">
          <h2>Grafik Keuntungan (30 Hari Terakhir)</h2>
          ${barChart(rows.slice(0, 30).reverse().map((row) => row.profit))}
        </div>
      </section>`;
    }
    
    // Attach global delete function for sale
    window.deleteSale = async function(id) {
      const removed = (state.data.sales || []).find(r => String(r.id) === String(id));
      state.data.sales = (state.data.sales || []).filter(r => String(r.id) !== String(id));
      render();
      try {
        await gas("remove", { collection: "sales", id });
      } catch (err) {
        if (removed) state.data.sales.push(removed);
        render();
        alert("Gagal menghapus: " + err.message);
      }
    };
    

    function statistik() {
      const productId = localStorage.getItem("statsProductId") || "";
      const rows = filteredPriceHistory(productId);
      const prices = rows.map((row) => Number(row.basePrice || 0)).filter((value) => value > 0);
      const last = rows[0]?.basePrice || 0;
      const min = prices.length ? Math.min(...prices) : 0;
      const max = prices.length ? Math.max(...prices) : 0;
      return `<section class="grid">
        <div class="card">
          <div class="actions" style="justify-content:space-between">
            <h2>Statistik Perubahan Harga</h2>
            <label style="min-width:240px">Barang
              <select id="stats-product-filter">
                <option value="">Semua Barang</option>
                ${state.data.products.map((product) => `<option value="${product.id}" ${String(product.id) === String(productId) ? "selected" : ""}>${product.name}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="grid stats">
            ${stat("Harga Terakhir", rupiah(last))}
            ${stat("Harga Terendah", rupiah(min))}
            ${stat("Harga Tertinggi", rupiah(max))}
            ${stat("Jumlah Perubahan", rows.length)}
          </div>
          ${barChart(rows.slice().reverse().map((row) => row.basePrice))}
        </div>
        <div class="card">${simpleTable(rows, ["product", "basePrice", "costPrice", "source", "createdAt"], ["Barang", "Harga Dasar", "HPP", "Sumber", "Tanggal"], priceFormat)}</div>
      </section>`;
    }

    function audit() {
      return `<section class="grid">
        <div class="card">
          <h2 style="display:flex; justify-content:space-between; align-items:center;">
            Audit Log
            <button class="btn danger" onclick="clearAuditLogs()">🗑 Hapus Log</button>
          </h2>
          <p class="muted">Riwayat tambah, edit, hapus, backup, dan restore.</p>
        </div>
        <div class="card">${simpleTable(state.data.auditLogs || [], ["createdAt", "user", "message"], ["Tanggal", "User", "Aktivitas"])}</div>
      </section>`;
    }

    function users() {
      return crudView("users", "Akun Super Admin", userForm(), userRows());
    }

    function settings() {
      const tab = localStorage.getItem("settingsTab") || "api";
      const titles = {
        api: ["Pusat API", "Kelola koneksi AI dari server Railway. Key tetap tersembunyi dan hanya dipakai backend."],
        warna: ["Warna Tampilan", "Racik warna dashboard, sidebar, topbar, dan halaman agar tidak membosankan."],
        backup: ["Backup & Export", "Export Excel/PDF, backup database ke JSON, atau restore dari file backup."],
        users: ["Manajemen Users", "Kelola akun pengguna, admin, dan hak akses aplikasi."]
      };
      const [title, description] = titles[tab] || titles.api;
      return `<section class="settings-page">
        <div class="settings-hero">
          <div>
            <div class="settings-kicker">Settings</div>
            <div class="settings-title">${title}</div>
            <p class="muted">${description}</p>
          </div>
          ${tab === "api" ? `<button class="api-primary" id="refresh-ai-settings">RECHECK</button>` : ""}
        </div>

        <div class="settings-tabs">
          ${settingsTabButton("users", "USERS", tab)}
          ${settingsTabButton("warna", "WARNA", tab)}
          ${settingsTabButton("api", "PUSAT API", tab)}
          ${settingsTabButton("backup", "BACKUP", tab)}
        </div>

        ${tab === "users" ? users() : ""}



        ${tab === "api" ? `
        <div class="api-center-card" style="max-width: 100%;">
          <div style="display:flex; justify-content:flex-end; margin-bottom: 12px;">
            <button class="btn-minimal" id="add-new-api-key" style="padding: 4px 8px; font-size:11px;" onclick="document.getElementById('api-key-form-container').classList.toggle('hidden')">+ Tambah Kunci Baru</button>
          </div>

          <!-- Form Tambah Kunci -->
          <div id="api-key-form-container" class="card hidden" style="margin-bottom: 16px; border-color: var(--green); padding: 12px;">
            <h3 id="api-form-title" style="margin-top:0; color:var(--mint); font-size: 0.9rem;">Tambah Kunci API</h3>
            <form id="api-key-form" class="grid forms" style="gap: 8px;" onsubmit="event.preventDefault(); window.saveOmniApiKey && window.saveOmniApiKey()">
              <input type="hidden" id="api-key-id">
              <label style="font-size: 0.75rem;">Provider AI
                <select id="api-key-provider" required style="padding: 6px; font-size: 0.75rem;" onchange="document.getElementById('api-key-url').value = this.value === 'OpenAI' ? 'https://api.openai.com/v1' : (this.value === 'Gemini' ? 'https://generativelanguage.googleapis.com' : (this.value === 'Groq' ? 'https://api.groq.com/openai/v1' : (this.value === 'DeepSeek' ? 'https://api.deepseek.com' : (this.value === 'Kie' ? 'https://api.kie.ai/codex/v1/responses' : ''))))">
                  <option value="">-- Pilih Provider --</option>
                  <option value="OpenAI">OpenAI</option>
                  <option value="Gemini">Gemini</option>
                  <option value="Groq">Groq</option>
                  <option value="DeepSeek">DeepSeek</option>
                  <option value="Kie">Kie AI (OpenAI Compatible)</option>
                  <option value="GoAPI">GoAPI</option>
                  <option value="Custom">Custom / Lainnya</option>
                </select>
              </label>
              <label style="font-size: 0.75rem;">Nama Akun <input id="api-key-name" placeholder="Misal: Akun Utama Bos" required style="padding: 6px; font-size: 0.75rem;"></label>
              <label style="font-size: 0.75rem;">API Key<input id="api-key-value" type="password" placeholder="sk-..." required style="padding: 6px; font-size: 0.75rem;"></label>
              <label style="font-size: 0.75rem;">Base URL<input id="api-key-url" placeholder="https://..." required style="padding: 6px; font-size: 0.75rem;"></label>
              <div class="actions" style="grid-column: 1/-1; justify-content: flex-end; margin-top: 8px;">
                <button type="button" class="btn-minimal" onclick="document.getElementById('api-key-form-container').classList.add('hidden')">Batal</button>
                <button type="submit" class="btn-minimal primary-outline">Simpan</button>
              </div>
            </form>
          </div>

          <div id="ai-settings-panel" class="grid" style="gap: 10px;">
            <p class="muted">Memuat kunci API...</p>
          </div>
          
          <div class="actions" style="margin-top: 12px;">
            <button class="btn-minimal" id="test-ai-settings" style="width: 100%;"><span style="font-size:14px">🩺</span> Cek Kesehatan API</button>
          </div>
          <p id="ai-settings-test-result" class="api-status-text"></p>

          <div class="api-help-card">
            <strong>SISTEM FAILOVER AKTIF 🛡️</strong>
            <ol>
              <li>Sistem akan menggunakan kunci berstatus <span style="color:var(--green); font-weight:bold;">ALIVE</span>.</li>
              <li>Jika terkena limit (429) atau error, kunci otomatis ditandai <span style="color:var(--orange); font-weight:bold;">DEAD</span> dan berpindah ke kunci berikutnya tanpa henti.</li>
              <li>Pastikan selalu ada cadangan kunci untuk menjamin operasional AI berjalan lancar bak raksasa teknologi.</li>
            </ol>
          </div>
        </div>
        ` : ""}
        ${tab === "warna" ? `
        <div class="theme-panel">
          <div class="theme-preview" id="theme-preview"></div>
          <div class="theme-grid" style="margin-top: 8px;">
            <label style="font-size: 0.75rem;">Mode
              <select id="theme-mode" style="padding: 6px; font-size: 0.75rem;">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </label>
            <label style="font-size: 0.75rem;">Hijau Utama<input id="theme-green" type="color" style="height: 32px; padding: 2px;"></label>
            <label style="font-size: 0.75rem;">Orange Aksen<input id="theme-orange" type="color" style="height: 32px; padding: 2px;"></label>
            <label style="font-size: 0.75rem;">Background<input id="theme-page" type="color" style="height: 32px; padding: 2px;"></label>
          </div>
          <div class="actions" style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button id="save-theme-colors" type="button" class="btn-minimal primary-outline"><span style="font-size:14px">✨</span> Simpan</button>
            <button id="reset-theme-colors" type="button" class="btn-minimal"><span style="font-size:14px">🔄</span> Reset</button>
          </div>
        </div>
        ` : ""}

        ${tab === "backup" ? `
        <div class="theme-panel">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
            <button id="export-excel" type="button" class="btn-minimal"><span style="font-size:16px">📊</span> Excel</button>
            <button id="export-pdf" type="button" class="btn-minimal"><span style="font-size:16px">📄</span> PDF</button>
            <button id="download-backup" type="button" class="btn-minimal" style="grid-column: 1 / -1;"><span style="font-size:16px">💾</span> Backup JSON</button>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; text-align: center;">
             <p style="margin: 0 0 12px 0; font-size: 0.75rem; color: #9ca3af;">Restore Database dari JSON Backup</p>
             <input id="restore-backup-file" type="file" accept="application/json,.json" style="display: none;">
             
             <div style="display: flex; flex-direction: column; gap: 8px;">
               <label for="restore-backup-file" class="btn-minimal" style="display: flex; margin: 0; padding: 10px;"><span style="font-size:16px">📂</span> Pilih File Backup</label>
               <button id="restore-backup" type="button" class="btn-minimal danger-outline"><span style="font-size:16px">⚠️</span> Timpa Database</button>
             </div>
          </div>
        </div>
        ` : ""}

      </section>`;
    }

    function settingsTabButton(key, label, active) {
      return `<button class="${key === active ? "active" : ""}" data-settings-tab="${key}" type="button">${label}</button>`;
    }

    function renderThemeOption(key, name, desc, bgColor, accentColor, activeTab) {
      const currentTheme = localStorage.getItem('garneta_theme') || 'neural';
      const isActive = currentTheme === key;
      return `
        <div class="theme-option-card ${isActive ? 'active' : ''}" data-theme="${key}" style="cursor:pointer; padding:16px; border:2px solid ${isActive ? accentColor : 'rgba(148,163,184,.24)'}; border-radius:16px; background: linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.03)); transition:all 0.3s ease;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
            <div style="width:48px; height:48px; border-radius:12px; background:${bgColor}; border:2px solid ${accentColor}; display:flex; align-items:center; justify-content:center;">
              <div style="width:16px; height:16px; border-radius:50%; background:${accentColor}; box-shadow:0 0 8px ${accentColor};"></div>
            </div>
            <div>
              <div style="font-weight:700; color:#f8fafc;">${name}</div>
              <div style="font-size:12px; color:#94a3b8;">${desc}</div>
            </div>
          </div>
          ${isActive ? '<div style="text-align:center; padding:4px 12px; background:' + accentColor + '; color:#0f172a; border-radius:8px; font-size:12px; font-weight:700;">✓ AKTIF</div>' : '<div style="text-align:center; padding:4px 12px; background:rgba(148,163,184,.2); color:#94a3b8; border-radius:8px; font-size:12px;">Klik untuk aktifkan</div>'}
        </div>
      `;
    }

    function bindThemeSelector() {
      document.querySelectorAll('[data-theme]').forEach(card => {
        card.addEventListener('click', () => {
          const themeKey = card.dataset.theme;
          applyGarnetaTheme(themeKey);
          // Re-render settings to update UI
          render();
        });
      });
    }

    function applyGarnetaTheme(themeKey) {
      const themes = {
        neural: {
          '--neural-bg': '#0b1f24',
          '--neural-surface': '#102a31',
          '--neural-surface-2': '#142f38',
          '--neural-cyan': '#24f0c7',
          '--neural-cyan-glow': 'rgba(36, 240, 199, 0.4)',
          '--neural-mint': '#8df7df',
          '--neural-orange': '#ff7043',
          '--neural-text': '#e8fbff',
          '--neural-text-soft': '#8fb4bd',
          '--neural-glass': 'rgba(16, 42, 49, 0.85)',
          '--neural-glass-border': 'rgba(141, 247, 223, 0.2)'
        },
        cyber: {
          '--neural-bg': '#0a0a0f',
          '--neural-surface': '#12121a',
          '--neural-surface-2': '#1a1a25',
          '--neural-cyan': '#ff00ff',
          '--neural-cyan-glow': 'rgba(255, 0, 255, 0.4)',
          '--neural-mint': '#ff66ff',
          '--neural-orange': '#00ffff',
          '--neural-text': '#ffffff',
          '--neural-text-soft': '#a0a0b0',
          '--neural-glass': 'rgba(18, 18, 26, 0.9)',
          '--neural-glass-border': 'rgba(255, 0, 255, 0.3)'
        },
        dark: {
          '--neural-bg': '#0d0d0d',
          '--neural-surface': '#1a1a1a',
          '--neural-surface-2': '#262626',
          '--neural-cyan': '#60a5fa',
          '--neural-cyan-glow': 'rgba(96, 165, 250, 0.4)',
          '--neural-mint': '#93c5fd',
          '--neural-orange': '#f87171',
          '--neural-text': '#f5f5f5',
          '--neural-text-soft': '#a3a3a3',
          '--neural-glass': 'rgba(26, 26, 26, 0.9)',
          '--neural-glass-border': 'rgba(96, 165, 250, 0.2)'
        },
        ocean: {
          '--neural-bg': '#0c1a2d',
          '--neural-surface': '#132a47',
          '--neural-surface-2': '#1a3a5c',
          '--neural-cyan': '#00d4ff',
          '--neural-cyan-glow': 'rgba(0, 212, 255, 0.4)',
          '--neural-mint': '#7dd3fc',
          '--neural-orange': '#fbbf24',
          '--neural-text': '#e0f2fe',
          '--neural-text-soft': '#94a3b8',
          '--neural-glass': 'rgba(19, 42, 71, 0.9)',
          '--neural-glass-border': 'rgba(0, 212, 255, 0.25)'
        }
      };
      
      const theme = themes[themeKey];
      if (!theme) return;
      
      const root = document.documentElement;
      Object.entries(theme).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      
      localStorage.setItem('garneta_theme', themeKey);
    }

    function crudView(collection, title, form, rows) {
      return `<section class="grid">
        <div class="card"><h2>${title}</h2>${form}</div>
        <div class="card"><h3>Daftar ${title}</h3>${rows}</div>
      </section>`;
    }

    function stat(label, value) {
      return `<div class="card"><div class="muted">${label}</div><h2>${value ?? 0}</h2></div>`;
    }

    function supplier() {
      return crudView("suppliers", "Data Supplier", supplierForm(), supplierRows());
    }

    function supplierForm() {
      return `<form data-form="suppliers" class="grid forms">
        ${hiddenId()}
        ${input("name", "Nama Supplier", true)}
        ${input("phone", "No Telepon / WhatsApp", false, "text", "", "Contoh: 0812... (Otomatis dapat link WA)")}
        ${input("address", "Alamat (Opsional)")}
        ${input("notes", "Keterangan (Opsional)")}
        ${formButtons()}
      </form>`;
    }

    function supplierRows() {
      const keys = ["name", "phone", "address", "notes"];
      const labels = ["Nama Supplier", "No Telepon / WhatsApp", "Alamat", "Keterangan"];
      const formatter = (key, val) => {
        if (key === "phone" && val) {
          const waLink = `https://wa.me/${String(val).replace(/^0/, '62').replace(/\\D/g, '')}`;
          return `${escapeHtml(val)} <br> <a href="${waLink}" target="_blank" class="btn soft" style="padding:4px 8px;font-size:12px;background:#10b981;color:#fff;margin-top:4px;display:inline-block;">WhatsApp</a>`;
        }
        return escapeHtml(val || "-");
      };
      return actionTable("suppliers", state.data.suppliers || [], keys, labels, formatter);
    }

    function productForm() {
      const cats = [...new Set((state?.data?.products || []).map(p => p.category).filter(Boolean))];
      return `<form data-form="products" class="grid forms">
        ${hiddenId()}
        
        <label>Kategori Barang<input name="category" type="text" list="category-list">
          <datalist id="category-list">${cats.map(opt => `<option value="${escapeAttr(opt)}">`).join("")}</datalist>
        </label>
        ${input("name", "Nama Barang", true)}
        ${input("unitContent", "Isi/Unit", false, "text")}
        ${input("stock", "Stok", false, "number")}
        ${isSuperAdmin() ? '<label>CUAN<input name="cuan" type="text" readonly tabindex="-1" style="background:var(--bg);font-weight:bold;"></label>' : '<input name="cuan" type="hidden">'}
        ${priceWithUnit("basePrice", "unit", "Harga Dasar (Beli)", "Grosir", false)}
        ${priceWithUnit("basePriceEcer", "unitEcer", "Harga Dasar Ecer", "Ecer", true)}
        ${priceWithUnit("salePrice", "unit", "Harga Jual (Grosir)", "Grosir", false)}
        ${priceWithUnit("salePriceEcer", "unitEcer", "Harga Jual Ecer", "Ecer", true)}
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
          <label>Potongan Harga
            <div style="display:flex; align-items:center; background:var(--field-bg); border:1px solid var(--line); border-radius:8px; overflow:hidden;">
              <input name="discountValue" type="number" placeholder="Nominal" style="flex:1; border:none; background:transparent; padding:12px 10px; font-size:1.05rem; color:var(--text); outline:none; min-width:0;">
              <select name="discountType" style="width:65px; border:none; border-left:1px dashed var(--line); background:transparent; color:var(--primary); font-weight:bold; font-size:1rem; padding:12px 5px; outline:none; cursor:pointer;">
                <option value="Rp">Rp</option>
                <option value="%">%</option>
              </select>
            </div>
          </label>
          ${input("discountMinQty", "Minimal Beli (Syarat)", false, "number")}
        </div>
        ${input("barcode", "Barcode / Kode Scanner")}

        ${formButtons()}
      </form>`;
    }

    function productImportTools() {
      return `<div class="grid">
        <div class="grid forms">
          <label>File CSV / Excel / Spreadsheet
            <input id="product-import-file" type="file" accept=".csv,.tsv,.txt,.xlsx,.xls">
          </label>
          <div class="actions" style="align-self:end">
            <button class="btn primary" id="import-products-file">Import File</button>
          </div>
        </div>
        <label>Copy paste dari WA / Spreadsheet
          <textarea id="product-wa-text" class="input-area expandable" placeholder="Contoh:
Beras Premium, Beras, sak, 25, 312500, 14500, 10
Gula Pasir 2
Payung, Tepung, sak, 25, 170000, 8500"></textarea>
        </label>
        <div class="actions" style="grid-column: 1 / -1; position:sticky; bottom:-16px; background:var(--card-bg); padding:16px; margin: 16px -16px -16px -16px; border-top:1px solid rgba(255,255,255,0.05); z-index:10; display:flex; justify-content:flex-end; gap:8px; border-radius:0 0 16px 16px; box-shadow:0 -20px 40px rgba(0,0,0,0.3); backdrop-filter:blur(10px);">
          <button class="btn primary" id="parse-products-wa" style="flex:1; font-size:1.1rem; padding:12px 16px; box-shadow:0 4px 12px rgba(0,255,204,0.3);">💾 Proses Paste WA</button>
        </div>
        <p class="muted">Format header yang didukung: nama, kategori, unit, isi/unit, harga dasar, harga jual, stok, barcode. Jika hanya "Nama 5", stok akan diisi 5.</p>
      </div>`;
    }

    function productScannerTools() {
      return `<div class="grid">
        <div class="grid forms">
          <label>Hasil Scanner<input id="scanner-result" placeholder="Scan barcode atau ketik manual"></label>
          <label>Nama Barang<input id="scanner-product-name" placeholder="Nama barang dari hasil scan"></label>
          <label>Kategori<input id="scanner-product-category" value="Umum"></label>
          <label>Harga Dasar<input id="scanner-base-price" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="0"></label>
          <label>Unit<select id="scanner-unit"><option>sak</option><option>karton/dus</option><option>jligen</option><option>kg</option><option>ball</option><option>pcs</option></select></label>
          <label>Isi/Unit<input id="scanner-unit-content" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="1"></label>
          <label>Harga Jual<input id="scanner-sale-price" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="0"></label>
          <label>Stok<input id="scanner-stock" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="0"></label>
        </div>
        <video id="scanner-video" class="scanner-preview hidden" playsinline></video>
        <div class="actions" style="grid-column: 1 / -1; position:sticky; bottom:-16px; background:var(--card-bg); padding:16px; margin: 16px -16px -16px -16px; border-top:1px solid rgba(255,255,255,0.05); z-index:10; display:flex; justify-content:flex-end; gap:8px; border-radius:0 0 16px 16px; box-shadow:0 -20px 40px rgba(0,0,0,0.3); backdrop-filter:blur(10px);">
          <button class="btn soft" id="start-product-scanner" style="padding:12px 16px;">Buka Kamera HP</button>
          <button class="btn danger hidden" id="stop-product-scanner" style="padding:12px 16px;">Tutup Kamera</button>
          <button class="btn primary" id="save-scanned-product" style="flex:1; font-size:1.1rem; padding:12px 16px; box-shadow:0 4px 12px rgba(0,255,204,0.3);">💾 Simpan Hasil Scan</button>
        </div>
        <p class="muted">Scanner memakai kamera perangkat dan BarcodeDetector jika tersedia. Jika browser belum mendukung, isi kode scanner manual.</p>
      </div>`;
    }



    function purchaseForm() {
        const cats = [...new Set((state?.data?.products || []).map(p => p.category).filter(Boolean))];
        return `<form data-form="purchases" class="grid forms">
          ${hiddenId()}
          
          ${input("date", "Tanggal", true, "date", today())}
          <label>Kategori Barang<input name="category" type="text" list="category-list">
            <datalist id="category-list">${cats.map(opt => `<option value="${escapeAttr(opt)}">`).join("")}</datalist>
          </label>
          ${input("name", "Nama Barang", false)}
          ${input("unitContent", "Isi/Unit", false, "text")}
          ${isSuperAdmin() ? '<label>CUAN<input name="cuan" type="text" readonly tabindex="-1" style="background:var(--bg);font-weight:bold;"></label>' : '<input name="cuan" type="hidden">'}
          ${priceWithUnit("basePrice", "unit", "Harga Dasar (Beli)", "Grosir", false)}
          ${priceWithUnit("basePriceEcer", "unitEcer", "Harga Dasar Ecer", "Ecer", true)}
          ${priceWithUnit("salePrice", "unit", "Harga Jual (Grosir)", "Grosir", false)}
          ${priceWithUnit("salePriceEcer", "unitEcer", "Harga Jual Ecer", "Ecer", true)}

          ${formButtons()}
        </form>`;
      }

    function saleForm() {
      const prodOptions = state.data.products.map((p) => `<option value="${escapeAttr(p.name)}">`).join("");
      return `<form id="pos-form" class="grid forms">
        ${hiddenId()}${input("date", "Tanggal", true, "date", today())}
        <div id="pos-reader-container" style="display:none; grid-column: 1/-1; background:#000; border-radius:12px; overflow:hidden; margin-bottom:12px;">
          <div id="pos-reader" style="width: 100%;"></div>
        </div>
        <label>Nama Barang / Barcode
          <div style="display:flex; gap:8px;">
            <input list="sale-products-list" id="pos-product-input" name="product" placeholder="Ketik, pilih, atau scan..." required autocomplete="off" style="flex:1;">
            <button type="button" class="btn secondary" onclick="togglePosScanner()" style="padding: 0 16px;">📷</button>
          </div>
          <datalist id="sale-products-list">${prodOptions}</datalist>
        </label>
        ${input("unitSold", "Unit / Qty (Bisa Desimal)", true, "decimal", "1")}
        <label>Harga Jual Khusus (Opsional)
          <input name="salePriceOverride" type="text" inputmode="numeric" placeholder="Kosongkan jika harga normal" oninput="formatNumberInput(this)">
          <small class="muted">Isi untuk barang timbangan / nominal bebas</small>
        </label>
        ${isSuperAdmin() ? '<label>Potensi Cuan (Rp)<input name="cuan" type="text" readonly style="background-color:#1c2536;color:#10b981;font-weight:bold;" placeholder="Rp 0"></label>' : '<input name="cuan" type="hidden">'}
        <div class="actions" style="grid-column: 1 / -1; position:sticky; bottom:-16px; background:var(--card-bg); padding:16px; margin: 16px -16px -16px -16px; border-top:1px solid rgba(255,255,255,0.05); z-index:10; display:flex; justify-content:flex-end; gap:8px; border-radius:0 0 16px 16px; box-shadow:0 -20px 40px rgba(0,0,0,0.3); backdrop-filter:blur(10px);">
          <button type="submit" class="btn primary" style="flex:1; font-size:1.1rem; padding:12px 16px; box-shadow:0 4px 12px rgba(0,255,204,0.3);">💾 Tambah ke Keranjang</button>
        </div>
      </form>`;
    }

    function userForm() {
      const hasSuperAdmin = state.data.users.some((user) => user.role === "Super Admin");
      return `<form data-form="users" class="grid forms">
        ${hiddenId()}${input("name", "Nama Super Admin", true)}${input("password", hasSuperAdmin ? "Password Baru" : "Password", !hasSuperAdmin, "password")}${select("status", "Status", ["Aktif", "Nonaktif"])}${formButtons()}
        <p class="muted" style="grid-column:1/-1">${hasSuperAdmin ? "Super Admin sudah ada. Form ini hanya untuk mengedit akun yang dipilih dari tabel." : "Belum ada Super Admin. Buat satu akun Super Admin untuk membuka menu khusus."}</p>
      </form>`;
    }

    function productRows() {
      const sorted = [...(state.data.products || [])].sort((a, b) => {
        const catA = (a.category || "").toLowerCase();
        const catB = (b.category || "").toLowerCase();
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
      });
      const prodKeys   = isSuperAdmin()
        ? ["category", "name", "unit", "unitContent", "basePrice", "basePriceEcer", "salePrice", "salePriceEcer", "cuan"]
        : ["category", "name", "unit", "unitContent", "salePrice", "salePriceEcer"];
      const prodLabels = isSuperAdmin()
        ? ["Kategori", "Nama", "Satuan", "Isi/Unit", "H. Dasar Beli", "H. Dasar Ecer", "H. Jual Grosir", "H. Jual Ecer", "CUAN"]
        : ["Kategori", "Nama", "Satuan", "Isi/Unit", "H. Jual Grosir", "H. Jual Ecer"];
      return actionTable("products", sorted, prodKeys, prodLabels, priceFormat);
    }



    function purchaseRows() {
      return actionTable("purchases", state.data.purchases, ["date", "product", "qty", "amount", "total"], ["Tanggal", "Barang", "Banyak", "Harga", "Total"], priceFormat);
    }

    function saleRows() {
      const keys = isSuperAdmin()
        ? ["date", "product", "unitSold", "unitContent", "qty", "profitPerUnit", "profit"]
        : ["date", "product", "unitSold", "unitContent", "qty"];
      const labels = isSuperAdmin()
        ? ["Tanggal", "Barang", "Unit", "Isi", "Banyak", "Profit/Unit", "Keuntungan"]
        : ["Tanggal", "Barang", "Unit", "Isi", "Banyak"];
      return actionTable("sales", state.data.sales, keys, labels, priceFormat);
    }

    function userRows() {
      return actionTable("users", superAdmins(), ["name", "role", "status"], ["Nama", "Role", "Status"]);
    }

    function shoppingRows() {
      return JSON.parse(localStorage.getItem("shoppingRows") || "[]");
    }

    function invoiceDraftRows() {
      return JSON.parse(localStorage.getItem("invoiceDraftRows") || "[]");
    }

    function saveInvoiceDraftRows(rows) {
      localStorage.setItem("invoiceDraftRows", JSON.stringify(rows));
    }

    function saveShoppingRows(rows) {
      localStorage.setItem("shoppingRows", JSON.stringify(rows));
    }

    function shoppingSubtotal(row) {
      return Number(row.qty || 0) * Number(row.amount || 0);
    }

    function shoppingTable(rows) {
      return actionTable("shopping", rows, ["name", "unit", "qty", "amount", "subtotal"], ["Nama Barang", "Unit", "Banyak Beli", "Harga Dasar", "Total Jumlah"], (key, value) => key === "amount" || key === "subtotal" ? rupiah(value) : value);
    }

    function posRows() {
      return JSON.parse(localStorage.getItem("posRows") || "[]");
    }

    function savePosRows(rows) {
      localStorage.setItem("posRows", JSON.stringify(rows));
    }

    function posTable(rows) {
      const cols   = isSuperAdmin() ? ["date", "product", "unitSold", "cuan"] : ["date", "product", "unitSold"];
      const labels = isSuperAdmin() ? ["Tanggal", "Nama Barang", "Unit Terjual", "Cuan"]  : ["Tanggal", "Nama Barang", "Unit Terjual"];
      return actionTable("pos", rows, cols, labels, (key, value) => key === "cuan" ? rupiah(value) : value);
    }

    function invoiceDraftTable() {
      const rows = invoiceDraftRows();
      if (!rows.length) return `<p class="muted">Belum ada draft nota.</p>`;
      return `<div class="table-wrap"><table>
        <thead><tr><th>Nama</th><th>Kategori</th><th>Unit</th><th>Isi</th><th>Qty</th><th>Harga Dasar</th><th>Harga Jual</th><th>Aksi</th></tr></thead>
        <tbody>${rows.map((row) => `
          <tr data-draft-id="${row.id}">
            <td><input data-draft-field="name" value="${escapeAttr(row.name)}"></td>
            <td><input data-draft-field="category" value="${escapeAttr(row.category || "Umum")}"></td>
            <td><select data-draft-field="unit">${["sak", "karton/dus", "jligen", "kg", "ball", "pcs"].map((unit) => `<option ${row.unit === unit ? "selected" : ""}>${unit}</option>`).join("")}</select></td>
            <td><input data-draft-field="unitContent" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(Number(row.unitContent || 1))}"></td>
            <td><input data-draft-field="stock" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(Number(row.stock || 0))}"></td>
            <td><input data-draft-field="basePrice" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(Number(row.basePrice || 0))}"></td>
            <td><input data-draft-field="salePrice" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(Number(row.salePrice || 0))}"></td>
            <td><button class="btn danger delete-invoice-draft" data-id="${row.id}" type="button">Hapus</button></td>
          </tr>
        `).join("")}</tbody>
      </table></div>`;
    }

    function actionTable(collection, rows, keys, labels, formatter) {
      return table(rows, labels.concat(["Aksi"]), (row) => keys.map((key) => td(formatter ? formatter(key, row[key]) : row[key])).join("") + `<td class="actions"><button class="btn soft" data-edit="${collection}" data-id="${row.id}">Edit</button><button class="btn danger" data-delete="${collection}" data-id="${row.id}">Hapus</button></td>`);
    }

    function simpleTable(rows, keys, labels, formatter) {
      return table(rows, labels, (row) => keys.map((key) => td(formatter ? formatter(key, row[key]) : row[key])).join(""));
    }

    function table(rows, labels, body) {
      if (!rows.length) return `<p class="muted">Belum ada data.</p>`;
      return `<div class="table-wrap"><table><thead><tr>${labels.map((label) => `<th>${label}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${body(row)}</tr>`).join("")}</tbody></table></div>`;
    }

    function td(value) {
      return `<td>${value ?? ""}</td>`;
    }

    function input(name, label, required, type = "text", value = "") {
      let eyeHtml = "";
      let styleAttr = "";
      if (type === "password") {
        eyeHtml = `<button type="button" tabindex="-1" onclick="const i=this.previousElementSibling; if(i.type==='password'){i.type='text';this.textContent='🙈'}else{i.type='password';this.textContent='👁️'}" style="position:absolute; right:8px; top:20px; background:none; border:none; color:var(--soft-text); font-size:14px; cursor:pointer; padding:4px;">👁️</button>`;
        styleAttr = `style="padding-right: 32px;"`;
      }
      if (type === "number") {
          return `<label style="position:relative">${label}<input name="${name}" type="text" inputmode="numeric" value="${value}" ${required ? "required" : ""} oninput="formatNumberInput(this)"></label>`;
      }
      if (type === "decimal") {
          return `<label style="position:relative">${label}<input name="${name}" type="number" step="any" inputmode="decimal" value="${value}" ${required ? "required" : ""}></label>`;
      }
      return `<label style="position:relative">${label}<input name="${name}" type="${type}" value="${value}" ${required ? "required" : ""} ${styleAttr} onblur="if(this.type==='text') this.value=this.value.trim()">${eyeHtml}</label>`;
    }

    function priceWithUnit(namePrice, nameUnit, label, unitPlaceholder, isEcer) {
      const listOptions = isEcer 
        ? ["pcs", "kg", "gram", "renteng", "pack", "biji", "buah", "botol", "ikat"]
        : ["sak", "kotak", "ball", "dus", "kg", "ons", "gram", "pcs", "ikat"];
      const dataListId = isEcer ? "satuan-ecer-list" : "satuan-list";
      
      return `<label>${label}
        <div style="display:flex; gap:5px; margin-top:5px;">
          <input name="${namePrice}" type="text" inputmode="numeric" oninput="formatNumberInput(this)" style="flex:1" placeholder="Rp">
          <span style="display:flex; align-items:center; font-weight:bold; color:var(--muted)">/</span>
          <input name="${nameUnit}" type="text" list="${dataListId}" placeholder="${unitPlaceholder}" style="width:70px; padding-left:4px; padding-right:4px; text-align:center;">
          <datalist id="${dataListId}">${listOptions.map(o => `<option value="${o}">`).join("")}</datalist>
        </div>
      </label>`;
    }

    document.addEventListener('input', e => {
      if (e.target.name === 'unit' || e.target.name === 'unitEcer') {
        const form = e.target.closest('form');
        if (form) {
          form.querySelectorAll(`input[name="${e.target.name}"]`).forEach(el => {
            if (el !== e.target) el.value = e.target.value;
          });
        }
      }
    });

    function select(name, label, options) {
      return `<label>${label}<select name="${name}">${options.map((item) => `<option>${item}</option>`).join("")}</select></label>`;
    }

    function hiddenId() {
      return `<input type="hidden" name="id">`;
    }

    function formButtons() {
      return `<div class="actions" style="grid-column: 1 / -1; position:sticky; bottom:-16px; background:var(--card-bg); padding:16px; margin: 16px -16px -16px -16px; border-top:1px solid rgba(255,255,255,0.05); z-index:10; display:flex; justify-content:flex-end; gap:8px; border-radius:0 0 16px 16px; box-shadow:0 -20px 40px rgba(0,0,0,0.3); backdrop-filter:blur(10px);"><button class="btn" type="reset" style="padding:12px 16px;">Batal</button><button class="btn primary" style="flex:1; font-size:1.1rem; padding:12px 16px; box-shadow:0 4px 12px rgba(0,255,204,0.3);">💾 Simpan Data</button></div>`;
    }

    function priceFormat(key, value) {
      return ["basePrice", "costPrice", "salePrice", "amount", "total", "profitPerUnit", "profit"].includes(key) ? rupiah(value) : value;
    }

    function findProduct(name) {
      return state.data.products.find((product) => product.name.toLowerCase() === String(name || "").trim().toLowerCase());
    }

    
      function formatNumberInput(el) {
        let val = el.value.replace(/[^0-9-]/g, '');
        if (val) {
          let isNegative = val.startsWith('-');
          val = val.replace(/-/g, '');
          el.value = (isNegative ? '-' : '') + val.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        } else {
          el.value = '';
        }
      }
      
      function formatInitialNumber(val) {
        if (!val) return "";
        return String(val).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }

      function plainNumber(value) {
      const cleaned = String(value ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function splitRow(line) {
      return String(line).split(/[,;\t]/).map((cell) => cell.trim()).filter((cell) => cell !== "");
    }

    function productFromCells(cells) {
      if (cells.length <= 1) return null;
      return {
        name: cells[0],
        category: cells[1] || "Umum",
        unit: cells[2] || "pcs",
        unitContent: plainNumber(cells[3]) || 1,
        basePrice: plainNumber(cells[4]),
        salePrice: plainNumber(cells[5]),
        stock: plainNumber(cells[6]),
        barcode: cells[7] || ""
      };
    }

    function parseNameQtyUnit(line) {
      const units = ["sak", "karton/dus", "karton", "dus", "jligen", "kg", "ball", "pcs"];
      const pattern = new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${units.map((unit) => unit.replace("/", "\\/")).join("|")})?$`, "i");
      const match = String(line || "").trim().match(pattern);
      if (!match) return null;
      const rawUnit = (match[3] || "pcs").toLowerCase();
      return {
        name: match[1].trim(),
        qty: plainNumber(match[2]),
        unit: rawUnit === "karton" || rawUnit === "dus" ? "karton/dus" : rawUnit
      };
    }

    function parseProductText(text) {
      return String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
        const cells = splitRow(line);
        const fullRow = productFromCells(cells);
        if (fullRow) return fullRow;

        const parsed = parseNameQtyUnit(line);
        if (!parsed) return null;
        return {
          name: parsed.name,
          category: "Umum",
          unit: parsed.unit,
          unitContent: 1,
          basePrice: 0,
          salePrice: 0,
          stock: parsed.qty,
          barcode: ""
        };
      }).filter((row) => row && row.name);
    }

    function parseShoppingText(text) {
      return String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
        const cells = splitRow(line);
        const parsed = cells.length >= 2 ? null : parseNameQtyUnit(line);
        const name = cells.length >= 2 ? cells[0] : (parsed?.name || "");
        const qty = cells.length >= 2 ? plainNumber(cells[1]) : Number(parsed?.qty || 0);
        if (!name || !qty) return null;
        const product = findProduct(name);
        const amount = product ? Number(product.basePrice || 0) : 0;
        return { id: Date.now() + Math.random(), name: name.trim(), unit: parsed?.unit || product?.unit || "", qty, amount, subtotal: qty * amount };
      }).filter(Boolean);
    }

    async function importProducts(rows) {
      let saved = 0;
      for (const row of rows) {
        await gas("add", { collection: "products", item: row });
        saved += 1;
      }
      await load();
      alert(`${saved} barang berhasil diimport.`);
    }

    function invoiceItemsToProducts(invoice) {
      if (invoice.error) {
        throw new Error(invoice.error);
      }

      return (invoice.items || [])
        .filter((item) => item.nama_barang && item.nama_barang !== "UNKNOWN")
        .map((item) => ({
          name: item.nama_barang,
          category: "Umum",
          unit: item.tipe_harga === "H.M/dus" ? "karton/dus" : "pcs",
          unitContent: 1,
          basePrice: Number(item.harga_modal || 0),
          salePrice: 0,
          stock: Number(item.kuantitas || 0),
          barcode: ""
        }));
    }

    function parseInvoiceDraftFromText(text) {
      const cleaned = String(text || "").replace(/```json|```/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start < 0 || end < start) throw new Error("Hasil AI belum berbentuk JSON nota.");
      const invoice = JSON.parse(cleaned.slice(start, end + 1));
      const rows = invoiceItemsToProducts(invoice).map((row) => ({
        ...row,
        id: Date.now() + Math.random()
      }));
      if (!rows.length) throw new Error("Tidak ada item valid untuk dijadikan draft.");
      return rows;
    }

    function collectInvoiceDraftFromTable() {
      const rows = [];
      document.querySelectorAll("tr[data-draft-id]").forEach((tr) => {
        const row = { id: tr.dataset.draftId };
        tr.querySelectorAll("[data-draft-field]").forEach((input) => {
          row[input.dataset.draftField] = input.value;
        });
        row.unitContent = plainNumber(row.unitContent) || 1;
        row.stock = plainNumber(row.stock);
        row.basePrice = plainNumber(row.basePrice);
        row.salePrice = plainNumber(row.salePrice);
        rows.push(row);
      });
      saveInvoiceDraftRows(rows);
      return rows;
    }

    function refreshInvoiceDraftTable() {
      const target = el("invoice-draft-table");
      if (target) {
        target.innerHTML = invoiceDraftTable();
        bindInvoiceDraftTable();
      }
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
        reader.readAsDataURL(file);
      });
    }

    async function readAndCompressImage(file, maxSize = 1280, quality = 0.72) {
      const dataUrl = await readFileAsDataUrl(file);
      return compressImageDataUrl(dataUrl, maxSize, quality);
    }

    function compressImageDataUrl(dataUrl, maxSize = 1280, quality = 0.72) {
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        image.onerror = () => resolve(dataUrl);
        image.src = dataUrl;
      });
    }

    async function readProductFile(file) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (["xlsx", "xls"].includes(ext)) {
        if (!window.XLSX) throw new Error("Library Excel belum termuat. Coba koneksi internet aktif atau gunakan CSV.");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        const first = (rows[0] || []).map((cell) => String(cell).toLowerCase());
        const hasHeader = first.some((cell) => ["nama", "name", "barang", "harga dasar", "baseprice"].includes(cell));
        return (hasHeader ? rows.slice(1) : rows).map((row) => productFromCells(row.map(String))).filter((item) => item && item.name);
      }

      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const first = splitRow(lines[0] || "").map((cell) => cell.toLowerCase());
      const hasHeader = first.some((cell) => ["nama", "name", "barang", "harga dasar", "baseprice"].includes(cell));
      return parseProductText((hasHeader ? lines.slice(1) : lines).join("\n"));
    }

    function dailySales() {
      const map = {};
      state.data.sales.forEach((sale) => {
        const dateStr = sale.date.split('T')[0];
        if (!map[dateStr]) map[dateStr] = { date: dateStr, profit: 0, items: [] };
        map[dateStr].profit += Number(sale.profit || 0);
        
        let productName = "Produk Dihapus";
        let unitContent = 1;
        if (sale.productId) {
           const p = state.data.products.find(x => String(x.id) === String(sale.productId));
           if (p) { productName = p.name; unitContent = p.unitContent || 1; }
        }
        
        map[dateStr].items.push({
          ...sale,
          productName,
          unitContent,
          cuan: Number(sale.profit || 0)
        });
      });
      return Object.keys(map).sort((a,b) => new Date(b) - new Date(a)).map((date) => map[date]); // sort newest first
    }

    function filteredPriceHistory(productId) {
      return (state.data.priceHistory || []).filter((row) => !productId || String(row.productId) === String(productId));
    }
    function superAdmins() {
      return state.data.users.filter((user) => user.role === "Super Admin");
    }

    function isSuperAdmin() {
      return state.role === "Super Admin";
    }

    // Menu untuk Admin (6 menu)
    const adminMenus = [
      ["dashboard", "🏠 Dashboard"],
      ["barang", "📦 Barang"],
      ["supplier", "🚚 Supplier"],
      ["pembelian", "🛒 Pembelian"],
      ["ngitung", "🧮 NGITUNG"],
      ["riwayatNgitung", "🕒 Riwayat"],
      ["hutangNgitung", "💸 Hutang"],
      ["penjualan", "💵 Penjualan"]
    ];
    
    // Menu untuk Super Admin (semua menu)
    const superAdminMenus = [
      ["dashboard", "🏠 Dashboard"], ["barang", "📦 Barang"], ["supplier", "🚚 Supplier"],
      ["pembelian", "🛒 Pembelian"], ["ngitung", "🧮 NGITUNG"], ["riwayatNgitung", "🕒 Riwayat"], ["hutangNgitung", "💸 Hutang"], ["kalkulator", "📱 Kalkulator"], ["penjualan", "💵 Penjualan"], ["laporan", "📊 Laporan"],
      ["statistik", "📈 Statistik"], ["audit", "🕵️‍♂️ Audit"], ["gaji", "💸 Gaji & Bon"], ["settings", "⚙️ Setting"]
    ];
    
    // Pilih menu berdasarkan role
    const menus = isSuperAdmin() ? superAdminMenus : adminMenus;

    function barChart(values) {
      const max = Math.max(...values.map(Number), 1);
      return `<div class="chart">${values.map((value) => `<div class="bar" title="${rupiah(value)}" style="height:${Math.max(Number(value) / max * 100, 5)}%"></div>`).join("")}</div>`;
    }

    
      window.searchBarang = function(query) {
        if (!query) {
          const res = document.getElementById("search-barang-results");
          if (res) res.innerHTML = "";
          return;
        }
        const q = query.toLowerCase();
        const results = (state.data.products || []).filter(p => 
          (p.name && p.name.toLowerCase().includes(q)) || 
          (p.category && p.category.toLowerCase().includes(q)) || 
          (p.barcode && String(p.barcode).toLowerCase().includes(q))
        );
        const res = document.getElementById("search-barang-results");
        if (res) {
          const sortedResults = [...results].sort((a, b) => {
            const catA = (a.category || "").toLowerCase();
            const catB = (b.category || "").toLowerCase();
            if (catA < catB) return -1;
            if (catA > catB) return 1;
            const nameA = (a.name || "").toLowerCase();
            const nameB = (b.name || "").toLowerCase();
            return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
          });
          const displayResults = sortedResults.map(p => ({
            ...p,
            displayGrosir: p.salePrice ? `${rupiah(p.salePrice)}${p.unit ? ' / ' + p.unit : ''}` : '-',
            displayEcer: p.salePriceEcer ? `${rupiah(p.salePriceEcer)}${p.unitEcer ? ' / ' + p.unitEcer : ''}` : '-'
          }));
          const srchKeys = ["category", "name", "stock", "displayGrosir", "displayEcer"];
          const srchLabels = ["Kategori", "Nama Barang", "Stok", "Harga Grosir", "Harga Ecer"];
          res.innerHTML = actionTable("products", displayResults, srchKeys, srchLabels);
        }
      };
      
      window.clearSearchBarang = function() {
        const input = document.getElementById("search-barang-input");
        if (input) input.value = "";
        window.searchBarang("");
      };

      window.searchPembelian = function(query) {
        if (!query) {
          const res = document.getElementById("search-pembelian-results");
          if (res) res.innerHTML = "";
          return;
        }
        const q = query.toLowerCase();
        const results = (state.data.purchases || []).filter(p => 
          (p.date && String(p.date).toLowerCase().includes(q)) || 
          (p.product && p.product.toLowerCase().includes(q))
        );
        const res = document.getElementById("search-pembelian-results");
        if (res) {
          res.innerHTML = actionTable("purchases", results, ["date", "product", "qty", "amount", "total"], ["Tanggal", "Barang", "Banyak", "Harga", "Total"], priceFormat);
        }
      };
      
      window.clearSearchPembelian = function() {
        const input = document.getElementById("search-pembelian-input");
        if (input) input.value = "";
        window.searchPembelian("");
      };

      function bindForms() {
        document.querySelectorAll('input[name="name"], input[name="category"]').forEach(el => {
          el.addEventListener('input', function() {
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = toTitleCase(this.value);
            this.setSelectionRange(start, end);
          });
        });

      // Auto-fill form pembelian
      const purchaseFormEl = document.querySelector('form[data-form="purchases"]');
      if (purchaseFormEl) {
        const nameInput = purchaseFormEl.querySelector('input[name="name"]');
        if (nameInput) {
          nameInput.addEventListener('change', (e) => {
            const product = findProduct(e.target.value);
            if (product) {
              if (purchaseFormEl.elements.category) purchaseFormEl.elements.category.value = product.category || '';
              if (purchaseFormEl.elements.unit) purchaseFormEl.elements.unit.value = product.unit || '';
              if (purchaseFormEl.elements.unitEcer) purchaseFormEl.elements.unitEcer.value = product.unitEcer || '';
              if (purchaseFormEl.elements.unitContent) purchaseFormEl.elements.unitContent.value = product.unitContent || '';
              if (purchaseFormEl.elements.basePrice) purchaseFormEl.elements.basePrice.value = product.basePrice || '';
              if (purchaseFormEl.elements.basePriceEcer) purchaseFormEl.elements.basePriceEcer.value = product.basePriceEcer || '';
              if (purchaseFormEl.elements.salePrice) purchaseFormEl.elements.salePrice.value = product.salePrice || '';
              if (purchaseFormEl.elements.barcode) purchaseFormEl.elements.barcode.value = product.barcode || '';
            }
          });
        }
        
        // Auto hitung total tagihan
        const qtyInput = purchaseFormEl.querySelector('input[name="qty"]');
        const priceInput = purchaseFormEl.querySelector('input[name="basePrice"]');
        const totalInput = purchaseFormEl.querySelector('input[name="total"]');
        const updatePurchaseTotal = () => {
          if (qtyInput && priceInput && totalInput) {
            totalInput.value = (Number(String(qtyInput.value).replace(/[^0-9-]/g, '')) || 0) * (Number(String(priceInput.value).replace(/[^0-9-]/g, '')) || 0);
          }
        };
        if (qtyInput) qtyInput.addEventListener('input', updatePurchaseTotal);
        if (priceInput) priceInput.addEventListener('input', updatePurchaseTotal);
      }

      document.querySelectorAll("form[data-form]").forEach((form) => {
        form.onsubmit = async (event) => {
          event.preventDefault();
          try {
            const collection = form.dataset.form;
            const item = Object.fromEntries(new FormData(form).entries());
            const id = item.id;
            delete item.id;

            if (collection === "sales" && item.product) {
              const searchName = item.product.trim().toLowerCase();
              let prod = state.data.products.find(p => p.name.trim().toLowerCase() === searchName);
              if (!prod) {
                const matches = state.data.products.filter(p => p.name.toLowerCase().includes(searchName));
                if (matches.length === 1) prod = matches[0];
              }
              if (!prod) throw new Error("Barang tidak ditemukan di sistem. Pastikan nama barang sesuai atau pilih dari daftar.");
              item.productId = prod.id;
              delete item.product;
            }
            
            if (collection === "purchases") {
              // ── Validasi nama barang ──
              const namaBarang = (item.name || "").trim() || "Barang Tanpa Nama";

              const purchaseQty = Number(String(item.qty || 1).replace(/[^0-9]/g, '')) || 1;

              // ── Kirim SATU kali ke server purchases ──
              // Server handle semuanya: upsert products + insert purchases + price_history
              const purchasePayload = {
                name:         namaBarang,
                date:         item.date || new Date().toISOString().slice(0, 10),
                category:     (item.category || "Umum").trim(),
                unit:         item.unit    || "pcs",
                unitEcer:     item.unitEcer || "-",
                unitContent:  Number(String(item.unitContent  || 1).replace(/[^0-9]/g, '')) || 1,
                basePrice:    Number(String(item.basePrice    || 0).replace(/[^0-9]/g, '')),
                basePriceEcer:Number(String(item.basePriceEcer|| 0).replace(/[^0-9]/g, '')),
                salePrice:    Number(String(item.salePrice    || 0).replace(/[^0-9]/g, '')),
                salePriceEcer:Number(String(item.salePriceEcer|| 0).replace(/[^0-9]/g, '')),
                qty:          purchaseQty,
                total:        purchaseQty * Number(String(item.basePrice || 0).replace(/[^0-9]/g, ''))
              };

              await gas("add", { collection: "purchases", item: purchasePayload });
              await load();
              return; // selesai, jangan lanjut ke gas() bawah
            }

            await gas(id ? "update" : "add", { collection, id, item });
            await load();
          } catch (error) {
            alert(error.message);
          }
        };
      });

      document.querySelectorAll("[data-edit]").forEach((button) => {
        button.onclick = () => {
          if (button.dataset.edit === "shopping") {
            fillShoppingForm(button.dataset.id);
            return;
          }
          fillForm(button.dataset.edit, button.dataset.id);
        };
      });

      document.querySelectorAll("[data-delete]").forEach((button) => {
        button.onclick = async () => {
          if (button.dataset.delete === "shopping") {
            saveShoppingRows(shoppingRows().filter((row) => String(row.id) !== String(button.dataset.id)));
            render();
            return;
          }

          const collection = button.dataset.delete;
          const id = button.dataset.id;

          // ── Optimistic Delete: hapus dari state lokal DULU ──
          // UI langsung responsif tanpa tunggu server
          const collectionMap = {
            products: "products",
            purchases: "purchases",
            sales: "sales",
            employees: "employees",
            cashAdvances: "cashAdvances",
            payrolls: "payrolls",
            users: "users",
            suppliers: "suppliers"
          };
          const stateKey = collectionMap[collection];
          let removed = null;
          if (stateKey && state.data[stateKey]) {
            removed = state.data[stateKey].find(r => String(r.id) === String(id));
            state.data[stateKey] = state.data[stateKey].filter(r => String(r.id) !== String(id));
            render(); // langsung re-render, user tidak perlu tunggu!
          }

          // ── Sync ke server di background ──
          try {
            await gas("remove", { collection, id });
          } catch (err) {
            // Kalau server gagal, kembalikan data yang terhapus
            if (removed && stateKey && state.data[stateKey]) {
              state.data[stateKey].push(removed);
              state.data[stateKey].sort((a, b) => Number(b.id) - Number(a.id));
            }
            render();
            alert("Gagal menghapus: " + err.message);
          }
        };
      });

      bindProductTools();
      bindPembelianTools();
      bindShoppingTools();
      bindPenjualanTools();
      bindInvoiceAiTools();
      bindSettingsTools();
      bindThemeTools();
      bindThemeSelector();
      bindStatsTools();
      bindBackupTools();
      bindPwaTools();
      bindBrandTools();
    }

    function bindPenjualanTools() {
      const form = document.getElementById("pos-form");
      if (form) {
        const updateCuan = () => {
          const productName = form.elements.product.value.trim().toLowerCase();
          const unitSold = plainNumber(form.elements.unitSold.value || 0);
          
          let prod = state.data.products.find(p => p.name.trim().toLowerCase() === productName);
          if (!prod) {
            const matches = state.data.products.filter(p => p.name.toLowerCase().includes(productName));
            if (matches.length === 1) prod = matches[0];
          }
          
          if (prod) {
              const unitContent = Number(prod.unitContent) || 1;
              const saleOverride = plainNumber(form.elements.salePriceOverride?.value || 0);
              let cuan = 0;
              
              if (saleOverride > 0) {
                 const baseCost = Number(prod.basePriceEcer) > 0 ? (Number(prod.basePriceEcer) * unitContent) : (Number(prod.basePrice) || 0);
                 cuan = (saleOverride - baseCost) * unitSold;
              } else if (Number(prod.salePriceEcer) > 0) {
                 const profitPerPcs = Number(prod.salePriceEcer) - (Number(prod.basePriceEcer) || 0);
                 cuan = profitPerPcs * (unitSold * unitContent);
              } else {
                 const profitPerBulk = (Number(prod.salePrice) || 0) - (Number(prod.basePrice) || 0);
                 cuan = profitPerBulk * unitSold;
              }
              form.elements.cuan.value = cuan;
            } else {
            form.elements.cuan.value = "";
          }
        };

        form.elements.product.addEventListener("input", updateCuan);
          form.elements.product.addEventListener("change", updateCuan);
        form.elements.unitSold.addEventListener("input", updateCuan);

        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const date = formData.get("date");
          const productName = formData.get("product").trim().toLowerCase();
          const unitSold = plainNumber(formData.get("unitSold"));
          
          let prod = state.data.products.find(p => p.name.trim().toLowerCase() === productName);
          if (!prod) {
            const matches = state.data.products.filter(p => p.name.toLowerCase().includes(productName));
            if (matches.length === 1) prod = matches[0];
          }
          
          if (!prod) {
            alert("Barang tidak ditemukan di sistem. Pastikan nama barang sesuai.");
            return;
          }

          const unitContent = Number(prod.unitContent) || 1;
          const saleOverride = plainNumber(formData.get("salePriceOverride") || 0);
            let cuan = 0;
            
            if (saleOverride > 0) {
                 const baseCost = Number(prod.basePriceEcer) > 0 ? (Number(prod.basePriceEcer) * unitContent) : (Number(prod.basePrice) || 0);
                 cuan = (saleOverride - baseCost) * unitSold;
            } else if (Number(prod.salePriceEcer) > 0) {
               const profitPerPcs = Number(prod.salePriceEcer) - (Number(prod.basePriceEcer) || 0);
               cuan = profitPerPcs * (unitSold * unitContent);
            } else {
               const profitPerBulk = (Number(prod.salePrice) || 0) - (Number(prod.basePrice) || 0);
               cuan = profitPerBulk * unitSold;
            }

          const rows = posRows();
          rows.unshift({
            id: Date.now() + Math.random(),
            date,
            productId: prod.id,
            product: prod.name,
            unitSold,
            saleOverride,
            cuan
          });
          savePosRows(rows);
          
          haptic([50, 30, 50]); // Vibrate on add to cart
          form.reset();
          form.elements.date.value = date;
          render();
        });
      }

      document.getElementById("save-pos")?.addEventListener("click", async () => {
        const rows = posRows();
        if (!rows.length) {
          alert("Keranjang penjualan masih kosong.");
          return;
        }

        if (!confirm(`Simpan ${rows.length} transaksi penjualan?`)) return;

        try {
          const btn = document.getElementById("save-pos");
          btn.disabled = true;
          btn.textContent = "Menyimpan...";

          for (const row of rows) {
            const item = { date: row.date, productId: row.productId, unitSold: row.unitSold };
            await gas("add", { collection: "sales", id: null, item });
          }

          savePosRows([]);
          alert("Transaksi berhasil disimpan!");
          await load();
        } catch (err) {
          alert("Gagal menyimpan transaksi: " + err.message);
          await load();
        }
      });
      
      document.querySelectorAll("[data-delete=\"pos\"]").forEach(btn => {
        btn.onclick = () => {
           const id = btn.dataset.id;
           savePosRows(posRows().filter(r => String(r.id) !== String(id)));
           render();
        };
      });
    }

    function bindStatsTools() {
      el("stats-product-filter")?.addEventListener("change", (event) => {
        localStorage.setItem("statsProductId", event.target.value);
        render();
      });
    }

    function bindSettingsTools() {
      document.querySelectorAll("[data-settings-tab]").forEach((button) => {
        button.addEventListener("click", () => {
          localStorage.setItem("settingsTab", button.dataset.settingsTab);
          render();
        });
      });
      if (!el("ai-settings-panel")) return;
      loadAiSettings();
      el("refresh-ai-settings")?.addEventListener("click", loadAiSettings);
      el("test-ai-settings")?.addEventListener("click", testAiSettings);
    }

    const defaultTheme = { green: "#24f0c7", orange: "#ff7043", page: "#0b1f24", mode: "dark" };
    const defaultBrandAssets = {
      logo: "/assets/images/garneta-basket-logo.svg",
      watermark: "/assets/images/basket-watermark.svg",
      opacity: 14,
      size: 44,
      text: "",
      textSize: 4,
      textColor: "#8df7df"
    };

    function currentTheme() {
      try {
        return { ...defaultTheme, ...JSON.parse(localStorage.getItem("themeColors") || "{}") };
      } catch (error) {
        return { ...defaultTheme };
      }
    }

    function currentBrandAssets() {
      try {
        return { ...defaultBrandAssets, ...JSON.parse(localStorage.getItem("brandAssets") || "{}") };
      } catch (error) {
        return { ...defaultBrandAssets };
      }
    }

    function applyBrandAssets(assets = currentBrandAssets()) {
      const logo = el("brand-logo");
      const watermark = el("page-watermark");
      if (logo) logo.src = assets.logo || defaultBrandAssets.logo;
      if (watermark) {
        watermark.style.backgroundImage = `url("${assets.watermark || defaultBrandAssets.watermark}")`;
        watermark.style.opacity = String(Math.max(0, Math.min(Number(assets.opacity ?? defaultBrandAssets.opacity), 35)) / 100);
        watermark.style.setProperty("--watermark-size", `${Math.max(20, Math.min(Number(assets.size ?? defaultBrandAssets.size), 95))}vw`);
      }
      const watermarkText = el("page-watermark-text");
      if (watermarkText) {
        watermarkText.textContent = assets.text || "";
        watermarkText.style.setProperty("--watermark-text-size", `${Math.max(1, Math.min(Number(assets.textSize ?? defaultBrandAssets.textSize), 9))}vw`);
        watermarkText.style.setProperty("--watermark-text-color", assets.textColor || defaultBrandAssets.textColor);
      }
    }

    function applyTheme(theme = currentTheme()) {
      const root = document.documentElement;
      const mode = resolveThemeMode(theme);
      const isLight = mode === "light";
      const text = isLight ? "#132227" : "#e8fbff";
      const muted = isLight ? "#52646a" : "#8fb4bd";
      const panel = isLight ? "rgba(255,255,255,.88)" : "rgba(255,255,255,.055)";
      const panel2 = isLight ? "rgba(255,255,255,.74)" : "rgba(255,255,255,.028)";
      const field = isLight ? "rgba(255,255,255,.9)" : "rgba(6,19,24,.68)";
      const topbar = isLight ? "rgba(255,255,255,.86)" : "rgba(9,28,34,.86)";
      const sidebarDark = isReadableLight(theme.green) ? "#0b242a" : theme.green;
      root.style.setProperty("--green", theme.green);
      root.style.setProperty("--orange", theme.orange);
      root.style.setProperty("--page", theme.page);
      root.style.setProperty("--text", text);
      root.style.setProperty("--dark", text);
      root.style.setProperty("--soft-text", muted);
      root.style.setProperty("--card-bg", `linear-gradient(145deg, ${panel}, ${panel2})`);
      root.style.setProperty("--field-bg", field);
      root.style.setProperty("--topbar-bg", topbar);
      root.style.setProperty("--sidebar-bg", `linear-gradient(180deg, ${sidebarDark}, #08181d)`);
      root.style.setProperty("--nav-text", "#e8fbff");
      root.style.setProperty("--mint", softenColor(theme.green, "#bbf7d0"));
      root.style.setProperty("--line", softenColor(theme.green, "#dbe7dc"));
    }

    function bindThemeTools() {
      if (!el("theme-green")) return;
      const theme = currentTheme();
      el("theme-mode").value = theme.mode;
      el("theme-green").value = theme.green;
      el("theme-orange").value = theme.orange;
      el("theme-page").value = theme.page;
      updateThemePreview();

      ["theme-mode", "theme-green", "theme-orange", "theme-page"].forEach((id) => {
        el(id)?.addEventListener("input", () => {
          const next = readThemeInputs();
          applyTheme(next);
          updateThemePreview();
        });
      });

      el("save-theme-colors")?.addEventListener("click", () => {
        const next = readThemeInputs();
        localStorage.setItem("themeColors", JSON.stringify(next));
        applyTheme(next);
      });

      el("reset-theme-colors")?.addEventListener("click", () => {
        localStorage.removeItem("themeColors");
        applyTheme(defaultTheme);
        el("theme-mode").value = defaultTheme.mode;
        el("theme-green").value = defaultTheme.green;
        el("theme-orange").value = defaultTheme.orange;
        el("theme-page").value = defaultTheme.page;
        updateThemePreview();
      });
    }

    function bindBrandTools() {
      if (!el("brand-logo-upload")) return;
      const assets = currentBrandAssets();
      setBrandPreview(assets);

      el("brand-logo-upload")?.addEventListener("change", async (event) => {
        try {
          const file = event.target.files[0];
          if (!file) return;
          const next = { ...currentBrandAssets(), logo: await readAssetFile(file) };
          setBrandPreview(next);
          applyBrandAssets(next);
        } catch (error) {
          alert(error.message);
        }
      });

      el("watermark-upload")?.addEventListener("change", async (event) => {
        try {
          const file = event.target.files[0];
          if (!file) return;
          const next = { ...currentBrandAssets(), watermark: await readAssetFile(file) };
          setBrandPreview(next);
          applyBrandAssets(next);
        } catch (error) {
          alert(error.message);
        }
      });

      el("watermark-opacity")?.addEventListener("input", () => {
        const next = { ...collectBrandInputs(), opacity: Number(el("watermark-opacity").value) };
        setBrandPreview(next);
        applyBrandAssets(next);
      });

      el("watermark-size")?.addEventListener("input", () => {
        const next = { ...collectBrandInputs(), size: Number(el("watermark-size").value) };
        setBrandPreview(next);
        applyBrandAssets(next);
      });

      el("watermark-text")?.addEventListener("input", () => {
        const next = { ...collectBrandInputs(), text: el("watermark-text").value };
        setBrandPreview(next);
        applyBrandAssets(next);
      });

      el("watermark-text-size")?.addEventListener("input", () => {
        const next = { ...collectBrandInputs(), textSize: Number(el("watermark-text-size").value) };
        setBrandPreview(next);
        applyBrandAssets(next);
      });

      el("watermark-text-color")?.addEventListener("input", () => {
        const next = { ...collectBrandInputs(), textColor: el("watermark-text-color").value };
        setBrandPreview(next);
        applyBrandAssets(next);
      });

      el("save-brand-assets")?.addEventListener("click", () => {
        const next = collectBrandInputs();
        localStorage.setItem("brandAssets", JSON.stringify(next));
        applyBrandAssets(next);
        alert("Logo dan watermark berhasil disimpan.");
      });

      el("clear-watermark-text")?.addEventListener("click", () => {
        el("watermark-text").value = "";
        const next = { ...collectBrandInputs(), text: "" };
        localStorage.setItem("brandAssets", JSON.stringify(next));
        setBrandPreview(next);
        applyBrandAssets(next);
      });

      el("reset-brand-assets")?.addEventListener("click", () => {
        localStorage.removeItem("brandAssets");
        el("brand-logo-upload").value = "";
        el("watermark-upload").value = "";
        setBrandPreview(defaultBrandAssets);
        applyBrandAssets(defaultBrandAssets);
      });
    }

    function collectBrandInputs() {
      const assets = currentBrandAssets();
      return {
        logo: el("logo-preview")?.dataset.image || assets.logo || defaultBrandAssets.logo,
        watermark: el("watermark-preview")?.dataset.image || assets.watermark || defaultBrandAssets.watermark,
        opacity: Number(el("watermark-opacity")?.value || assets.opacity || defaultBrandAssets.opacity),
        size: Number(el("watermark-size")?.value || assets.size || defaultBrandAssets.size),
        text: el("watermark-text")?.value ?? assets.text ?? defaultBrandAssets.text,
        textSize: Number(el("watermark-text-size")?.value || assets.textSize || defaultBrandAssets.textSize),
        textColor: el("watermark-text-color")?.value || assets.textColor || defaultBrandAssets.textColor
      };
    }

    function setBrandPreview(assets) {
      const next = { ...defaultBrandAssets, ...assets };
      const logoPreview = el("logo-preview");
      const watermarkPreview = el("watermark-preview");
      if (logoPreview) {
        logoPreview.style.backgroundImage = `url("${next.logo}")`;
        logoPreview.dataset.image = next.logo;
      }
      if (watermarkPreview) {
        watermarkPreview.style.backgroundImage = `url("${next.watermark}")`;
        watermarkPreview.style.opacity = String(Math.max(0.18, Number(next.opacity || defaultBrandAssets.opacity) / 100));
        watermarkPreview.dataset.image = next.watermark;
      }
      if (el("watermark-opacity")) el("watermark-opacity").value = Number(next.opacity || defaultBrandAssets.opacity);
      if (el("watermark-opacity-label")) el("watermark-opacity-label").textContent = `${Number(next.opacity || defaultBrandAssets.opacity)}%`;
      if (el("watermark-size")) el("watermark-size").value = Number(next.size || defaultBrandAssets.size);
      if (el("watermark-size-label")) el("watermark-size-label").textContent = `${Number(next.size || defaultBrandAssets.size)}%`;
      if (el("watermark-text")) el("watermark-text").value = next.text || "";
      if (el("watermark-text-size")) el("watermark-text-size").value = Number(next.textSize || defaultBrandAssets.textSize);
      if (el("watermark-text-size-label")) el("watermark-text-size-label").textContent = `${Number(next.textSize || defaultBrandAssets.textSize)}vw`;
      if (el("watermark-text-color")) el("watermark-text-color").value = next.textColor || defaultBrandAssets.textColor;
    }

    function readAssetFile(file) {
      const maxBytes = 1_500_000;
      if (file.size > maxBytes) throw new Error("Ukuran gambar maksimal 1.5 MB agar aplikasi tetap ringan.");
      return readFileAsDataUrl(file);
    }

    function readThemeInputs() {
      return {
        mode: el("theme-mode")?.value || defaultTheme.mode,
        green: el("theme-green")?.value || defaultTheme.green,
        orange: el("theme-orange")?.value || defaultTheme.orange,
        page: el("theme-page")?.value || defaultTheme.page
      };
    }

    function updateThemePreview() {
      const preview = el("theme-preview");
      if (!preview) return;
      const theme = readThemeInputs();
      preview.style.background = `linear-gradient(135deg, ${theme.green}, ${theme.orange})`;
    }

    function bindBackupTools() {
      el("export-excel")?.addEventListener("click", exportExcel);
      el("export-pdf")?.addEventListener("click", exportPdf);
      el("download-backup")?.addEventListener("click", downloadBackup);
      el("restore-backup")?.addEventListener("click", restoreBackup);
    }

    function bindPwaTools() {
      el("install-pwa")?.addEventListener("click", async () => {
        if (!deferredInstallPrompt) {
          alert("Jika tombol install belum tersedia, buka menu browser lalu pilih Add to Home Screen / Install App.");
          return;
        }
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
      });
    }

    function workbookRows() {
      return {
        Barang: state.data.products || [],

        Pembelian: state.data.purchases || [],
        Penjualan: state.data.sales || [],
        RiwayatHarga: state.data.priceHistory || [],
        AuditLog: state.data.auditLogs || []
      };
    }

    function exportExcel() {
      if (!window.XLSX) {
        alert("Library Excel belum termuat. Pastikan internet aktif atau gunakan backup JSON.");
        return;
      }
      const workbook = XLSX.utils.book_new();
      Object.entries(workbookRows()).forEach(([name, rows]) => {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
      });
      XLSX.writeFile(workbook, `inventory-${today()}.xlsx`);
    }

    function exportPdf() {
      const rows = workbookRows();
      const html = Object.entries(rows).map(([title, items]) => `
        <h2>${title}</h2>
        ${simpleTable(items.slice(0, 100), Object.keys(items[0] || { kosong: "" }), Object.keys(items[0] || { kosong: "Data" }))}
      `).join("");
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`<html><head><title>Export GARNETA SYSTEM</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin-bottom:24px}td,th{border:1px solid #ccc;padding:6px;font-size:11px;text-align:left}h2{margin-top:24px}</style></head><body><h1>GARNETA SYSTEM</h1>${html}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }

    async function downloadBackup() {
      try {
        const backup = await gas("backupData");
        downloadText(`backup-inventory-${today()}.json`, JSON.stringify(backup, null, 2), "application/json");
        await load();
      } catch (error) {
        alert(error.message);
      }
    }

    async function restoreBackup() {
      try {
        const file = el("restore-backup-file")?.files[0];
        if (!file) throw new Error("Pilih file backup JSON terlebih dahulu.");
        if (!confirm("Restore akan mengganti data database dengan isi backup. Lanjutkan?")) return;
        const backup = JSON.parse(await file.text());
        state.data = await gas("restoreData", { backup });
        renderShell();
        render();
        alert("Restore berhasil.");
      } catch (error) {
        alert(error.message);
      }
    }

    function downloadText(filename, text, type = "text/plain") {
      const blob = new Blob([text], { type });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    }

    function resolveThemeMode(theme) {
      if (theme.mode === "light" || theme.mode === "dark") return theme.mode;
      return isReadableLight(theme.page) ? "light" : "dark";
    }

    function isReadableLight(hexColor) {
      const hex = String(hexColor || "").replace("#", "");
      if (!/^[0-9a-f]{6}$/i.test(hex)) return false;
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const linear = (value) => value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
      const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
      return luminance > 0.52;
    }

    function softenColor(value, fallback) {
      const hex = String(value || "").replace("#", "");
      if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const mix = (channel) => Math.round(channel + (255 - channel) * 0.75).toString(16).padStart(2, "0");
      return `#${mix(r)}${mix(g)}${mix(b)}`;
    }

    async function loadAiSettings(providerOverride) {
      try {
        const selectedProvider = typeof providerOverride === "string"
          ? providerOverride
          : (el("ai-provider")?.value || undefined);
        const settings = await gas("aiSettings", { provider: selectedProvider });
        const allSettings = await gas("aiSettingsAll");
        const keyRows = renderApiKeyLayers(allSettings.keys || []);
        const providerRows = renderProviderSummaries(allSettings.providers || []);
        el("ai-settings-panel").innerHTML = `
          <div class="api-badges">
            <span class="api-badge">PROVIDER: ${settings.provider.toUpperCase()}</span>
            <span class="api-badge">MODEL: AUTO (${settings.model})</span>
            <span class="api-badge ${allSettings.liveKeys ? "ok" : "warn"}">LIVE: ${allSettings.liveKeys}/${allSettings.totalKeys || 0}</span>
            <span class="api-badge ${allSettings.deadKeys ? "warn" : "ok"}">DEAD: ${allSettings.deadKeys}</span>
            <span class="api-badge warn">PENDING: ${allSettings.pendingKeys || 0}</span>
          </div>
          <div class="api-key-list">${providerRows}</div>
          <div class="api-key-box">
            <details>
              <summary style="cursor:pointer; font-weight:bold; color:var(--mint); margin-bottom:8px;">▾ LIHAT DAFTAR API KEY LENGKAP</summary>
              <div class="api-key-list">${keyRows}</div>
            </details>
          </div>
          <form id="ai-settings-form" class="api-form-grid" style="grid-template-columns: repeat(2, minmax(0, 1fr)); align-items:end; gap:10px;">
            <label>Provider AI
              <select id="ai-provider">
                <option value="gemini" ${settings.provider === "gemini" ? "selected" : ""}>Gemini</option>
                <option value="openai" ${settings.provider === "openai" ? "selected" : ""}>OpenAI</option>
                <option value="groq" ${settings.provider === "groq" ? "selected" : ""}>Groq</option>
                <option value="deepseek" ${settings.provider === "deepseek" ? "selected" : ""}>DeepSeek</option>
                <option value="kie" ${settings.provider === "kie" ? "selected" : ""}>Kie AI (OpenAI Compatible)</option>
              </select>
            </label>
            <label>Model
              <input id="ai-model" value="auto" placeholder="auto / gemini-2.5-flash" title="Kosongkan atau isi auto agar backend memilih model terbaik bawaan provider.">
            </label>
            <button class="api-primary" type="submit" style="grid-column: 1/-1;">SIMPAN PROVIDER AKTIF</button>
          </form>
          <div class="api-warning">
            Pilih Provider AI utama yang akan digunakan untuk asisten. Pastikan Anda sudah menambahkan API Key-nya di atas.
          </div>
          <div class="api-warning">
            Analisa foto hanya memakai provider vision: Gemini, OpenAI, dan Groq. DeepSeek disimpan untuk fallback teks dan tidak dikirim gambar.
          </div>
        `;
        bindAiSettingsForm();
        bindAiKeyLayerActions();
      } catch (error) {
        el("ai-settings-panel").innerHTML = `<p class="muted">${error.message}</p>`;
      }
    }

    function renderProviderSummaries(providers) {
      return providers.map((provider) => `
        <div class="api-key-item">
          <span><strong>${provider.providerLabel}</strong><br><small>${provider.totalKeys} key tersimpan, ${provider.liveKeys} LIVE, ${provider.deadKeys} DEAD</small></span>
          <span class="api-badge ${provider.totalKeys ? "ok" : "warn"}">${provider.totalKeys ? "TERDAFTAR" : "KOSONG"}</span>
        </div>
      `).join("");
    }

    function renderApiKeyLayers(keys) {
      if (!keys.length) {
        return `<div class="api-key-item"><span>Belum ada layer API key tersimpan.</span><span class="api-badge warn">EMPTY</span></div>`;
      }

      return keys.map((key) => `
        <div class="api-key-item" id="api-row-${key.id}" style="display:grid">
          <div class="api-key-display-row">
            <span>
              <strong>${key.providerLabel}</strong> LAYER ${key.layer} · ${key.masked}<br>
              <small>Model otomatis: ${key.model}${key.message ? ` - ${key.message}` : ""}</small>
            </span>
            <span class="actions">
              <button class="btn soft edit-ai-key" data-provider="${key.provider}" data-key-id="${key.id}" type="button">EDIT</button>
              <span class="api-badge ${key.status === "live" ? "ok" : "warn"}">${key.status.toUpperCase()}</span>
              ${key.status === "dead" ? `<button class="btn danger delete-ai-key" data-provider="${key.provider}" data-key-id="${key.id}" type="button">Hapus</button>` : ""}
            </span>
          </div>
          <div class="edit-overlay api-edit-overlay" id="edit-mode-${key.id}">
            <input class="edit-ai-key-input" type="password" placeholder="Masukkan API key pengganti">
            <button class="btn primary save-ai-key-edit" data-provider="${key.provider}" data-key-id="${key.id}" type="button">SAVE</button>
            <button class="btn soft cancel-ai-key-edit" data-key-id="${key.id}" type="button">CANCEL</button>
          </div>
        </div>
      `).join("");
    }

    function bindAiKeyLayerActions() {
      document.querySelectorAll(".edit-ai-key").forEach((button) => {
        button.addEventListener("click", () => openEditMode(button.dataset.keyId));
      });

      document.querySelectorAll(".cancel-ai-key-edit").forEach((button) => {
        button.addEventListener("click", () => cancelEdit(button.dataset.keyId));
      });

      document.querySelectorAll(".save-ai-key-edit").forEach((button) => {
        button.addEventListener("click", () => saveEdit(button.dataset.keyId, button.dataset.provider));
      });

      document.querySelectorAll(".delete-ai-key").forEach((button) => {
        button.addEventListener("click", async () => {
          const target = el("ai-settings-test-result");
          try {
            target.textContent = "Menghapus API key DEAD...";
            await gas("deleteAiKey", {
              provider: button.dataset.provider,
              keyId: button.dataset.keyId
            });
            target.textContent = "API key DEAD berhasil dihapus.";
            await loadAiSettings(el("ai-provider")?.value);
          } catch (error) {
            target.textContent = error.message;
          }
        });
      });
    }

    function openEditMode(id) {
      document.querySelectorAll(".edit-overlay").forEach((panel) => panel.classList.remove("active"));
      el(`edit-mode-${id}`)?.classList.add("active");
    }

    function cancelEdit(id) {
      const panel = el(`edit-mode-${id}`);
      panel?.classList.remove("active");
      const input = panel?.querySelector(".edit-ai-key-input");
      if (input) input.value = "";
    }

    async function saveEdit(id, provider) {
      const panel = el(`edit-mode-${id}`);
      const input = panel?.querySelector(".edit-ai-key-input");
      const target = el("ai-settings-test-result");
      try {
        target.textContent = "Menyimpan edit API key...";
        await gas("editAiKey", {
          provider,
          keyId: id,
          apiKey: input?.value || ""
        });
        target.textContent = "API key berhasil diperbarui.";
        cancelEdit(id);
        await loadAiSettings(el("ai-provider")?.value);
      } catch (error) {
        target.textContent = error.message;
      }
    }

    function bindAiSettingsForm() {
      const providerInput = el("ai-provider");
      const modelInput = el("ai-model");
      const form = el("ai-settings-form");

      providerInput?.addEventListener("change", () => {
        modelInput.value = "auto";
        loadAiSettings(providerInput.value);
      });

      form?.addEventListener("submit", saveAiSettings);
    }

    function renderAiKeyInputs(values) {
      const container = el("ai-key-input-list");
      if (!container) return;
      container.innerHTML = "";
      const safeValues = (values || [""]).slice(0, 10);
      safeValues.forEach((value) => addAiKeyInput(value));
    }

    function addAiKeyInput(value = "") {
      const container = el("ai-key-input-list");
      if (!container || container.children.length >= 10) return;
      const row = document.createElement("div");
      row.className = "api-key-input-row";
      row.innerHTML = `
        <input class="ai-key-input" data-hidden="true" type="password" value="${escapeAttr(value)}" placeholder="Masukkan API Key...">
        <span class="api-badge warn">PENDING</span>
        <button class="btn soft remove-ai-key" type="button">HAPUS</button>
      `;
      row.querySelector(".remove-ai-key").addEventListener("click", () => {
        row.remove();
        if (!container.children.length) addAiKeyInput();
      });
      row.querySelector(".ai-key-input").addEventListener("input", () => {
        const inputs = [...container.querySelectorAll(".ai-key-input")];
        const isLast = inputs[inputs.length - 1] === row.querySelector(".ai-key-input");
        if (isLast && row.querySelector(".ai-key-input").value.trim() && container.children.length < 10) {
          addAiKeyInput();
        }
      });
      container.appendChild(row);
    }

    function collectAiKeyValues() {
      return [...document.querySelectorAll(".ai-key-input")]
        .map((input) => input.value.trim())
        .filter(Boolean)
        .slice(0, 10);
    }

    async function saveAiSettings(event) {
      event.preventDefault();
      const target = el("ai-settings-test-result");
      try {
        target.textContent = "Menyimpan API settings...";
        await gas("saveAiSettings", {
          provider: el("ai-provider").value,
          model: el("ai-model").value
        });
        target.textContent = "API settings berhasil disimpan.";
        await loadAiSettings(el("ai-provider").value);
      } catch (error) {
        target.textContent = error.message;
      }
    }

    window.saveOmniApiKey = async function() {
      const target = el("api-settings-test-result") || document.createElement("div"); // fallback
      try {
        const provider = el("api-key-provider").value;
        const name = el("api-key-name").value;
        const apiKey = el("api-key-value").value;
        const baseUrl = el("api-key-url").value;

        if (!provider || !name || !apiKey) {
          alert("Pilih provider, isi nama akun, dan API key.");
          return;
        }

        await gas("addAiKey", { provider, name, apiKey, baseUrl });
        alert("Kunci API berhasil ditambahkan!");
        
        // Reset form dan hide
        el("api-key-form").reset();
        document.getElementById('api-key-form-container').classList.add('hidden');
        
        // Reload settings
        await loadAiSettings(el("ai-provider")?.value || "gemini");
      } catch (error) {
        alert("Gagal menyimpan kunci: " + error.message);
      }
    };

    async function testAiSettings() {
      const target = el("ai-settings-test-result");
      try {
        target.textContent = "Menguji koneksi API...";
        const result = await gas("testAiSettings", {
          provider: el("ai-provider")?.value
        });
        const dead = (result.keys || []).filter((key) => key.status === "dead").length;
        target.textContent = `${result.message} Provider: ${result.provider}, Model: ${result.model}, Dead: ${dead}`;
        await loadAiSettings(el("ai-provider")?.value);
      } catch (error) {
        target.textContent = error.message === "API_KEY_NOT_CONFIGURED_ON_RAILWAY"
          ? "API key belum diatur. Isi dari halaman Pusat API lalu simpan."
          : error.message;
      }
    }

    function bindInvoiceAiTools() {
      el("analyze-invoice-file")?.addEventListener("click", async () => {
        try {
          const file = el("invoice-image-file").files[0];
          if (!file) throw new Error("Pilih file foto nota terlebih dahulu.");
          const imageDataUrl = await readAndCompressImage(file);
          await analyzeInvoiceImage(imageDataUrl);
        } catch (error) {
          alert(error.message);
        }
      });

      el("open-invoice-camera")?.addEventListener("click", openInvoiceCamera);
      el("close-invoice-camera")?.addEventListener("click", closeInvoiceCamera);
      el("capture-invoice-photo")?.addEventListener("click", async () => {
        try {
          const imageDataUrl = await compressImageDataUrl(captureInvoiceFrame());
          await analyzeInvoiceImage(imageDataUrl);
        } catch (error) {
          alert(error.message);
        }
      });

      el("copy-invoice-result")?.addEventListener("click", async () => {
        try {
          const text = el("invoice-ai-result")?.value || "";
          if (!text.trim()) throw new Error("Belum ada hasil untuk dicopy.");
          await navigator.clipboard.writeText(text);
          alert("Hasil berhasil dicopy.");
        } catch (error) {
          alert(error.message);
        }
      });

      el("parse-invoice-draft")?.addEventListener("click", () => {
        try {
          const rows = parseInvoiceDraftFromText(el("invoice-ai-result")?.value || "");
          saveInvoiceDraftRows([...rows, ...invoiceDraftRows()]);
          refreshInvoiceDraftTable();
        } catch (error) {
          alert(error.message);
        }
      });

      el("save-invoice-draft")?.addEventListener("click", saveInvoiceDraft);
      el("clear-invoice-draft")?.addEventListener("click", () => {
        if (!confirm("Kosongkan draft nota?")) return;
        saveInvoiceDraftRows([]);
        refreshInvoiceDraftTable();
      });
      bindInvoiceDraftTable();
    }

    async function analyzeInvoiceImage(imageDataUrl) {
      el("invoice-ai-result").value = "Menganalisa foto nota...";
      const result = await gas("analyzeInvoiceImage", {
        imageDataUrl,
        instruction: el("invoice-ai-instruction")?.value || invoiceJsonInstruction()
      });
      el("invoice-ai-result").value = result?.hasil || JSON.stringify(result, null, 2);
      try {
        const rows = parseInvoiceDraftFromText(el("invoice-ai-result").value);
        saveInvoiceDraftRows([...rows, ...invoiceDraftRows()]);
        refreshInvoiceDraftTable();
      } catch (error) {
        // Hasil bebas tetap boleh dipakai sebagai teks biasa.
      }
    }

    function invoiceJsonInstruction() {
      return `Ekstrak nota menjadi JSON murni: {"tanggal":"DD/MM/YY","items":[{"nama_barang":"string","kuantitas":number,"harga_modal":number,"tipe_harga":"H.M/pcs atau H.M/dus atau sst"}],"total_belanja":number,"status":"success atau review_required"}. Jangan tambah teks lain.`;
    }

    function bindInvoiceDraftTable() {
      document.querySelectorAll("#invoice-draft-table [data-draft-field]").forEach((input) => {
        input.addEventListener("change", collectInvoiceDraftFromTable);
      });
      document.querySelectorAll(".delete-invoice-draft").forEach((button) => {
        button.addEventListener("click", () => {
          saveInvoiceDraftRows(collectInvoiceDraftFromTable().filter((row) => String(row.id) !== String(button.dataset.id)));
          refreshInvoiceDraftTable();
        });
      });
    }

    async function saveInvoiceDraft() {
      try {
        const rows = collectInvoiceDraftFromTable().filter((row) => row.name);
        if (!rows.length) throw new Error("Draft masih kosong.");
        let total = 0;
        for (const row of rows) {
          total += Number(row.basePrice || 0) * Number(row.stock || 0);
          const existing = findProduct(row.name);
          if (existing) {
            await gas("update", { collection: "products", id: existing.id, item: { ...existing, ...row } });
          } else {
            await gas("add", { collection: "products", item: row });
          }
        }
        await gas("add", {
          collection: "purchases",
          item: {
            date: today(),
            invoice: `DRAFT-${Date.now()}`,
            total,
            notes: "Dari draft AI nota"
          }
        });
        saveInvoiceDraftRows([]);
        await load();
        alert("Draft berhasil disimpan ke Barang dan Pembelian.");
      } catch (error) {
        alert(error.message);
      }
    }

    async function openInvoiceCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Browser belum mendukung akses kamera.");
        const video = el("invoice-camera-video");
        invoiceStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = invoiceStream;
        video.classList.remove("hidden");
        el("capture-invoice-photo").classList.remove("hidden");
        el("close-invoice-camera").classList.remove("hidden");
        await video.play();
      } catch (error) {
        alert(error.message);
      }
    }

    function captureInvoiceFrame() {
      const video = el("invoice-camera-video");
      const canvas = el("invoice-canvas");
      if (!video?.videoWidth) throw new Error("Kamera belum siap.");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.92);
    }

    function closeInvoiceCamera() {
      if (invoiceStream) {
        invoiceStream.getTracks().forEach((track) => track.stop());
        invoiceStream = null;
      }
      const video = el("invoice-camera-video");
      if (video) {
        video.pause();
        video.srcObject = null;
        video.classList.add("hidden");
      }
      el("capture-invoice-photo")?.classList.add("hidden");
      el("close-invoice-camera")?.classList.add("hidden");
    }

    function bindPembelianTools() {
      // Parse WA text for Pembelian
      el("parse-pembelian-wa")?.addEventListener("click", () => {
        const text = el("pembelian-wa-text")?.value || "";
        const rows = parsePembelianWAText(text);
        if (!rows.length) {
          alert("Tidak ada data yang bisa diproses. Pastikan format: NamaBarang Qty Harga");
          return;
        }
        el("pembelian-wa-preview").innerHTML = renderPembelianWAPreview(rows);
        
        // Bind delete buttons
        document.querySelectorAll(".delete-wa-item").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            const currentRows = collectPembelianWAData().filter(r => String(r.id) !== String(id));
            el("pembelian-wa-preview").innerHTML = renderPembelianWAPreview(currentRows);
          });
        });
        
        // Bind save button
        el("save-pembelian-wa")?.addEventListener("click", savePembelianWA);
        
        // Bind clear preview button
        el("clear-pembelian-wa-preview")?.addEventListener("click", () => {
          el("pembelian-wa-preview").innerHTML = '<p class="muted">Preview dikosongkan.</p>';
        });
      });
      
      // Clear WA text
      el("clear-pembelian-wa")?.addEventListener("click", () => {
        el("pembelian-wa-text").value = "";
        el("pembelian-wa-preview").innerHTML = '<p class="muted">Preview dikosongkan.</p>';
      });
    }

    function bindProductTools() {
      el("parse-products-wa")?.addEventListener("click", async () => {
        try {
          const rows = parseProductText(el("product-wa-text").value);
          if (!rows.length) throw new Error("Tidak ada data barang yang bisa diproses.");
          await importProducts(rows);
        } catch (error) {
          alert(error.message);
        }
      });

      el("import-products-file")?.addEventListener("click", async () => {
        try {
          const file = el("product-import-file").files[0];
          if (!file) throw new Error("Pilih file CSV atau Excel terlebih dahulu.");
          const rows = await readProductFile(file);
          if (!rows.length) throw new Error("File tidak berisi data barang yang valid.");
          await importProducts(rows);
        } catch (error) {
          alert(error.message);
        }
      });

      el("save-scanned-product")?.addEventListener("click", async () => {
        try {
          const item = {
            barcode: el("scanner-result").value.trim(),
            name: el("scanner-product-name").value.trim() || el("scanner-result").value.trim(),
            category: el("scanner-product-category").value || "Umum",
            unit: el("scanner-unit").value,
            unitContent: plainNumber(el("scanner-unit-content").value) || 1,
            basePrice: plainNumber(el("scanner-base-price").value),
            salePrice: plainNumber(el("scanner-sale-price").value),
            stock: plainNumber(el("scanner-stock").value)
          };
          await gas("add", { collection: "products", item });
          await stopScanner();
          await load();
        } catch (error) {
          alert(error.message);
        }
      });

      el("start-product-scanner")?.addEventListener("click", startScanner);
      el("stop-product-scanner")?.addEventListener("click", stopScanner);
    }

    // Parse text from WA for Pembelian (format: NamaBarang Qty Harga)
    function parsePembelianWAText(text) {
      return String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
        // Format: NamaBarang Qty Harga (e.g., "Beras Premium 5 250000")
        const parts = line.split(/\s+/);
        if (parts.length < 3) return null;
        
        // Last part is price, second last is qty, rest is name
        const harga = plainNumber(parts.pop());
        const qty = plainNumber(parts.pop());
        const nama = parts.join(" ");
        
        if (!nama || !qty || !harga) return null;
        
        // Find existing product
        const product = findProduct(nama);
        
        return {
          id: Date.now() + Math.random(),
          name: nama,
          qty: qty,
          amount: harga,
          basePriceEcer: product ? Math.round(harga / qty) : 0, // Calculate ecer price
          productId: product?.id || null,
          existingProduct: !!product
        };
      }).filter(Boolean);
    }

    // Render preview table for WA paste
    function renderPembelianWAPreview(rows) {
      if (!rows.length) return '<p class="muted">Belum ada data. Paste dari WA dan klik Proses.</p>';
      
      return `<div class="table-wrap"><table>
        <thead><tr><th>Nama Barang</th><th>Qty</th><th>Harga Total</th><th>Harga Ecer</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${rows.map((row) => `
          <tr data-wa-id="${row.id}">
            <td><input data-wa-field="name" value="${escapeAttr(row.name)}" style="width:100%"></td>
            <td><input data-wa-field="qty" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(row.qty)}" style="width:60px"></td>
            <td><input data-wa-field="amount" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(row.amount)}" style="width:100px"></td>
            <td><input data-wa-field="basePriceEcer" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(row.basePriceEcer)}" style="width:100px"></td>
            <td>${row.existingProduct ? '<span class="api-badge ok">Update</span>' : '<span class="api-badge warn">Baru</span>'}</td>
            <td><button class="btn danger delete-wa-item" data-id="${row.id}" type="button">Hapus</button></td>
          </tr>
        `).join("")}</tbody>
      </table></div>
      <div class="actions" style="grid-column: 1 / -1; position:sticky; bottom:-16px; background:var(--card-bg); padding:16px; margin: 16px -16px -16px -16px; border-top:1px solid rgba(255,255,255,0.05); z-index:10; display:flex; justify-content:flex-end; gap:8px; border-radius:0 0 16px 16px; box-shadow:0 -20px 40px rgba(0,0,0,0.3); backdrop-filter:blur(10px);">
        <button class="btn soft" id="clear-pembelian-wa-preview" style="padding:12px 16px;">Kosongkan</button>
        <button class="btn primary" id="save-pembelian-wa" style="flex:1; font-size:1.1rem; padding:12px 16px; box-shadow:0 4px 12px rgba(0,255,204,0.3);">💾 Simpan & Update Harga</button>
      </div>
      <p class="muted">Barang yang sudah ada akan update harga dasar dan harga ecer. Barang baru akan ditambahkan ke database.</p>`;
    }

    // Collect data from WA preview table
    function collectPembelianWAData() {
      const rows = [];
      document.querySelectorAll("tr[data-wa-id]").forEach((tr) => {
        const row = { id: tr.dataset.waId };
        tr.querySelectorAll("[data-wa-field]").forEach((input) => {
          row[input.dataset.waField] = input.type === "number" ? Number(String(input.value).replace(/[^0-9-]/g, '')) : input.value;
        });
        rows.push(row);
      });
      return rows;
    }

    // Save WA data to products and purchases
    async function savePembelianWA() {
      try {
        const rows = collectPembelianWAData();
        if (!rows.length) throw new Error("Tidak ada data untuk disimpan.");
        
        let total = 0;
        let updated = 0;
        let added = 0;
        
        for (const row of rows) {
          total += Number(row.amount || 0);
          const existing = findProduct(row.name);
          
          if (existing) {
            // Update existing product
            await gas("update", { 
              collection: "products", 
              id: existing.id, 
              item: { 
                ...existing, 
                basePrice: Number(row.amount || 0),
                basePriceEcer: Number(row.basePriceEcer || 0)
              } 
            });
            updated++;
          } else {
            // Add new product
            await gas("add", { 
              collection: "products", 
              item: {
                name: row.name,
                category: "Umum",
                unit: "pcs",
                unitContent: 1,
                basePrice: Number(row.amount || 0),
                basePriceEcer: Number(row.basePriceEcer || 0),
                salePrice: 0,
                stock: Number(row.qty || 0),
                barcode: ""
              }
            });
            added++;
          }
          
          // Add to price history for statistics
          await gas("add", {
            collection: "priceHistory",
            item: {
              productName: row.name,
              basePrice: Number(row.amount || 0),
              unitContent: Number(row.qty || 1),
              source: "WA Paste",
              recordedAt: new Date().toISOString()
            }
          });
        }
        
        // Add purchase record
        await gas("add", {
          collection: "purchases",
          item: {
            date: today(),
            supplier: "WA Import",
            product: rows.map(r => r.name).join(", "),
            qty: rows.reduce((sum, r) => sum + Number(r.qty || 0), 0),
            amount: total,
            notes: `Import dari WA: ${rows.length} barang`
          }
        });
        
        await load();
        alert(`Berhasil! ${updated} barang diupdate, ${added} barang baru ditambahkan.`);
        el("pembelian-wa-preview").innerHTML = '<p class="muted">Data berhasil disimpan. Paste data baru untuk mengimpor lagi.</p>';
        el("pembelian-wa-text").value = "";
      } catch (error) {
        alert(error.message);
      }
    }

    function bindShoppingTools() {
      const form = el("shopping-form");
      form?.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const id = formData.get("id") || Date.now() + Math.random();
        const name = formData.get("name").trim();
        const product = findProduct(name);
        const qty = Number(String(formData.get("qty")).replace(/[^0-9-]/g, ""));
        const amount = Number(String(formData.get("amount")).replace(/[^0-9-]/g, "")) || Number(product?.basePrice || 0);
        const next = { id, name, unit: product?.unit || "", qty, amount, subtotal: qty * amount };
        const rows = shoppingRows();
        const exists = rows.some((row) => String(row.id) === String(id));
        saveShoppingRows(exists ? rows.map((row) => String(row.id) === String(id) ? next : row) : [next, ...rows]);
        render();
      });

      form?.elements.name?.addEventListener("input", () => {
        const product = findProduct(form.elements.name.value);
        if (product) form.elements.amount.value = product.basePrice;
      });

      el("parse-shopping-wa")?.addEventListener("click", () => {
        const rows = parseShoppingText(el("shopping-wa-text").value);
        if (!rows.length) {
          alert("Tidak ada daftar belanja yang bisa diproses.");
          return;
        }
        saveShoppingRows([...rows, ...shoppingRows()]);
        render();
      });

      el("clear-shopping")?.addEventListener("click", () => {
        if (!confirm("Kosongkan kalkulator belanja?")) return;
        saveShoppingRows([]);
        render();
      });
    }

    function fillForm(collection, id) {
      let form = document.querySelector(`form[data-form="${collection}"]`);
      if (!form) {
        if (collection === 'products') window.barangWorkspace = 'form';
        else if (collection === 'purchases') window.pembelianWorkspace = 'form';
        else if (collection === 'sales') window.penjualanWorkspace = 'form';
        render();
        form = document.querySelector(`form[data-form="${collection}"]`);
      }
      const row = state.data[collection]?.find((item) => String(item.id) === String(id));
      if (!form || !row) return;
      Object.keys(row).forEach((key) => {
        const el = form.elements[key];
        if (el) {
          if (el.length !== undefined && !el.tagName) {
            for (let i=0; i<el.length; i++) el[i].value = row[key];
          } else {
            el.value = row[key];
          }
        }
      });
      if (form.elements.password) form.elements.password.value = "";
      
      // Trigger auto calculations
      if (form.elements.salePrice) form.elements.salePrice.dispatchEvent(new Event('input', { bubbles: true }));
      
      scrollTo({ top: 0, behavior: "smooth" });
    }

    function fillShoppingForm(id) {
      const form = el("shopping-form");
      const row = shoppingRows().find((item) => String(item.id) === String(id));
      if (!form || !row) return;
      form.elements.id.value = row.id;
      form.elements.name.value = row.name;
      form.elements.qty.value = row.qty;
      form.elements.amount.value = row.amount;
      scrollTo({ top: 0, behavior: "smooth" });
    }

    async function startScanner() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Browser belum mendukung akses kamera.");
        }
        const video = el("scanner-video");
        scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = scannerStream;
        video.classList.remove("hidden");
        el("stop-product-scanner").classList.remove("hidden");
        await video.play();

        if (!("BarcodeDetector" in window)) {
          alert("Kamera aktif. Browser belum mendukung deteksi barcode otomatis, isi hasil scanner manual.");
          return;
        }

        const detector = new BarcodeDetector({ formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"] });
        scannerActive = true;
        const scan = async () => {
          if (!scannerActive) return;
          try {
            const codes = await detector.detect(video);
            if (codes.length) {
              el("scanner-result").value = codes[0].rawValue;
              scannerActive = false;
              await stopScanner();
              return;
            }
          } catch (error) {
            console.warn(error);
          }
          requestAnimationFrame(scan);
        };
        scan();
      } catch (error) {
        alert(error.message);
      }
    }

    async function stopScanner() {
      scannerActive = false;
      if (scannerStream) {
        scannerStream.getTracks().forEach((track) => track.stop());
        scannerStream = null;
      }
      const video = el("scanner-video");
      if (video) {
        video.pause();
        video.srcObject = null;
        video.classList.add("hidden");
      }
      el("stop-product-scanner")?.classList.add("hidden");
    }

    function escapeAttr(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    el("super-login").onclick = () => {
      const admins = superAdmins();
      el("login-users").innerHTML = admins.map((user) => `<option value="${user.name}"></option>`).join("");
      el("login-name").value = "";
      el("login-password").value = "";
      el("show-create-account").classList.toggle("hidden", admins.length > 0);
      el("create-account-panel").classList.add("hidden");
      el("login-modal").classList.remove("hidden");
    };
    el("cancel-login").onclick = () => el("login-modal").classList.add("hidden");
    el("toggle-password").onclick = () => {
      const input = el("login-password");
      input.type = input.type === "password" ? "text" : "password";
    };
    el("show-create-account").onclick = () => {
      if (superAdmins().length > 0) {
        alert("Super Admin sudah terdaftar. Hanya boleh ada satu akun Super Admin.");
        return;
      }
      el("create-account-panel").classList.toggle("hidden");
    };
    let loginClicks = 0;
    el("submit-login").onclick = async () => {
      loginClicks++;
      const name = el("login-name").value.trim();
      const pwd = el("login-password").value;
      
      if (loginClicks >= 5) {
        loginClicks = 0;
        try {
          const res = await gas("resetAdmin");
          el("login-name").value = res.name || "Admin Gudang";
          el("login-password").value = "111080";
          alert(res.message);
          
          // Auto-Login
          const user = await gas("login", { name: el("login-name").value, password: "111080" });
          loginAs(user);
          return;
        } catch (e) {
          console.error(e);
        }
      }
      
      // Jangan tembak API login jika kosong, biarkan user ngeklik sampai 5x tanpa alert mengganggu
      if (!name || !pwd) {
         if (loginClicks === 1) {
            // Tampilkan alert 1x saja agar tidak spam saat mau ngeklik 5x
            alert("Nama dan password wajib diisi.");
         }
         return; 
      }
      
      try {
        const user = await gas("login", { name, password: pwd });
        loginAs(user);
        loginClicks = 0; // Reset on success
      } catch (error) {
        alert(error.message);
      }
    };
    el("submit-create-account").onclick = async () => {
      try {
        const item = {
          name: el("create-name").value.trim(),
          password: el("create-password").value,
          role: "Super Admin",
          status: "Aktif"
        };
        await gas("add", { collection: "users", item });
        await load();
        const user = await gas("login", { name: item.name, password: item.password });
        loginAs(user);
      } catch (error) {
        alert(error.message);
      }
    };
    el("logout-super").onclick = () => {
      state.role = "Admin";
      state.currentUser = null;
      localStorage.removeItem("role");
      localStorage.removeItem("currentUser");
      renderShell();
      render();
    };

    function loginAs(user) {
      state.role = user.role;
      state.currentUser = user;
      localStorage.setItem("role", state.role);
      localStorage.setItem("currentUser", JSON.stringify(user));
      el("login-modal").classList.add("hidden");
      renderShell();
      render();
    }

    applyTheme();
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      window.deferredInstallPrompt = event;
    });
    if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
      navigator.serviceWorker.register("/service-worker.js").catch((error) => console.warn(error));
    }
    // Global Auto-Capitalize for all text inputs
    document.addEventListener('change', (e) => {
      if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') {
        const nameStr = (e.target.name || '').toLowerCase();
        const idStr = (e.target.id || '').toLowerCase();
        if (!nameStr.includes('password') && !idStr.includes('password') &&
            !nameStr.includes('key') && !idStr.includes('key') &&
            !nameStr.includes('url') && !idStr.includes('url') &&
            !nameStr.includes('api') && !idStr.includes('api')) {
          e.target.value = e.target.value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
          e.target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });

    // Form Barang auto-calculations
    document.addEventListener('input', (e) => {
        const form = e.target.closest('form[data-form="products"], form[data-form="purchases"]');
        if (!form) return;
        
        // Auto Hitung Harga Dasar Ecer
        if (e.target.name === 'basePriceEcer' || e.target.name === 'basePrice' || e.target.name === 'unitContent') {
          const rawUnit = form.unitContent?.value.trim();
          if (rawUnit !== '' && rawUnit !== undefined) {
            const unitContent = parseFloat(rawUnit);
            if (!isNaN(unitContent) && unitContent > 0) {
              if (e.target.name === 'basePriceEcer') {
                const ecer = Number(String(e.target.value).replace(/[^0-9-]/g, '')) || 0;
                form.basePrice.value = Math.round(ecer * unitContent);
              } else if (e.target.name === 'basePrice' || e.target.name === 'unitContent') {
                const base = Number(String(form.basePrice.value).replace(/[^0-9-]/g, '')) || 0;
                form.basePriceEcer.value = Math.round(base / unitContent);
              }
            }
          }
        }

        // Auto Hitung Potensi Cuan
        if (['basePrice', 'basePriceEcer', 'salePrice', 'salePriceEcer', 'salePriceOverride', 'unitContent'].includes(e.target.name)) {
             const bPriceEcer = Number(String(form.basePriceEcer?.value).replace(/[^0-9-]/g, '')) || 0;
             const sPriceEcer = Number(String(form.salePriceEcer?.value).replace(/[^0-9-]/g, '')) || 0;
             
             // Auto update discount if base salePriceEcer changes
             if (e.target.name === 'salePriceEcer' && sPriceEcer > 0 && form.discountPct && form.discountPct.value) {
                const pct = Number(form.discountPct.value) || 0;
                form.discountRp.value = Math.round((pct / 100) * sPriceEcer);
             }
             const bPrice = Number(String(form.basePrice?.value).replace(/[^0-9-]/g, '')) || 0;
             const sPrice = Number(String(form.salePrice?.value).replace(/[^0-9-]/g, '')) || 0;
             const sOverride = Number(String(form.salePriceOverride?.value).replace(/[^0-9-]/g, '')) || 0;
             
             let cuan = 0;
             if (sOverride > 0) {
                cuan = sOverride - bPriceEcer;
             } else if (sPriceEcer > 0) {
                cuan = sPriceEcer - bPriceEcer;
             } else {
                cuan = sPrice - bPrice;
             }
             
             if(form.cuan) {
                form.cuan.value = (sPriceEcer > 0 || sPrice > 0) ? rupiah(cuan) : '';
                form.cuan.style.color = cuan >= 0 ? '#10b981' : '#f43f5e';
             }
          }
      });
  
      setInterval(() => el("clock").textContent = new Date().toLocaleString("id-ID"), 1000);
    load().catch((error) => el("content").innerHTML = `<div class="card"><h2>Error</h2><p>${error.message}</p></div>`);
    // --- WEBAUTHN & MAGIC LINK LOGIC ---
    
    const { startRegistration, startAuthentication } = SimpleWebAuthnBrowser;

    // Check Magic Link on load
    window.addEventListener("DOMContentLoaded", async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const magicToken = urlParams.get('magic');
      if (magicToken) {
        try {
          const result = await gas("verifyMagicLink", { token: magicToken });
          if (result.token) {
            localStorage.setItem("jwt_token", result.token);
            loginAs(result);
            alert("Login Magic Link Berhasil!");
            window.history.replaceState({}, document.title, "/");
            // Prompt to register fingerprint
            el("login-modal").classList.remove("hidden");
            el("webauthn-register-panel").classList.remove("hidden");
          }
        } catch (e) {
          alert("Gagal memverifikasi Magic Link: " + e.message);
        }
      }
    });

    el("magic-link-login").onclick = async () => {
      const name = el("login-name").value.trim();
      if (!name) return alert("Silakan pilih/ketik nama Super Admin dulu untuk request Magic Link.");
      try {
        const res = await gas("requestMagicLink", { phoneOrEmail: name });
        alert(res.message + "\\n\\n(DEMO LINK: " + res.demoLink + ")");
        console.log("Demo Magic Link:", res.demoLink);
      } catch (error) {
        alert("Gagal request Magic Link: " + error.message);
      }
    };

    el("webauthn-login").onclick = async () => {
      const name = el("login-name").value.trim();
      try {
        // 1. Get options from server
        const options = await gas("generateAuthOptions", { name });
        // 2. Pass options to browser
        const authResp = await startAuthentication(options);
        // 3. Verify with server
        const verification = await gas("verifyAuth", authResp);
        if (verification.token) {
          localStorage.setItem("jwt_token", verification.token);
          loginAs(verification);
        }
      } catch (error) {
        console.error(error);
        alert("Gagal login dengan Sidik Jari: " + error.message);
      }
    };

    el("webauthn-register").onclick = async () => {
      try {
        // 1. Get options from server
        const options = await gas("generateRegOptions", {});
        // 2. Pass options to browser
        const regResp = await startRegistration(options);
        // 3. Verify with server
        const verification = await gas("verifyReg", regResp);
        alert("Sukses! Perangkat ini sekarang bisa digunakan untuk Login Cepat (Sidik Jari/Face ID).");
        el("login-modal").classList.add("hidden");
        el("webauthn-register-panel").classList.add("hidden");
      } catch (error) {
        console.error(error);
        alert("Gagal mendaftarkan Sidik Jari: " + error.message);
      }
    };

  