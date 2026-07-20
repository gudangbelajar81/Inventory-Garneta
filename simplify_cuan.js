const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// 1. Update productForm
code = code.replace(
  /<label>Potensi Cuan \(Grosir\)<input name="cuanGrosir"[^>]+><\/label>\s*<label>Potensi Cuan \(Ecer\/Pcs\)<input name="cuanEcer"([^>]+)><\/label>/g,
  '<label>CUAN<input name="cuan"$1></label>'
);

// 2. Update the input event listener
const oldCuanLogic = `const cuanGrosir = sPrice - bPrice;
           const cuanEcer = sPriceEcer - bPriceEcer;
           
           if(form.cuanGrosir) {
              form.cuanGrosir.value = sPrice > 0 ? rupiah(cuanGrosir) : '';
              form.cuanGrosir.style.color = cuanGrosir >= 0 ? '#10b981' : '#f43f5e';
           }
           if(form.cuanEcer) {
              form.cuanEcer.value = sPriceEcer > 0 ? rupiah(cuanEcer) : '';
              form.cuanEcer.style.color = cuanEcer >= 0 ? '#10b981' : '#f43f5e';
           }`;

const newCuanLogic = `const cuanEcer = sPriceEcer - bPriceEcer;
           if(form.cuan) {
              form.cuan.value = sPriceEcer > 0 ? rupiah(cuanEcer) : '';
              form.cuan.style.color = cuanEcer >= 0 ? '#10b981' : '#f43f5e';
           }`;

code = code.replace(oldCuanLogic, newCuanLogic);

fs.writeFileSync('index.html', code);
console.log('Update Cuan field completed.');
