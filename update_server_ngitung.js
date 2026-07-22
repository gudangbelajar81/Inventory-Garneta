const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Update KASIR_COLLECTIONS
code = code.replace(
  'const KASIR_COLLECTIONS = new Set(["products", "suppliers", "purchases", "sales", "priceHistory"]);',
  'const KASIR_COLLECTIONS = new Set(["products", "suppliers", "purchases", "sales", "priceHistory", "ngitungSales"]);'
);

// 2. Update bootstrap
code = code.replace(
  'const [products, suppliers, purchases, sales, users, priceHistory, auditLogs, employees, cashAdvances, payrolls, stats] = await Promise.all([',
  'const [products, suppliers, purchases, sales, users, priceHistory, auditLogs, employees, cashAdvances, payrolls, ngitungSales, stats] = await Promise.all(['
);
code = code.replace(
  'listRows("payrolls"),\r\n    dashboard()',
  'listRows("payrolls"),\r\n    listRows("ngitungSales"),\r\n    dashboard()'
);
code = code.replace(
  'listRows("payrolls"),\n    dashboard()',
  'listRows("payrolls"),\n    listRows("ngitungSales"),\n    dashboard()'
);
code = code.replace(
  'return { products, suppliers, purchases, sales, users, priceHistory, auditLogs, employees, cashAdvances, payrolls, dashboard: stats };',
  'return { products, suppliers, purchases, sales, users, priceHistory, auditLogs, employees, cashAdvances, payrolls, ngitungSales, dashboard: stats };'
);

// 3. Update listRows
const listRowsAddition = 
  if (collection === "ngitungSales") {
    const [rows] = await db.query(\SELECT * FROM ngitung_sales ORDER BY created_at DESC LIMIT 100\);
    return rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]'), installments: JSON.parse(r.installments || '[]') }));
  }
;
code = code.replace('async function listRows(collection) {\r\n  assertCollection(collection);\r\n', 'async function listRows(collection) {\r\n  assertCollection(collection);\r\n' + listRowsAddition);
code = code.replace('async function listRows(collection) {\n  assertCollection(collection);\n', 'async function listRows(collection) {\n  assertCollection(collection);\n' + listRowsAddition);

// 4. Update addRow
const addRowAddition = 
  if (collection === "ngitungSales") {
    const [result] = await db.query(
      \INSERT INTO ngitung_sales (date, customer_name, total_amount, paid_amount, status, items, installments) VALUES (?, ?, ?, ?, ?, ?, ?)\,
      [item.date || new Date(), item.customerName || null, item.totalAmount || 0, item.paidAmount || 0, item.status || 'Lunas', JSON.stringify(item.items || []), JSON.stringify(item.installments || [])]
    );
    return findRow("ngitungSales", result.insertId);
  }
;
code = code.replace('async function addRow(collection, item = {}) {\r\n  assertCollection(collection);\r\n', 'async function addRow(collection, item = {}) {\r\n  assertCollection(collection);\r\n' + addRowAddition);
code = code.replace('async function addRow(collection, item = {}) {\n  assertCollection(collection);\n', 'async function addRow(collection, item = {}) {\n  assertCollection(collection);\n' + addRowAddition);

// 5. Update updateRow
const updateRowAddition = 
  if (collection === "ngitungSales") {
    await db.query(
      \UPDATE ngitung_sales SET date=?, customer_name=?, total_amount=?, paid_amount=?, status=?, items=?, installments=? WHERE id=?\,
      [item.date, item.customerName || null, item.totalAmount, item.paidAmount, item.status, JSON.stringify(item.items || []), JSON.stringify(item.installments || []), id]
    );
    return findRow("ngitungSales", id);
  }
;
code = code.replace('async function updateRow(collection, id, item = {}) {\r\n  assertCollection(collection);\r\n  if (!id) throw new Error("ID wajib dikirim.");\r\n', 'async function updateRow(collection, id, item = {}) {\r\n  assertCollection(collection);\r\n  if (!id) throw new Error("ID wajib dikirim.");\r\n' + updateRowAddition);
code = code.replace('async function updateRow(collection, id, item = {}) {\n  assertCollection(collection);\n  if (!id) throw new Error("ID wajib dikirim.");\n', 'async function updateRow(collection, id, item = {}) {\n  assertCollection(collection);\n  if (!id) throw new Error("ID wajib dikirim.");\n' + updateRowAddition);

// 6. Update findRow
const findRowMapper = 
    ngitungSales: (r) => ({ ...r, items: JSON.parse(r.items || '[]'), installments: JSON.parse(r.installments || '[]') }),
;
code = code.replace('    users: mapUser,\r\n  };\r\n', '    users: mapUser,\r\n' + findRowMapper + '  };\r\n');
code = code.replace('    users: mapUser,\n  };\n', '    users: mapUser,\n' + findRowMapper + '  };\n');

// 7. Update assertCollection
code = code.replace(
  '"].includes(collection) && !["employees", "cashAdvances", "payrolls"].includes(collection)) {',
  '"].includes(collection) && !["employees", "cashAdvances", "payrolls", "ngitungSales"].includes(collection)) {'
);

// 8. Update tableName
code = code.replace(
  '    auditLogs: "activity_logs"\r\n  };\r\n',
  '    auditLogs: "activity_logs",\r\n    ngitungSales: "ngitung_sales"\r\n  };\r\n'
);
code = code.replace(
  '    auditLogs: "activity_logs"\n  };\n',
  '    auditLogs: "activity_logs",\n    ngitungSales: "ngitung_sales"\n  };\n'
);

fs.writeFileSync('server.js', code, 'utf8');
console.log('server.js updated successfully!');
