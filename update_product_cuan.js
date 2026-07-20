const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// 1. Add Cuan Fields to productForm
const oldFormContent = `\${input("salePriceEcer", "Harga Jual Ecer", false, "number")}`;
const newFormContent = `\${input("salePriceEcer", "Harga Jual Ecer", false, "number")}
          <label>Potensi Cuan (Grosir)<input name="cuanGrosir" type="text" readonly tabindex="-1" style="background:var(--bg);font-weight:bold;"></label>
          <label>Potensi Cuan (Ecer/Pcs)<input name="cuanEcer" type="text" readonly tabindex="-1" style="background:var(--bg);font-weight:bold;"></label>`;
code = code.replace(oldFormContent, newFormContent);

// 2. Update the input event listener to include cuan calculations
const oldListener = `document.addEventListener('input', (e) => {
        const form = e.target.closest('form[data-form="products"]');
        if (form && (e.target.name === 'basePriceEcer' || e.target.name === 'basePrice' || e.target.name === 'unitContent')) {
          const rawUnit = form.unitContent.value.trim();
          if (rawUnit === '') return; // Biarkan apa adanya jika Isi/Unit kosong
          
          const unitContent = parseFloat(rawUnit);
          if (isNaN(unitContent) || unitContent <= 0) return;
  
          if (e.target.name === 'basePriceEcer') {
            const ecer = parseFloat(e.target.value) || 0;
            form.basePrice.value = Math.round(ecer * unitContent);
          } else if (e.target.name === 'basePrice' || e.target.name === 'unitContent') {
            const base = parseFloat(form.basePrice.value) || 0;
            form.basePriceEcer.value = Math.round(base / unitContent);
          }
        }
      });`;

const newListener = `document.addEventListener('input', (e) => {
        const form = e.target.closest('form[data-form="products"]');
        if (!form) return;
        
        // Handle Auto-Calculation for Base Price
        if (e.target.name === 'basePriceEcer' || e.target.name === 'basePrice' || e.target.name === 'unitContent') {
          const rawUnit = form.unitContent.value.trim();
          if (rawUnit !== '') {
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
        
        // Handle Cuan Calculation update
        if (['basePrice', 'basePriceEcer', 'salePrice', 'salePriceEcer', 'unitContent'].includes(e.target.name)) {
           const bPrice = parseFloat(form.basePrice.value) || 0;
           const sPrice = parseFloat(form.salePrice.value) || 0;
           const bPriceEcer = parseFloat(form.basePriceEcer.value) || 0;
           const sPriceEcer = parseFloat(form.salePriceEcer.value) || 0;
           
           const cuanGrosir = sPrice - bPrice;
           const cuanEcer = sPriceEcer - bPriceEcer;
           
           if(form.cuanGrosir) {
              form.cuanGrosir.value = sPrice > 0 ? rupiah(cuanGrosir) : '';
              form.cuanGrosir.style.color = cuanGrosir >= 0 ? '#10b981' : '#f43f5e';
           }
           if(form.cuanEcer) {
              form.cuanEcer.value = sPriceEcer > 0 ? rupiah(cuanEcer) : '';
              form.cuanEcer.style.color = cuanEcer >= 0 ? '#10b981' : '#f43f5e';
           }
        }
      });`;
      
code = code.replace(oldListener, newListener);

// Also we need to initialize cuan when form opens.
// We can do this inside the edit form initialization or just by triggering an event.
// Let's patch where edit form populates `actionForm`
// We can just add a patch to the general showModal for the form to trigger 'input' on unitContent if it exists
const oldEditFormPopulate = `const evt = new Event("input", { bubbles: true });`; // Let's check if there's any. There might not be.

fs.writeFileSync('index.html', code);
console.log('Update Product Cuan completed.');
