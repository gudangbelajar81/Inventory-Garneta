const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const listenerRegex = /document\.addEventListener\('input', \(e\) => \{[\s\S]*?form\.basePriceEcer\.value = Math\.round\(base \/ unitContent\);\s*\}\s*\}\s*\}\);\s*setInterval/m;

const newListener = `document.addEventListener('input', (e) => {
        const form = e.target.closest('form[data-form="products"], form[data-form="purchases"]');
        if (!form) return;
        
        // Auto Hitung Harga Dasar Ecer
        if (e.target.name === 'basePriceEcer' || e.target.name === 'basePrice' || e.target.name === 'unitContent') {
          const rawUnit = form.unitContent?.value.trim();
          if (rawUnit !== '' && rawUnit !== undefined) {
            const unitContent = parseFloat(rawUnit);
            if (!isNaN(unitContent) && unitContent > 0) {
              if (e.target.name === 'basePriceEcer') {
                const ecer = parseFloat(e.target.value) || 0;
                form.basePrice.value = Math.round(ecer * unitContent);
              } else if (e.target.name === 'basePrice' || e.target.name === 'unitContent') {
                const base = parseFloat(form.basePrice.value) || 0;
                form.basePriceEcer.value = Math.round(base / unitContent);
              }
            }
          }
        }

        // Auto Hitung Potensi Cuan
        if (['basePrice', 'basePriceEcer', 'salePrice', 'salePriceEcer', 'unitContent'].includes(e.target.name)) {
           const bPriceEcer = parseFloat(form.basePriceEcer?.value) || 0;
           const sPriceEcer = parseFloat(form.salePriceEcer?.value) || 0;
           
           const cuanEcer = sPriceEcer - bPriceEcer;
           
           if(form.cuan) {
              form.cuan.value = sPriceEcer > 0 ? rupiah(cuanEcer) : '';
              form.cuan.style.color = cuanEcer >= 0 ? '#10b981' : '#f43f5e';
           }
        }
      });
  
      setInterval`;

code = code.replace(listenerRegex, newListener);
fs.writeFileSync('index.html', code);
console.log('Update Listener completed.');
