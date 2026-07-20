const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// Add GET routes logic
const getLogic = `
    if (collection === "employees") {
      const [rows] = await db.query("SELECT id, name, phone, join_date, salary_type, base_salary, status, created_at FROM employees ORDER BY id DESC");
      return rows.map(mapEmployee);
    }
    if (collection === "cashAdvances") {
      const [rows] = await db.query(\`
        SELECT c.id, c.employee_id, e.name AS employee_name, c.date, c.amount, c.notes, c.status, c.created_at
        FROM cash_advances c
        LEFT JOIN employees e ON c.employee_id = e.id
        ORDER BY c.date DESC, c.id DESC
      \`);
      return rows.map(mapCashAdvance);
    }
    if (collection === "payrolls") {
      const [rows] = await db.query(\`
        SELECT p.id, p.employee_id, e.name AS employee_name, p.period_start, p.period_end, p.attendance_days, p.basic_salary_calculated, p.total_deduction_bon, p.net_salary, p.paid_at, p.notes
        FROM payrolls p
        LEFT JOIN employees e ON p.employee_id = e.id
        ORDER BY p.paid_at DESC
      \`);
      return rows.map(mapPayroll);
    }
`;
if (!code.includes('collection === "employees"')) {
  code = code.replace(/if \(collection === "users"\) \{/, getLogic + '\n    if (collection === "users") {');
}

// Add POST routes logic
const addLogic = `
    if (collection === "employees") {
      const [result] = await db.query(\`
        INSERT INTO employees (name, phone, join_date, salary_type, base_salary, status)
        VALUES (?, ?, ?, ?, ?, ?)
      \`, [item.name, item.phone || null, item.joinDate, item.salaryType, item.baseSalary, item.status || 'Aktif']);
      await recordAudit(\`Tambah karyawan \${item.name}\`);
      return findRow("employees", result.insertId);
    }
    
    if (collection === "cashAdvances") {
      const [result] = await db.query(\`
        INSERT INTO cash_advances (employee_id, date, amount, notes, status)
        VALUES (?, ?, ?, ?, ?)
      \`, [item.employeeId, item.date || new Date(), item.amount, item.notes || null, item.status || 'Belum Lunas']);
      await recordAudit(\`Tambah bon untuk karyawan ID \${item.employeeId}\`);
      return findRow("cashAdvances", result.insertId);
    }
    
    if (collection === "payrolls") {
      const [result] = await db.query(\`
        INSERT INTO payrolls (employee_id, period_start, period_end, attendance_days, basic_salary_calculated, total_deduction_bon, net_salary, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      \`, [item.employeeId, item.periodStart, item.periodEnd, item.attendanceDays, item.basicSalaryCalculated, item.totalDeductionBon, item.netSalary, item.notes || null]);
      
      // Lunas bon
      if (item.bonIds && item.bonIds.length > 0) {
         await db.query(\`UPDATE cash_advances SET status = 'Lunas' WHERE id IN (?)\`, [item.bonIds]);
      }
      await recordAudit(\`Bayar gaji untuk karyawan ID \${item.employeeId}\`);
      return findRow("payrolls", result.insertId);
    }
`;
code = code.replace(/if \(collection === "users"\) \{\s*await validateSuperAdminCreate\(item\);/, addLogic + '\n    if (collection === "users") {\n      await validateSuperAdminCreate(item);');

const updateLogic = `
    if (collection === "employees") {
      await db.query(\`
        UPDATE employees SET name=?, phone=?, join_date=?, salary_type=?, base_salary=?, status=? WHERE id=?
      \`, [item.name, item.phone || null, item.joinDate, item.salaryType, item.baseSalary, item.status || 'Aktif', id]);
      await recordAudit(\`Update karyawan \${item.name}\`);
      return findRow("employees", id);
    }
    
    if (collection === "cashAdvances") {
      await db.query(\`
        UPDATE cash_advances SET date=?, amount=?, notes=?, status=? WHERE id=?
      \`, [item.date, item.amount, item.notes || null, item.status, id]);
      await recordAudit(\`Update bon ID \${id}\`);
      return findRow("cashAdvances", id);
    }
`;
code = code.replace(/if \(collection === "users"\) \{\s*const before = await findRow\("users", id\);/, updateLogic + '\n    if (collection === "users") {\n      const before = await findRow("users", id);');


fs.writeFileSync('server.js', code);
console.log('Update server.js part 2 completed.');
