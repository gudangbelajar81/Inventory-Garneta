const fs = require('fs');

let indexCode = fs.readFileSync('index.html', 'utf8');

const searchFuncs = `
      window.searchBarang = function(query) {
        if (!query) {
          const res = document.getElementById("search-barang-results");
          if (res) res.innerHTML = "";
          return;
        }
        const q = query.toLowerCase();
        const results = (state.data.products || []).filter(p => 
          (p.name && p.name.toLowerCase().includes(q)) || 
          (p.category && p.category.toLowerCase().includes(q)) || 
          (p.barcode && String(p.barcode).toLowerCase().includes(q))
        );
        const res = document.getElementById("search-barang-results");
        if (res) {
          res.innerHTML = actionTable("products", results, ["category", "name", "unit", "unitContent", "unitEcer", "basePrice", "basePriceEcer", "costPrice", "salePrice", "salePriceEcer", "stock", "barcode"], ["Kategori", "Nama", "Unit Grosir", "Isi", "Unit Ecer", "Harga Dasar", "H. Dasar/Ecer", "HPP", "H. Jual Grosir", "H. Jual Ecer", "Stok", "Barcode"], priceFormat);
        }
      };
      
      window.clearSearchBarang = function() {
        const input = document.getElementById("search-barang-input");
        if (input) input.value = "";
        window.searchBarang("");
      };

      window.searchPembelian = function(query) {
        if (!query) {
          const res = document.getElementById("search-pembelian-results");
          if (res) res.innerHTML = "";
          return;
        }
        const q = query.toLowerCase();
        const results = (state.data.purchases || []).filter(p => 
          (p.date && String(p.date).toLowerCase().includes(q)) || 
          (p.product && p.product.toLowerCase().includes(q))
        );
        const res = document.getElementById("search-pembelian-results");
        if (res) {
          res.innerHTML = actionTable("purchases", results, ["date", "product", "qty", "amount", "total"], ["Tanggal", "Barang", "Banyak", "Harga", "Total"], priceFormat);
        }
      };
      
      window.clearSearchPembelian = function() {
        const input = document.getElementById("search-pembelian-input");
        if (input) input.value = "";
        window.searchPembelian("");
      };
`;

if (!indexCode.includes('window.searchBarang')) {
  indexCode = indexCode.replace(/function bindForms\(\) \{/, searchFuncs + '\n      function bindForms() {');
  fs.writeFileSync('index.html', indexCode);
  console.log('index.html updated with search functions');
} else {
  console.log('Search functions already exist');
}
