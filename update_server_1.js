const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Add mappings
const mappingsToAdd = `
function mapEmployee(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    joinDate: row.join_date,
    salaryType: row.salary_type,
    baseSalary: Number(row.base_salary || 0),
    status: row.status,
    createdAt: row.created_at
  };
}

function mapCashAdvance(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employee: row.employee_name,
    date: row.date,
    amount: Number(row.amount || 0),
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapPayroll(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employee: row.employee_name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    attendanceDays: Number(row.attendance_days || 0),
    basicSalaryCalculated: Number(row.basic_salary_calculated || 0),
    totalDeductionBon: Number(row.total_deduction_bon || 0),
    netSalary: Number(row.net_salary || 0),
    paidAt: row.paid_at,
    notes: row.notes
  };
}
`;
if (!code.includes('function mapEmployee')) {
  code = code.replace(/function mapUser\(row\) \{/, mappingsToAdd + '\nfunction mapUser(row) {');
}

// 2. Add to assertCollection
code = code.replace(/includes\(collection\)\) \{/, (match) => {
  if (!code.includes('"employees"')) {
    return 'includes(collection) && !["employees", "cashAdvances", "payrolls"].includes(collection)) {';
  }
  return match;
});

// 3. Add to tableName
const tablesToAdd = `
      employees: "employees",
      cashAdvances: "cash_advances",
      payrolls: "payrolls",`;
code = code.replace(/users: "users",/, `users: "users",${tablesToAdd}`);

// 4. Add to backup
code = code.replace(/const tables = \["suppliers",/, 'const tables = ["employees", "cash_advances", "payrolls", "suppliers",');
code = code.replace(/const tableOrder = \["sales",/, 'const tableOrder = ["payrolls", "cash_advances", "employees", "sales",');
code = code.replace(/const restoreOrder = \["suppliers",/, 'const restoreOrder = ["employees", "suppliers", "users", "products", "purchases", "sales", "price_history", "activity_logs", "app_settings", "cash_advances", "payrolls"];//');

fs.writeFileSync('server.js', code);
console.log('Update server.js part 1 completed.');
