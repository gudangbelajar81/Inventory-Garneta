const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const gajiCode = `
      // Workspace state for Gaji page
      window.gajiWorkspace = localStorage.getItem('gajiWorkspace') || 'karyawan';
      
      function switchGajiWorkspace(workspace) {
        window.gajiWorkspace = workspace;
        localStorage.setItem('gajiWorkspace', workspace);
        render();
      }
      
      function gaji() {
        const workspaces = [
          { id: 'karyawan', icon: '👥', label: 'Data Karyawan' },
          { id: 'kasbon', icon: '📝', label: 'Kasbon' },
          { id: 'penggajian', icon: '💰', label: 'Penggajian' }
        ];
        
        const activeWorkspace = window.gajiWorkspace || 'karyawan';
        
        const toolbar = \`<div class="workspace-toolbar">
          \${workspaces.map(ws => \`
            <button class="workspace-tab \${activeWorkspace === ws.id ? 'active' : ''}" 
                   onclick="switchGajiWorkspace('\${ws.id}')">
              <span class="workspace-icon">\${ws.icon}</span>
              <span class="workspace-label">\${ws.label}</span>
            </button>
          \`).join('')}
        </div>\`;
        
        let workspaceContent = '';
        switch(activeWorkspace) {
          case 'karyawan':
            workspaceContent = \`<div class="workspace-content">
              <div class="card">
                <h3>👥 Form Karyawan</h3>
                <form id="form-employee" class="grid forms">
                  \${hiddenId()}
                  \${input("name", "Nama Karyawan", true)}
                  \${input("phone", "Nomor HP")}
                  \${input("joinDate", "Tanggal Masuk", true, "date")}
                  \${select("salaryType", "Tipe Gaji", ["Bulanan", "Harian"])}
                  \${input("baseSalary", "Gaji Pokok / Harian (Rp)", true, "number")}
                  \${select("status", "Status", ["Aktif", "Nonaktif"])}
                  <div class="form-actions" style="grid-column: 1 / -1">
                    <button type="submit" class="btn primary">Simpan Karyawan</button>
                    <button type="reset" class="btn soft">Reset</button>
                  </div>
                </form>
              </div>
              <div class="card">
                <h3>Daftar Karyawan</h3>
                <div class="table-responsive">
                  <table class="table">
                    <thead><tr><th>Nama</th><th>HP</th><th>Masuk</th><th>Tipe</th><th>Gaji Pokok</th><th>Status</th><th>Aksi</th></tr></thead>
                    <tbody>
                      \${employees().map(e => \`<tr>
                        <td>\${e.name}</td><td>\${e.phone || '-'}</td><td>\${new Date(e.joinDate).toLocaleDateString()}</td>
                        <td>\${e.salaryType}</td><td>\${rupiah(e.baseSalary)}</td>
                        <td><span class="badge \${e.status === 'Aktif' ? 'success' : 'danger'}">\${e.status}</span></td>
                        <td><button class="btn soft" onclick="editEmployee('\${e.id}')">Edit</button></td>
                      </tr>\`).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>\`;
            break;
          case 'kasbon':
            const empOptions = employees().filter(e => e.status === 'Aktif').map(e => \`<option value="\${e.id}">\${e.name}</option>\`).join('');
            workspaceContent = \`<div class="workspace-content">
              <div class="card">
                <h3>📝 Catat Kasbon (Bon)</h3>
                <form id="form-bon" class="grid forms">
                  \${hiddenId()}
                  <label>Karyawan <select name="employeeId" required><option value="">Pilih...</option>\${empOptions}</select></label>
                  \${input("date", "Tanggal", true, "date", today())}
                  \${input("amount", "Nominal Kasbon (Rp)", true, "number")}
                  \${input("notes", "Keterangan")}
                  <div class="form-actions" style="grid-column: 1 / -1">
                    <button type="submit" class="btn primary">Simpan Kasbon</button>
                    <button type="reset" class="btn soft">Reset</button>
                  </div>
                </form>
              </div>
              <div class="card">
                <h3>Daftar Kasbon Aktif (Belum Lunas)</h3>
                <div class="table-responsive">
                  <table class="table">
                    <thead><tr><th>Tanggal</th><th>Karyawan</th><th>Nominal</th><th>Keterangan</th><th>Status</th><th>Aksi</th></tr></thead>
                    <tbody>
                      \${cashAdvances().filter(c => c.status === 'Belum Lunas').map(c => {
                        const emp = employees().find(e => e.id == c.employeeId);
                        return \`<tr>
                          <td>\${new Date(c.date).toLocaleDateString()}</td><td>\${emp?.name || 'Unknown'}</td>
                          <td style="color:#f43f5e;font-weight:bold;">\${rupiah(c.amount)}</td><td>\${c.notes || '-'}</td>
                          <td><span class="badge warning">\${c.status}</span></td>
                          <td><button class="btn soft" onclick="editBon('\${c.id}')">Edit</button></td>
                        </tr>\`;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>\`;
            break;
          case 'penggajian':
            const empOptions2 = employees().filter(e => e.status === 'Aktif').map(e => \`<option value="\${e.id}">\${e.name}</option>\`).join('');
            workspaceContent = \`<div class="workspace-content">
              <div class="card">
                <h3>💰 Hitung & Bayar Gaji</h3>
                <form id="form-payroll" class="grid forms">
                  <label>Karyawan <select name="employeeId" id="payroll-employee" required><option value="">Pilih...</option>\${empOptions2}</select></label>
                  \${input("periodStart", "Periode Mulai", false, "date")}
                  \${input("periodEnd", "Periode Akhir", false, "date")}
                  \${input("attendanceDays", "Kehadiran (Hari)", false, "number")}
                  \${input("notes", "Keterangan")}
                  
                  <div style="grid-column: 1 / -1; background: var(--bg); padding: 1.5rem; border-radius: 8px; margin-top: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                      <span>Gaji Pokok / Hitungan:</span>
                      <strong id="payroll-basic-salary">Rp 0</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: #f43f5e;">
                      <span>Potongan Kasbon (Otomatis Lunas):</span>
                      <strong id="payroll-deduction">- Rp 0</strong>
                    </div>
                    <hr style="border-color: rgba(255,255,255,0.1); margin: 1rem 0;">
                    <div style="display: flex; justify-content: space-between; font-size: 1.25rem;">
                      <span>Gaji Bersih Diterima:</span>
                      <strong id="payroll-net" style="color: #10b981;">Rp 0</strong>
                    </div>
                  </div>
                  
                  <div class="form-actions" style="grid-column: 1 / -1; margin-top: 1rem;">
                    <button type="submit" class="btn success" style="width:100%; font-size: 1.1rem; padding: 1rem;">Bayar Gaji</button>
                  </div>
                </form>
              </div>
            </div>\`;
            break;
        }
        
        setTimeout(bindGajiEvents, 100);
        
        return \`
        <section class="workspace">
          <div class="workspace-header">
            <h2 class="workspace-title">💸 Gaji & Bon</h2>
            <p class="subtitle">Kelola data karyawan, bon, dan hitung gaji otomatis.</p>
          </div>
          \${toolbar}
          \${workspaceContent}
        </section>\`;
      }
      
      window.editEmployee = function(id) {
        const emp = employees().find(e => e.id == id);
        if (emp) {
          const form = document.getElementById("form-employee");
          if(form) {
            form.elements.id.value = emp.id;
            form.elements.name.value = emp.name;
            form.elements.phone.value = emp.phone;
            form.elements.joinDate.value = emp.joinDate ? emp.joinDate.slice(0,10) : '';
            form.elements.salaryType.value = emp.salaryType;
            form.elements.baseSalary.value = emp.baseSalary;
            form.elements.status.value = emp.status;
            form.scrollIntoView();
          }
        }
      };
      
      window.editBon = function(id) {
        const bon = cashAdvances().find(c => c.id == id);
        if (bon) {
          const form = document.getElementById("form-bon");
          if(form) {
            form.elements.id.value = bon.id;
            form.elements.employeeId.value = bon.employeeId;
            form.elements.date.value = bon.date ? bon.date.slice(0,10) : '';
            form.elements.amount.value = bon.amount;
            form.elements.notes.value = bon.notes;
            form.scrollIntoView();
          }
        }
      };
      
      function bindGajiEvents() {
        // Karyawan
        const formEmp = document.getElementById("form-employee");
        if (formEmp) {
          formEmp.onsubmit = async (e) => {
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
          };
        }
        
        // Kasbon
        const formBon = document.getElementById("form-bon");
        if (formBon) {
          formBon.onsubmit = async (e) => {
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
          };
        }
        
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
            return;
          }
          
          const emp = employees().find(e => e.id == empId);
          let basicCalc = 0;
          if (emp.salaryType === 'Harian') {
            basicCalc = emp.baseSalary * Number(payrollDays.value || 0);
          } else {
            basicCalc = emp.baseSalary; // Bulanan
          }
          
          const unpaidBons = cashAdvances().filter(c => c.employeeId == empId && c.status === 'Belum Lunas');
          const totalBon = unpaidBons.reduce((sum, c) => sum + Number(c.amount), 0);
          const net = basicCalc - totalBon;
          
          document.getElementById("payroll-basic-salary").innerText = rupiah(basicCalc);
          document.getElementById("payroll-deduction").innerText = "- " + rupiah(totalBon);
          document.getElementById("payroll-net").innerText = rupiah(net);
        };
        
        if (payrollEmp) payrollEmp.addEventListener("change", calcPayroll);
        if (payrollDays) payrollDays.addEventListener("input", calcPayroll);
        
        // Payroll Submit
        const formPayroll = document.getElementById("form-payroll");
        if (formPayroll) {
          formPayroll.onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            
            const empId = form.elements.employeeId.value;
            const emp = employees().find(x => x.id == empId);
            let basicCalc = emp.salaryType === 'Harian' ? (emp.baseSalary * Number(form.elements.attendanceDays.value || 0)) : emp.baseSalary;
            
            const unpaidBons = cashAdvances().filter(c => c.employeeId == empId && c.status === 'Belum Lunas');
            const totalBon = unpaidBons.reduce((sum, c) => sum + Number(c.amount), 0);
            const bonIds = unpaidBons.map(c => c.id);
            const net = basicCalc - totalBon;
            
            if (!confirm(\`Yakin bayar gaji \${emp.name} sejumlah \${rupiah(net)}?\\nPotongan Bon: \${rupiah(totalBon)}\`)) return;
            
            const payload = {
              employeeId: empId,
              periodStart: form.elements.periodStart.value,
              periodEnd: form.elements.periodEnd.value,
              attendanceDays: form.elements.attendanceDays.value,
              basicSalaryCalculated: basicCalc,
              totalDeductionBon: totalBon,
              netSalary: net,
              notes: form.elements.notes.value,
              bonIds: bonIds
            };
            
            try {
              await gas("add", { collection: "payrolls", id: null, item: payload });
              alert("Gaji berhasil dibayarkan dan bon dilunaskan!");
              await load();
            } catch(err) { alert(err.message); }
          };
        }
      }
`;

// Insert the functions before function render()
if (!code.includes('function gaji()')) {
  code = code.replace(/function render\(\) \{/, gajiCode + '\n      function render() {');
}

// Inject 'gaji' into views object
code = code.replace(/const views = \{ dashboard, "neural-hub": GARNETA STORE, barang, pembelian, ngitung, kalkulator, penjualan, laporan, statistik, audit, users, settings \};/g, 
'const views = { dashboard, "neural-hub": GARNETA STORE, barang, pembelian, ngitung, kalkulator, penjualan, laporan, statistik, audit, users, gaji, settings };');

fs.writeFileSync('index.html', code);
console.log('Fixed index.html to include gaji view and logic');
