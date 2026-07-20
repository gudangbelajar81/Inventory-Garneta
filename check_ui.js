const fs = require('fs');
const code = fs.readFileSync('index.html', 'utf8');

const viewsStr = code.match(/const views = \{([^}]+)\}/)[1];
const views = viewsStr.split(',').map(s => s.split(':')[1] || s).map(s => s.trim());

console.log('--- Checking Views ---');
views.forEach(v => {
  if (!code.includes('function ' + v)) {
    console.log('MISSING VIEW FUNCTION: ' + v);
  }
});

console.log('--- Checking Onclicks ---');
const onclickRegex = /onclick="([^"(]+)/g;
let match;
const onclicks = new Set();
while ((match = onclickRegex.exec(code)) !== null) {
  onclicks.add(match[1]);
}

onclicks.forEach(fn => {
  if (
    !code.includes('function ' + fn) &&
    !code.includes('window.' + fn) &&
    !code.includes(fn + ' =')
  ) {
    console.log('MISSING ONCLICK FUNCTION: ' + fn);
  }
});

console.log('Diagnostics completed.');
