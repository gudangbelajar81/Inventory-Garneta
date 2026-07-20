const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// 1. Rewrite dailySales to group by date AND include details
const oldDailySalesRegex = /function dailySales\(\) \{[\s\S]*?return Object\.keys\(map\)\.sort\(\)\.map\(\(date\) => \(\{ date, profit: map\[date\] \}\)\);\s*\}/;
const newDailySales = `function dailySales() {
      const map = {};
      state.data.sales.forEach((sale) => {
        const dateStr = sale.date.split('T')[0];
        if (!map[dateStr]) map[dateStr] = { date: dateStr, profit: 0, items: [] };
        map[dateStr].profit += Number(sale.profit || 0);
        
        let productName = "Produk Dihapus";
        let unitContent = 1;
        if (sale.productId) {
           const p = state.data.products.find(x => String(x.id) === String(sale.productId));
           if (p) { productName = p.name; unitContent = p.unitContent || 1; }
        }
        
        map[dateStr].items.push({
          ...sale,
          productName,
          unitContent,
          cuan: Number(sale.profit || 0)
        });
      });
      return Object.keys(map).sort((a,b) => new Date(b) - new Date(a)).map((date) => map[date]); // sort newest first
    }`;
code = code.replace(oldDailySalesRegex, newDailySales);

// 2. Rewrite laporan() to use the expandable table
const oldLaporanRegex = /function laporan\(\) \{[\s\S]*?<\/section>\`;\s*\}/;
const newLaporan = `function laporan() {
      const rows = dailySales();
      
      // Hitung total bulan ini
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
      const monthlyProfit = rows
        .filter(row => row.date.startsWith(currentMonth))
        .reduce((sum, row) => sum + row.profit, 0);

      // Render Expandable Table
      const tableHTML = \`<div class="table-wrap">
        <table class="expandable-table">
          <thead>
            <tr>
              <th style="width:50px"></th>
              <th>TANGGAL</th>
              <th style="text-align:right">KEUNTUNGAN</th>
            </tr>
          </thead>
          <tbody>
            \${rows.map((row, i) => \`
              <tr class="expandable-row" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.arrow').classList.toggle('open');">
                <td style="text-align:center"><span class="arrow" style="display:inline-block; transition:transform 0.2s;">▼</span></td>
                <td style="font-weight:bold">\${row.date}</td>
                <td style="text-align:right; font-weight:bold; color:\${row.profit >= 0 ? '#10b981' : '#f43f5e'}">\${rupiah(row.profit)}</td>
              </tr>
              <tr class="details-row hidden" style="background:var(--bg); border-bottom:2px solid var(--border);">
                <td colspan="3" style="padding:1rem;">
                  <table style="width:100%; margin:0; background:var(--card); box-shadow:none; border:1px solid var(--border);">
                    <thead>
                      <tr>
                        <th style="font-size:0.8rem; padding:0.5rem">Jam</th>
                        <th style="font-size:0.8rem; padding:0.5rem">Barang</th>
                        <th style="font-size:0.8rem; padding:0.5rem">Unit</th>
                        <th style="font-size:0.8rem; padding:0.5rem; text-align:right">Cuan</th>
                        <th style="font-size:0.8rem; padding:0.5rem; text-align:center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      \${row.items.map(item => \`
                        <tr>
                          <td style="font-size:0.9rem; padding:0.5rem">\${new Date(item.date).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</td>
                          <td style="font-size:0.9rem; padding:0.5rem">\${escapeAttr(item.productName)}</td>
                          <td style="font-size:0.9rem; padding:0.5rem">\${item.unitSold}</td>
                          <td style="font-size:0.9rem; padding:0.5rem; text-align:right; color:\${item.cuan >= 0 ? '#10b981' : '#f43f5e'}">\${rupiah(item.cuan)}</td>
                          <td style="font-size:0.9rem; padding:0.5rem; text-align:center">
                            <button class="btn danger small" onclick="deleteSale('\${item.id}')" style="padding:0.25rem 0.5rem; font-size:0.8rem">Hapus</button>
                          </td>
                        </tr>
                      \`).join('')}
                    </tbody>
                  </table>
                </td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      </div>\`;

      return \`<section class="grid">
        <div class="card" style="grid-column: 1 / -1; background: linear-gradient(135deg, #1e293b, #0f172a); border-left: 4px solid #10b981;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h3 style="margin:0; color:var(--text-muted); font-size:1rem;">Total Keuntungan Bulan Ini</h3>
              <p style="margin:0; font-size:0.9rem; color:var(--text-muted);">Periode: \${new Date().toLocaleDateString('id-ID', {month:'long', year:'numeric'})}</p>
            </div>
            <h2 style="margin:0; color:#10b981; font-size:2rem;">\${rupiah(monthlyProfit)}</h2>
          </div>
        </div>
        
        <div class="card">
          <h2>Laporan Penjualan Harian</h2>
          \${tableHTML}
        </div>
        
        <div class="card">
          <h2>Grafik Keuntungan (30 Hari Terakhir)</h2>
          \${barChart(rows.slice(0, 30).reverse().map((row) => row.profit))}
        </div>
      </section>\`;
    }
    
    // Attach global delete function for sale
    window.deleteSale = async function(id) {
       if (!confirm("Batal transaksi ini? Data akan dihapus dan stok akan dikembalikan.")) return;
       try {
         await gas("remove", { collection: "sales", id });
         await load();
       } catch (err) {
         alert("Gagal menghapus: " + err.message);
       }
    };
    `;
code = code.replace(oldLaporanRegex, newLaporan);

// 3. Add some CSS for the arrow transition
const cssAdd = `
    .expandable-row { cursor: pointer; }
    .expandable-row:hover { background-color: var(--hover) !important; }
    .arrow.open { transform: rotate(180deg) !important; }
    .hidden { display: none !important; }
`;
code = code.replace('</style>', cssAdd + '\n  </style>');

fs.writeFileSync('index.html', code);
console.log('Update Laporan completed.');
