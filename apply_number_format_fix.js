const fs = require('fs');

let indexCode = fs.readFileSync('index.html', 'utf8');

const formatFunc = `
      function formatNumberInput(el) {
        let val = el.value.replace(/[^0-9-]/g, '');
        if (val) {
          let isNegative = val.startsWith('-');
          val = val.replace(/-/g, '');
          el.value = (isNegative ? '-' : '') + val.replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');
        } else {
          el.value = '';
        }
      }
      
      function formatInitialNumber(val) {
        if (!val) return "";
        return String(val).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');
      }
`;

if (!indexCode.includes('function formatNumberInput')) {
  indexCode = indexCode.replace(/function plainNumber/, formatFunc + '\n      function plainNumber');
}

// Replace Number(...) and parseFloat(...) for input values with plainNumber(...)
indexCode = indexCode.replace(/parseFloat\(([^)]+\.value)\)/g, 'plainNumber($1)');
indexCode = indexCode.replace(/Number\(([^)]+\.value)\)/g, 'plainNumber($1)');
indexCode = indexCode.replace(/Number\(form\.elements\.([^.]+)\.value/g, 'plainNumber(form.elements.$1.value');
indexCode = indexCode.replace(/Number\(formData\.get\(([^)]+)\)\)/g, 'plainNumber(formData.get($1))');
indexCode = indexCode.replace(/parseFloat\(e\.target\.value\)/g, 'plainNumber(e.target.value)');

const oldInputFunc = 'return `<label>${label}<input name="${name}" type="${type}" value="${value}" ${required ? "required" : ""}><\/label>`;';
const newInputFunc = `if (type === "number") {
          return \`<label>\${label}<input name="\${name}" type="text" inputmode="numeric" value="\${value}" \${required ? "required" : ""} oninput="formatNumberInput(this)"></label>\`;
        }
        return \`<label>\${label}<input name="\${name}" type="\${type}" value="\${value}" \${required ? "required" : ""}><\/label>\`;`;

indexCode = indexCode.replace(oldInputFunc, newInputFunc);

indexCode = indexCode.replace(/type="number"/g, 'type="text" inputmode="numeric" oninput="formatNumberInput(this)"');

// Remove formatting from hidden inputs
indexCode = indexCode.replace(/type="hidden" inputmode="numeric" oninput="formatNumberInput\(this\)"/g, 'type="hidden"');

// Fix formatting in template strings loading DB values
indexCode = indexCode.replace(/value="\$\{Number\(row\.([^}]+)\)\}"/g, 'value="${formatInitialNumber(Number(row.$1))}"');
indexCode = indexCode.replace(/value="\$\{row\.([^}]+)\}"\s+style="width:([0-9]+px)"/g, 'value="${formatInitialNumber(row.$1)}" style="width:$2"');

fs.writeFileSync('index.html', indexCode);
console.log('index.html updated successfully');
