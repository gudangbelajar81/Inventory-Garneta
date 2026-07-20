const fs = require('fs');
const code = fs.readFileSync('index.html', 'utf8');

const rx = /(?:oninput|onchange)="([^"(]+)/g;
let m;
const set = new Set();
while((m = rx.exec(code)) !== null) {
  set.add(m[1].trim());
}

set.forEach(fn => {
  if (!code.includes('function ' + fn) && !code.includes('window.' + fn) && !code.includes(fn + ' =')) {
    console.log('MISSING: ' + fn);
  }
});
