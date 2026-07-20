const fs = require('fs');

// 1. Fix server.js bootstrap()
let serverCode = fs.readFileSync('server.js', 'utf8');

const oldBootstrap = `async function bootstrap() {
  const [products, suppliers, purchases, sales, users, priceHistory, auditLogs, stats] = await Promise.all([
    listRows("products"),
    listRows("suppliers"),
    listRows("purchases"),
    listRows("sales"),
    listRows("users"),
    listRows("priceHistory"),
    listRows("auditLogs"),
    dashboard()
  ]);

  return { products, suppliers, purchases, sales, users, priceHistory, auditLogs, dashboard: stats };
}`;

const newBootstrap = `async function bootstrap() {
  const [products, suppliers, purchases, sales, users, priceHistory, auditLogs, employees, cashAdvances, payrolls, stats] = await Promise.all([
    listRows("products"),
    listRows("suppliers"),
    listRows("purchases"),
    listRows("sales"),
    listRows("users"),
    listRows("priceHistory"),
    listRows("auditLogs"),
    listRows("employees"),
    listRows("cashAdvances"),
    listRows("payrolls"),
    dashboard()
  ]);

  return { products, suppliers, purchases, sales, users, priceHistory, auditLogs, employees, cashAdvances, payrolls, dashboard: stats };
}`;

if (serverCode.includes('listRows("products")') && !serverCode.includes('listRows("employees")')) {
  serverCode = serverCode.replace(oldBootstrap, newBootstrap);
  fs.writeFileSync('server.js', serverCode);
  console.log('Fixed server.js bootstrap()');
}


// 2. Fix index.html getters
let indexCode = fs.readFileSync('index.html', 'utf8');

const gettersFix = `
    function saveEmployees(data) { state.employees = data; }
    function employees() { return state.data?.employees || state.employees || []; }
    
    function saveCashAdvances(data) { state.cashAdvances = data; }
    function cashAdvances() { return state.data?.cashAdvances || state.cashAdvances || []; }
    
    function savePayrolls(data) { state.payrolls = data; }
    function payrolls() { return state.data?.payrolls || state.payrolls || []; }
`;

indexCode = indexCode.replace(/function employees\(\) \{ return state\.employees \|\| \[\]; \}/, 'function employees() { return state.data?.employees || state.employees || []; }');
indexCode = indexCode.replace(/function cashAdvances\(\) \{ return state\.cashAdvances \|\| \[\]; \}/, 'function cashAdvances() { return state.data?.cashAdvances || state.cashAdvances || []; }');
indexCode = indexCode.replace(/function payrolls\(\) \{ return state\.payrolls \|\| \[\]; \}/, 'function payrolls() { return state.data?.payrolls || state.payrolls || []; }');

fs.writeFileSync('index.html', indexCode);
console.log('Fixed index.html getters');
