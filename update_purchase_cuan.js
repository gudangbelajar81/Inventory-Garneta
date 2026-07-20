const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// 1. Rewrite purchaseForm to include cuan and unitContent fields
const purchaseFormRegex = /function purchaseForm\(\) \{[\s\S]*?return `<form data-form="purchases" class="grid forms">[\s\S]*?<\/form>\`;\s*\}/;

const newPurchaseForm = `function purchaseForm() {
        const cats = [...new Set((state?.data?.products || []).map(p => p.category).filter(Boolean))];
        return \`<form data-form="purchases" class="grid forms">
          \${hiddenId()}
          \${input("date", "Tanggal", true, "date", today())}
          <label>Kategori Barang<input name="category" type="text" list="category-list">
            <datalist id="category-list">\${cats.map(opt => \`<option value="\${escapeAttr(opt)}">\`).join("")}</datalist>
          </label>
          \${input("name", "Nama Barang", true)}
          \${select("unit", "Unit Grosir", ["-", "Sak", "Karton", "Dus", "Jligen", "Ball", "Pack", "Kotak"])}
          \${select("unitEcer", "Unit Eceran", ["-", "pcs", "kg", "gram", "renteng", "pack", "biji", "buah", "botol"])}
          \${input("unitContent", "Isi/Unit", false, "number")}
          \${input("basePrice", "Harga Dasar (Beli)", false, "number")}
          \${input("basePriceEcer", "Harga Dasar Ecer", false, "number")}
          \${input("salePrice", "Harga Jual (Grosir)", false, "number")}
          \${input("salePriceEcer", "Harga Jual Ecer", false, "number")}
          <label>Potensi Cuan (Grosir)<input name="cuanGrosir" type="text" readonly tabindex="-1" style="background:var(--bg);font-weight:bold;"></label>
          <label>Potensi Cuan (Ecer/Pcs)<input name="cuanEcer" type="text" readonly tabindex="-1" style="background:var(--bg);font-weight:bold;"></label>
          \${formButtons()}
        </form>\`;
      }`;

code = code.replace(purchaseFormRegex, newPurchaseForm);

// 2. Add event trigger to fillForm to update cuan calculation
// I already did this in a previous replace, but I'll make sure it's applied correctly here too if I checkout'd
// Wait, git checkout reset my previous replace for fillForm?
// Yes, the previous commit was before I did git checkout? No, git checkout only resets uncommitted changes!
// My cuan form in product was already committed! So git checkout didn't lose the product form changes.
// So the listener is already updated by update_product_cuan.js from earlier!

fs.writeFileSync('index.html', code);
console.log('Update Purchase Form completed.');
