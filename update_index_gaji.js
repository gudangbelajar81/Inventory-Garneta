const fs = require('fs');

let code = fs.readFileSync('index.html', 'utf8');

// 1. Sidebar Menu Update
// Look for where we render sidebar menus
const menuRegex = /const menuItems = \[([\s\S]*?)\];/;
const menuMatch = code.match(menuRegex);
if (menuMatch && !menuMatch[0].includes('gaji')) {
  const newMenu = menuMatch[0].replace(
    /\{ id: "pengaturan", icon: "⚙️", text: "Pengaturan", roles: \["Super Admin"\] \}/,
    `{ id: "gaji", icon: "💸", text: "Gaji & Bon", roles: ["Super Admin"] },\n      { id: "pengaturan", icon: "⚙️", text: "Pengaturan", roles: ["Super Admin"] }`
  );
  code = code.replace(menuMatch[0], newMenu);
}

// 2. Add Gaji Script logic
const scriptToAdd = `
    // --- GAJI & BON ---
    function saveEmployees(data) { state.employees = data; }
    function employees() { return state.employees || []; }
    
    function saveCashAdvances(data) { state.cashAdvances = data; }
    function cashAdvances() { return state.cashAdvances || []; }
    
    function savePayrolls(data) { state.payrolls = data; }
    function payrolls() { return state.payrolls || []; }

    function gajiWorkspace() {
      let activeTab = state.activeGajiTab || 'karyawan';
      
      const tabNav = \`
        <div class="tabs" style="margin-bottom: 1rem; border-bottom: 2px solid var(--border);">
          <button class="tab-btn \${activeTab === 'karyawan' ? 'active' : ''}" onclick="state.activeGajiTab='karyawan'; render();" style="background:none; border:none; padding:10px 20px; font-weight:bold; cursor:pointer; color: \${activeTab === 'karyawan' ? 'var(--primary)' : 'var(--text-secondary)'}; border-bottom: \${activeTab === 'karyawan' ? '3px solid var(--primary)' : 'none'};">Data Karyawan</button>
          
          <button class="tab-btn \${activeTab === 'kasbon' ? 'active' : ''}" onclick="state.activeGajiTab='kasbon'; render();" style="background:none; border:none; padding:10px 20px; font-weight:bold; cursor:pointer; color: \${activeTab === 'kasbon' ? 'var(--primary)' : 'var(--text-secondary)'}; border-bottom: \${activeTab === 'kasbon' ? '3px solid var(--primary)' : 'none'};">Kasbon / Bon</button>
          
          <button class="tab-btn \${activeTab === 'penggajian' ? 'active' : ''}" onclick="state.activeGajiTab='penggajian'; render();" style="background:none; border:none; padding:10px 20px; font-weight:bold; cursor:pointer; color: \${activeTab === 'penggajian' ? 'var(--primary)' : 'var(--text-secondary)'}; border-bottom: \${activeTab === 'penggajian' ? '3px solid var(--primary)' : 'none'};">Penggajian</button>
        </div>
      \`;

      let content = '';
      if (activeTab === 'karyawan') {
        const rows = employees().map(e => \`
          <tr>
            <td>\${e.name}</td>
            <td>\${e.phone || '-'}</td>
            <td>\${e.joinDate ? e.joinDate.slice(0,10) : '-'}</td>
            <td>\${e.salaryType}</td>
            <td>\${rupiah(e.baseSalary)}</td>
            <td><span class="badge \${e.status==='Aktif'?'success':'danger'}">\${e.status}</span></td>
            <td>
              <button class="btn icon-btn" data-edit-employee="\${e.id}">✏️</button>
            </td>
          </tr>
        \`).join('');
        
        content = \`
          <div class="card" style="margin-bottom: 1rem;">
            <h3>Tambah/Edit Karyawan</h3>
            <form id="form-employee" class="form-grid">
              <input type="hidden" name="id" />
              <label>Nama<input name="name" required /></label>
              <label>No HP<input name="phone" /></label>
              <label>Tanggal Masuk<input type="date" name="joinDate" required /></label>
              <label>Tipe Gaji
                <select name="salaryType">
                  <option value="Bulanan">Bulanan (Per Bulan)</option>
                  <option value="Harian">Harian (Per Hari Masuk)</option>
                </select>
              </label>
              <label>Gaji Pokok<input type="number" name="baseSalary" required /></label>
              <label>Status
                <select name="status">
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </label>
              <div class="actions">
                <button type="submit" class="btn primary">Simpan Karyawan</button>
                <button type="button" class="btn outline" onclick="document.getElementById('form-employee').reset(); document.getElementById('form-employee').elements.id.value='';">Batal</button>
              </div>
            </form>
          </div>
          <div class="card">
            <h3>Daftar Karyawan</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>Nama</th><th>No HP</th><th>Tgl Masuk</th><th>Tipe Gaji</th><th>Gaji Pokok</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody>\${rows || '<tr><td colspan="7" class="empty-state">Belum ada karyawan.</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        \`;
      } else if (activeTab === 'kasbon') {
        const empOptions = employees().filter(e=>e.status==='Aktif').map(e => \`<option value="\${e.id}">\${e.name}</option>\`).join('');
        
        const rows = cashAdvances().map(c => \`
          <tr>
            <td>\${c.date ? c.date.slice(0,10) : '-'}</td>
            <td>\${c.employee}</td>
            <td>\${rupiah(c.amount)}</td>
            <td>\${c.notes || '-'}</td>
            <td><span class="badge \${c.status==='Lunas'?'success':'warning'}">\${c.status}</span></td>
            <td>
              <button class="btn icon-btn" data-edit-bon="\${c.id}" \${c.status==='Lunas'?'disabled':''}>✏️</button>
            </td>
          </tr>
        \`).join('');
        
        content = \`
          <div class="card" style="margin-bottom: 1rem;">
            <h3>Catat Bon (Kasbon)</h3>
            <form id="form-bon" class="form-grid">
              <input type="hidden" name="id" />
              <label>Karyawan
                <select name="employeeId" required>
                  <option value="">-- Pilih Karyawan --</option>
                  \${empOptions}
                </select>
              </label>
              <label>Tanggal<input type="date" name="date" required value="\${new Date().toISOString().slice(0,10)}" /></label>
              <label>Nominal Bon (Rp)<input type="number" name="amount" required /></label>
              <label>Catatan / Keterangan<input name="notes" /></label>
              <div class="actions">
                <button type="submit" class="btn warning">Simpan Bon</button>
                <button type="button" class="btn outline" onclick="document.getElementById('form-bon').reset(); document.getElementById('form-bon').elements.id.value='';">Batal</button>
              </div>
            </form>
          </div>
          <div class="card">
            <h3>Riwayat Bon</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>Tanggal</th><th>Karyawan</th><th>Nominal</th><th>Catatan</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody>\${rows || '<tr><td colspan="6" class="empty-state">Belum ada catatan bon.</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        \`;
      } else if (activeTab === 'penggajian') {
        const empOptions = employees().filter(e=>e.status==='Aktif').map(e => \`<option value="\${e.id}">\${e.name} (\${e.salaryType})</option>\`).join('');
        
        const rows = payrolls().map(p => \`
          <tr>
            <td>\${p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '-'}</td>
            <td>\${p.employee}</td>
            <td>\${p.periodStart?.slice(0,10)} s/d \${p.periodEnd?.slice(0,10)}</td>
            <td>\${p.attendanceDays}</td>
            <td>\${rupiah(p.basicSalaryCalculated)}</td>
            <td style="color:var(--danger);">-\${rupiah(p.totalDeductionBon)}</td>
            <td style="font-weight:bold; color:var(--success);">\${rupiah(p.netSalary)}</td>
          </tr>
        \`).join('');
        
        content = \`
          <div class="card" style="margin-bottom: 1rem;">
            <h3>Hitung & Bayar Gaji</h3>
            <form id="form-payroll" class="form-grid">
              <label>Pilih Karyawan
                <select name="employeeId" id="payroll-employee" required>
                  <option value="">-- Pilih Karyawan --</option>
                  \${empOptions}
                </select>
              </label>
              <label>Periode Mulai<input type="date" name="periodStart" required /></label>
              <label>Periode Akhir<input type="date" name="periodEnd" required value="\${new Date().toISOString().slice(0,10)}" /></label>
              <label>Jumlah Kehadiran (Hari)<br><small style="color:var(--text-secondary)">Wajib diisi untuk karyawan Harian</small>
                <input type="number" name="attendanceDays" value="0" />
              </label>
              
              <div style="grid-column: 1 / -1; background: var(--surface-hover); padding: 1rem; border-radius: var(--radius); margin-top: 1rem;">
                <h4>Rincian Perhitungan (Otomatis)</h4>
                <div style="display:flex; justify-content: space-between; margin-bottom:0.5rem;">
                  <span>Gaji Pokok Dihitung:</span>
                  <span id="payroll-basic-salary" style="font-weight:bold;">Rp 0</span>
                </div>
                <div style="display:flex; justify-content: space-between; margin-bottom:0.5rem; color: var(--danger);">
                  <span>Potongan Bon (Belum Lunas):</span>
                  <span id="payroll-deduction" style="font-weight:bold;">- Rp 0</span>
                  <input type="hidden" id="payroll-bon-ids" />
                </div>
                <hr style="border:1px solid var(--border); margin:0.5rem 0;" />
                <div style="display:flex; justify-content: space-between; font-size: 1.2rem;">
                  <span>Total Gaji Bersih (Diterima):</span>
                  <span id="payroll-net" style="font-weight:bold; color: var(--success);">Rp 0</span>
                </div>
              </div>
              <label style="grid-column: 1 / -1;">Catatan Slip Gaji<input name="notes" /></label>
              
              <div class="actions" style="grid-column: 1 / -1;">
                <button type="submit" class="btn success" style="width:100%; padding: 1rem; font-size: 1.1rem;">💰 BAYAR GAJI</button>
              </div>
            </form>
          </div>
          <div class="card">
            <h3>Riwayat Penggajian (Slip Gaji)</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>Tgl Bayar</th><th>Karyawan</th><th>Periode</th><th>Kehadiran</th><th>Gaji Kotor</th><th>Potongan Bon</th><th>Gaji Bersih</th></tr></thead>
                <tbody>\${rows || '<tr><td colspan="7" class="empty-state">Belum ada riwayat penggajian.</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        \`;
      }
      
      return \`<section class="gaji-workspace">
        <div class="workspace-header">
          <h2>💸 Sistem Penggajian & Kasbon</h2>
          <p class="subtitle">Kelola data karyawan, bon, dan hitung gaji otomatis.</p>
        </div>
        \${tabNav}
        \${content}
      </section>\`;
    }
    
    function bindGajiEvents() {
      if (state.activeMenu !== 'gaji') return;
      
      // Karyawan
      document.getElementById("form-employee")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const payload = {
          name: form.elements.name.value,
          phone: form.elements.phone.value,
          joinDate: form.elements.joinDate.value,
          salaryType: form.elements.salaryType.value,
          baseSalary: form.elements.baseSalary.value,
          status: form.elements.status.value
        };
        const id = form.elements.id.value;
        try {
          await gas(id ? "edit" : "add", { collection: "employees", id, item: payload });
          alert("Karyawan berhasil disimpan");
          await load();
        } catch(err) { alert(err.message); }
      });
      
      document.querySelectorAll("[data-edit-employee]").forEach(btn => {
        btn.onclick = () => {
          const emp = employees().find(e => e.id == btn.dataset.editEmployee);
          if (emp) {
            const form = document.getElementById("form-employee");
            form.elements.id.value = emp.id;
            form.elements.name.value = emp.name;
            form.elements.phone.value = emp.phone;
            form.elements.joinDate.value = emp.joinDate ? emp.joinDate.slice(0,10) : '';
            form.elements.salaryType.value = emp.salaryType;
            form.elements.baseSalary.value = emp.baseSalary;
            form.elements.status.value = emp.status;
            form.scrollIntoView();
          }
        };
      });
      
      // Kasbon
      document.getElementById("form-bon")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const payload = {
          employeeId: form.elements.employeeId.value,
          date: form.elements.date.value,
          amount: form.elements.amount.value,
          notes: form.elements.notes.value,
          status: "Belum Lunas"
        };
        const id = form.elements.id.value;
        try {
          await gas(id ? "edit" : "add", { collection: "cashAdvances", id, item: payload });
          alert("Bon berhasil dicatat");
          await load();
        } catch(err) { alert(err.message); }
      });
      
      document.querySelectorAll("[data-edit-bon]").forEach(btn => {
        btn.onclick = () => {
          const bon = cashAdvances().find(c => c.id == btn.dataset.editBon);
          if (bon) {
            const form = document.getElementById("form-bon");
            form.elements.id.value = bon.id;
            form.elements.employeeId.value = bon.employeeId;
            form.elements.date.value = bon.date ? bon.date.slice(0,10) : '';
            form.elements.amount.value = bon.amount;
            form.elements.notes.value = bon.notes;
            form.scrollIntoView();
          }
        };
      });
      
      // Payroll Calculate Logic
      const payrollEmp = document.getElementById("payroll-employee");
      const payrollDays = document.getElementsByName("attendanceDays")[0];
      const calcPayroll = () => {
        if (!payrollEmp || !payrollDays) return;
        const empId = payrollEmp.value;
        if (!empId) {
          document.getElementById("payroll-basic-salary").innerText = "Rp 0";
          document.getElementById("payroll-deduction").innerText = "- Rp 0";
          document.getElementById("payroll-net").innerText = "Rp 0";
          document.getElementById("payroll-bon-ids").value = "";
          return;
        }
        
        const emp = employees().find(e => e.id == empId);
        let basicCalc = 0;
        if (emp.salaryType === 'Harian') {
          basicCalc = emp.baseSalary * Number(payrollDays.value || 0);
        } else {
          basicCalc = emp.baseSalary; // Bulanan
        }
        
        // Find unpaid bons
        const unpaidBons = cashAdvances().filter(c => c.employeeId == empId && c.status === 'Belum Lunas');
        const totalBon = unpaidBons.reduce((sum, c) => sum + c.amount, 0);
        const bonIds = unpaidBons.map(c => c.id).join(',');
        
        const net = basicCalc - totalBon;
        
        document.getElementById("payroll-basic-salary").innerText = rupiah(basicCalc);
        document.getElementById("payroll-deduction").innerText = "- " + rupiah(totalBon);
        document.getElementById("payroll-net").innerText = rupiah(net);
        document.getElementById("payroll-bon-ids").value = bonIds;
      };
      
      payrollEmp?.addEventListener("change", calcPayroll);
      payrollDays?.addEventListener("input", calcPayroll);
      
      // Payroll Submit
      document.getElementById("form-payroll")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        
        const empId = form.elements.employeeId.value;
        const emp = employees().find(x => x.id == empId);
        let basicCalc = emp.salaryType === 'Harian' ? (emp.baseSalary * Number(form.elements.attendanceDays.value || 0)) : emp.baseSalary;
        
        const unpaidBons = cashAdvances().filter(c => c.employeeId == empId && c.status === 'Belum Lunas');
        const totalBon = unpaidBons.reduce((sum, c) => sum + c.amount, 0);
        const bonIds = unpaidBons.map(c => c.id);
        const net = basicCalc - totalBon;
        
        if (!confirm(\`Yakin bayar gaji \${emp.name} sejumlah \${rupiah(net)}?\nPotongan Bon: \${rupiah(totalBon)}\`)) return;
        
        const payload = {
          employeeId: empId,
          periodStart: form.elements.periodStart.value,
          periodEnd: form.elements.periodEnd.value,
          attendanceDays: form.elements.attendanceDays.value,
          basicSalaryCalculated: basicCalc,
          totalDeductionBon: totalBon,
          netSalary: net,
          notes: form.elements.notes.value,
          bonIds: bonIds // Dikirim ke server untuk diupdate jadi Lunas
        };
        
        try {
          await gas("add", { collection: "payrolls", id: null, item: payload });
          alert("Gaji berhasil dibayarkan dan bon dilunaskan!");
          await load();
        } catch(err) { alert(err.message); }
      });
    }
`;

