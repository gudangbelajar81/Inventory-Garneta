const fs = require('fs');
let serverCode = fs.readFileSync('server.js', 'utf8');

const titleCaseFunc = `
function toTitleCase(str) {
  if (!str) return str;
  return String(str).toLowerCase().replace(/\\b\\w/g, s => s.toUpperCase());
}
`;

if (!serverCode.includes('function toTitleCase')) {
  serverCode = serverCode.replace(/function productPayload\(item\) \{/, titleCaseFunc + '\nfunction productPayload(item) {');
}

serverCode = serverCode.replace(/category: item\.category \|\| "Umum",/, 'category: toTitleCase(item.category || "Umum"),');
serverCode = serverCode.replace(/name: required\(item\.name, "Nama barang"\),/, 'name: toTitleCase(required(item.name, "Nama barang")),');

fs.writeFileSync('server.js', serverCode);
console.log('server.js updated');

let indexCode = fs.readFileSync('index.html', 'utf8');

if (!indexCode.includes('function toTitleCase')) {
  indexCode = indexCode.replace(/function rupiah\(num\) \{/, `function toTitleCase(str) {
        if (!str) return str;
        return String(str).toLowerCase().replace(/\\b\\w/g, s => s.toUpperCase());
      }
      
      function rupiah(num) {`);
}

// Add an event listener in bindForms to format inputs
const formatLogic = `
        document.querySelectorAll('input[name="name"], input[name="category"]').forEach(el => {
          el.addEventListener('input', function() {
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = toTitleCase(this.value);
            this.setSelectionRange(start, end);
          });
        });
`;
if (!indexCode.includes('this.setSelectionRange(start, end)')) {
  indexCode = indexCode.replace(/function bindForms\(\) \{/, `function bindForms() {${formatLogic}`);
}

fs.writeFileSync('index.html', indexCode);
console.log('index.html updated');
