import os
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

new_pages = '''
      function riwayat() {
        setTimeout(() => window.renderRiwayatTable(), 50);
        return 
          <div class="card" style="padding-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h2>📝 Riwayat Transaksi</h2>
              <button class="btn danger" onclick="window.clearRiwayat()" style="padding: 6px 12px; font-size: 0.8rem;">Reset</button>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Pelanggan</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody id="riwayat-tbody"></tbody>
              </table>
            </div>
          </div>
        ;
      }
      
      window.renderRiwayatTable = function() {
        const tbody = document.getElementById('riwayat-tbody');
        if (!tbody) return;
        const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
        if (txs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#888;">Belum ada riwayat transaksi.</td></tr>';
          return;
        }
        
        tbody.innerHTML = txs.map((tx, idx) => 
          <tr>
            <td style="font-size: 0.75rem;"></td>
            <td style="font-weight: 800;"></td>
            <td style="color: #ee4d2d; font-weight: bold;">Rp </td>
            <td>
              <span style="padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; 
              background: ; 
              color: ;">
                
              </span>
            </td>
            <td style="display: flex; gap: 4px;">
               <button class="btn" onclick="window.reprintRiwayat(, 'pdf')" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem;" title="Cetak Ulang">🖨️</button>
            </td>
          </tr>
        ).join('');
      };
      
      window.clearRiwayat = function() {
        if(confirm("Yakin ingin menghapus seluruh riwayat transaksi?")) {
           localStorage.setItem('transactions', '[]');
           window.renderRiwayatTable();
        }
      };
      
      window.reprintRiwayat = function(idx, method) {
         const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
         const tx = txs[idx];
         if (tx) {
            window.ngitungPrintPDF(tx);
         }
      };
      
      function hutang() {
        setTimeout(() => window.renderHutangTable(), 50);
        return 
          <div class="card" style="padding-bottom: 24px;">
            <h2>💰 Riwayat Hutang (Kasbon)</h2>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Pelanggan</th>
                    <th>Sisa Hutang</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody id="hutang-tbody"></tbody>
              </table>
            </div>
          </div>
        ;
      }
      
      window.renderHutangTable = function() {
        const tbody = document.getElementById('hutang-tbody');
        if (!tbody) return;
        const hutangs = JSON.parse(localStorage.getItem('hutang') || '[]');
        const aktifHutangs = hutangs.filter(h => h.sisaTagihan > 0);
        
        if (aktifHutangs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color:#888;">Tidak ada kasbon aktif. Luar biasa! 🎉</td></tr>';
          return;
        }
        
        tbody.innerHTML = aktifHutangs.map((h, idx) => 
          <tr>
            <td style="font-weight: 800;"></td>
            <td style="color: #ff4757; font-weight: bold;">Rp </td>
            <td style="font-size: 0.75rem;"></td>
            <td style="display: flex; gap: 4px; align-items:center;">
               <button class="btn" onclick="window.bayarHutang('')" style="background: var(--garneta-cyan); color: #000; padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; font-weight: bold;">LUNAS</button>
               <button class="btn" onclick="window.reprintHutang('')" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem;" title="Cetak Ulang">🖨️</button>
            </td>
          </tr>
        ).join('');
      };
      
      window.bayarHutang = function(id) {
         let hutangs = JSON.parse(localStorage.getItem('hutang') || '[]');
         const index = hutangs.findIndex(h => h.id === id);
         if (index !== -1) {
            if(confirm('Yakin ingin melunasi sisa hutang Rp ' + new Intl.NumberFormat('id-ID').format(hutangs[index].sisaTagihan) + ' atas nama ' + hutangs[index].customer + '?')) {
               hutangs[index].sisaTagihan = 0;
               localStorage.setItem('hutang', JSON.stringify(hutangs));
               window.renderHutangTable();
               showToast("Hutang berhasil dilunasi!", "success");
            }
         }
      };
      
      window.reprintHutang = function(id) {
         let hutangs = JSON.parse(localStorage.getItem('hutang') || '[]');
         const h = hutangs.find(x => x.id === id);
         if (h) {
            window.ngitungPrintPDF(h);
         }
      };

      function kalkulator() {
'''

html = html.replace('function kalkulator() {', new_pages, 1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