if (!code.includes('gajiWorkspace()')) {
  code = code.replace(/\/\/ --- PENGATURAN ---/, scriptToAdd + '\n    // --- PENGATURAN ---');
}

// 3. Render logic for gaji
code = code.replace(/if \(state\.activeMenu === "pengaturan"\) return pengaturanWorkspace\(\);/, `if (state.activeMenu === "gaji") return gajiWorkspace();\n      if (state.activeMenu === "pengaturan") return pengaturanWorkspace();`);

// 4. Bind events
code = code.replace(/bindPengaturan\(\);/, `bindPengaturan();\n      bindGajiEvents();`);

// 5. Load data in load()
const loadData = `
        const employeesReq = gas("read", { collection: "employees" }).catch(() => []);
        const cashAdvancesReq = gas("read", { collection: "cashAdvances" }).catch(() => []);
        const payrollsReq = gas("read", { collection: "payrolls" }).catch(() => []);
`;
code = code.replace(/const auditsReq = gas\("read", \{ collection: "auditLogs" \}\);/, `const auditsReq = gas("read", { collection: "auditLogs" });\n${loadData}`);

code = code.replace(/const \[products, suppliers, purchases, sales, users, ph, audits\] = await Promise\.all\(\[/, `const [products, suppliers, purchases, sales, users, ph, audits, employees, cashAdvances, payrolls] = await Promise.all([`);

code = code.replace(/auditsReq\n\s*\]\);/, `auditsReq, employeesReq, cashAdvancesReq, payrollsReq\n        ]);`);

code = code.replace(/saveAudits\(audits\);/, `saveAudits(audits);\n        saveEmployees(employees);\n        saveCashAdvances(cashAdvances);\n        savePayrolls(payrolls);`);

fs.writeFileSync('index.html', code);
console.log('Update index.html completed.');
