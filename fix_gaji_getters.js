const fs = require('fs');

let indexCode = fs.readFileSync('index.html', 'utf8');

const getters = `
      function employees() { return state.data.employees || []; }
      function cashAdvances() { return state.data.cashAdvances || []; }
      function payrolls() { return state.data.payrolls || []; }
`;

if (!indexCode.includes('function employees()')) {
  indexCode = indexCode.replace(/function getProductByName\(name\) \{/, getters + '\n      function getProductByName(name) {');
  fs.writeFileSync('index.html', indexCode);
  console.log('index.html updated with gaji getters');
} else {
  console.log('Getters already exist');
}
