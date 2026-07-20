const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const oldLogic = `            if (prod) {
              const salePriceEcer = Number(prod.salePriceEcer) || 0;
              const basePriceEcer = Number(prod.basePriceEcer) || 0;
              const unitContent = Number(prod.unitContent) || 1;
              const profitPerPcs = salePriceEcer - basePriceEcer;
              const totalPcs = unitSold * unitContent;
              form.elements.cuan.value = profitPerPcs * totalPcs;
            } else {
              form.elements.cuan.value = "";
            }`;

const newLogic = `            if (prod) {
              const salePriceEcer = Number(prod.salePriceEcer) || 0;
              const basePriceEcer = Number(prod.basePriceEcer) || 0;
              const unitContent = Number(prod.unitContent) || 1;
              const profitPerPcs = salePriceEcer - basePriceEcer;
              const totalPcs = unitSold * unitContent;
              form.elements.cuan.value = rupiah(profitPerPcs * totalPcs);
              form.elements.cuan.style.color = profitPerPcs >= 0 ? '#10b981' : '#f43f5e';
            } else {
              form.elements.cuan.value = "";
            }`;

code = code.replace(oldLogic, newLogic);

code = code.replace(/<label>Potensi Cuan \(Rp\)<input name="cuan" type="text" readonly\s+style="background-color:#1c2536;color:#10b981;font-weight:bold;" placeholder="0"><\/label>/g, '<label>Potensi Cuan (Rp)<input name="cuan" type="text" readonly style="background-color:#1c2536;color:#10b981;font-weight:bold;" placeholder="Rp 0"></label>');

// Add change event binding just in case
code = code.replace(/form\.elements\.product\.addEventListener\("input", updateCuan\);/, 'form.elements.product.addEventListener("input", updateCuan);\n          form.elements.product.addEventListener("change", updateCuan);');

fs.writeFileSync('index.html', code);
console.log('Fixed POS Cuan display in index.html');
