const fs = require('fs');

let code = fs.readFileSync('index.html', 'utf8');

// Replace inputs in form-payroll
code = code.replace(
  /\$\{input\("periodStart", "Periode Mulai", false, "date"\)\}\s*\$\{input\("periodEnd", "Periode Akhir", false, "date"\)\}\s*\$\{input\("attendanceDays", "Kehadiran \(Hari\)", false, "number"\)\}/,
  \`\${input("periodStart", "Periode Mulai (Tanggal Masuk)", false, "date")}
                    \${input("periodEnd", "Periode Akhir", false, "date")}
                    \${input("leaveDays", "Potong Hari Libur / Izin", false, "number")}
                    <label>Total Hari Kerja Aktual <input name="attendanceDays" type="number" readonly style="background:var(--bg);font-weight:bold;"></label>\`
);

// Update calcPayroll logic
const oldCalcPayroll = \`const calcPayroll = () => {
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
          };\`;

const newCalcPayroll = \`const pStart = document.getElementsByName("periodStart")[0];
          const pEnd = document.getElementsByName("periodEnd")[0];
          const pLeave = document.getElementsByName("leaveDays")[0];
          
          const calcPayroll = () => {
            if (!payrollEmp || !payrollDays) return;
            const empId = payrollEmp.value;
            if (!empId) {
              document.getElementById("payroll-basic-salary").innerText = "Rp 0";
              document.getElementById("payroll-deduction").innerText = "- Rp 0";
              document.getElementById("payroll-net").innerText = "Rp 0";
              if (pStart) pStart.value = "";
              if (pEnd) pEnd.value = "";
              return;
            }
            
            const emp = employees().find(e => e.id == empId);
            if (pStart && !pStart.value) pStart.value = emp.joinDate.split('T')[0];
            if (pEnd && !pEnd.value) pEnd.value = today();
            
            let actualDays = 0;
            if (emp.salaryType === 'Harian') {
              if (pStart.value && pEnd.value) {
                const d1 = new Date(pStart.value);
                const d2 = new Date(pEnd.value);
                const diffTime = d2 - d1;
                const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))) + 1; // inclusive
                const leave = plainNumber(pLeave ? pLeave.value : 0) || 0;
                actualDays = Math.max(0, diffDays - leave);
              }
              payrollDays.value = actualDays;
            } else {
              payrollDays.value = 1; // For bulanan, it doesn't matter
              actualDays = 1;
            }
            
            let basicCalc = 0;
            if (emp.salaryType === 'Harian') {
              basicCalc = emp.baseSalary * actualDays;
            } else {
              basicCalc = emp.baseSalary; // Bulanan
            }
            
            const unpaidBons = cashAdvances().filter(c => c.employeeId == empId && c.status === 'Belum Lunas');
            const totalBon = unpaidBons.reduce((sum, c) => sum + Number(c.amount), 0);
            const net = basicCalc - totalBon;
            
            document.getElementById("payroll-basic-salary").innerText = rupiah(basicCalc);
            document.getElementById("payroll-deduction").innerText = "- " + rupiah(totalBon);
            document.getElementById("payroll-net").innerText = rupiah(net);
          };\`;

code = code.replace(oldCalcPayroll, newCalcPayroll);

// Add event listeners to the new inputs
const oldEvents = \`if (payrollEmp) payrollEmp.addEventListener("change", calcPayroll);
          if (payrollDays) payrollDays.addEventListener("input", calcPayroll);\`;

const newEvents = \`if (payrollEmp) payrollEmp.addEventListener("change", () => { 
            // Reset dates when changing employee
            if (pStart) pStart.value = "";
            if (pEnd) pEnd.value = "";
            if (pLeave) pLeave.value = "";
            calcPayroll(); 
          });
          if (pStart) pStart.addEventListener("input", calcPayroll);
          if (pEnd) pEnd.addEventListener("input", calcPayroll);
          if (pLeave) pLeave.addEventListener("input", calcPayroll);\`;
          
code = code.replace(oldEvents, newEvents);

// Now update the form submission logic to NOT re-calculate basicCalc because it might be wrong if attendanceDays is read directly (number formatting)
const oldSubmitLogic = \`const emp = employees().find(x => x.id == empId);
              let basicCalc = emp.salaryType === 'Harian' ? (emp.baseSalary * plainNumber(form.elements.attendanceDays.value || 0)) : emp.baseSalary;\`;

const newSubmitLogic = \`const emp = employees().find(x => x.id == empId);
              let actualDays = plainNumber(form.elements.attendanceDays.value || 0);
              let basicCalc = emp.salaryType === 'Harian' ? (emp.baseSalary * actualDays) : emp.baseSalary;\`;
              
code = code.replace(oldSubmitLogic, newSubmitLogic);

fs.writeFileSync('index.html', code);
console.log('index.html updated successfully for Harian calculation');
