const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Remove Sticky Bottom Bar and Checkout Bottom Sheet
const startToken = '<!-- STICKY BOTTOM BAR (SHOPEE STYLE) -->';
const endToken = '</div>\n          </div>\n        `;\n      }';
const startIndex = html.indexOf(startToken);
const endIndex = html.indexOf(endToken, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `
            <!-- INLINE POS CHECKOUT -->
            <div class="ngitung-inline-checkout" style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px; margin-top: 16px; border: 1px solid rgba(255,255,255,0.05);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="color: #aaa; font-size: 0.85rem;">Total Belanja</span>
                <span id="ngitung-inline-total" style="font-size: 1.25rem; font-weight: 900; color: #ee4d2d;">Rp 0</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px;">
                <span style="color: #aaa; font-size: 0.85rem; flex: 1;">Jumlah Bayar</span>
                <input type="number" id="ngitung-inline-bayar" inputmode="numeric" placeholder="0" oninput="ngitungHandleBayarInput()" style="flex: 1; text-align: right; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px 12px; border-radius: 8px; font-weight: 900; font-size: 1.1rem; width: 100%;">
              </div>
              
              <div id="ngitung-inline-status-container" class="hidden" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 12px; border-radius: 8px;">
                <span id="ngitung-inline-status-label" style="font-size: 0.85rem; font-weight: 800;">Status</span>
                <span id="ngitung-inline-status-value" style="font-size: 1.1rem; font-weight: 900;">-</span>
              </div>
              
              <div id="ngitung-inline-customer-container" class="hidden" style="margin-bottom: 16px;">
                <input type="text" id="ngitung-inline-customer" placeholder="Nama Pelanggan (Wajib untuk Hutang)" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px; border-radius: 8px;">
              </div>
              
              <div style="display: flex; gap: 8px; align-items: center;">
                <button class="btn" onclick="ngitungProcessCheckout('save')" style="background: linear-gradient(135deg, #f53d2d, #ff6633); color: #fff; font-weight: 800; border: none; padding: 12px; border-radius: 8px; flex: 1; text-transform: uppercase;">Simpan Transaksi</button>
                <button class="btn" onclick="ngitungProcessCheckout('pdf')" style="background: #00a8ff; border: none; color: #fff; padding: 12px; border-radius: 8px; font-size: 1.2rem; width: 48px; padding: 0; display:flex; justify-content:center; align-items:center;" title="Cetak PDF">📄</button>
                <button class="btn" onclick="ngitungProcessCheckout('bluetooth')" style="background: var(--GARNETA STORE-cyan); color: #000; border: none; padding: 12px; border-radius: 8px; font-size: 1.2rem; width: 48px; padding: 0; display:flex; justify-content:center; align-items:center;" title="Bluetooth">🖨️</button>
                <button class="btn" onclick="ngitungProcessCheckout('wa')" style="background: #25D366; border: none; color: #fff; padding: 12px; border-radius: 8px; font-size: 1.2rem; width: 48px; padding: 0; display:flex; justify-content:center; align-items:center;" title="Kirim WA">💬</button>
              </div>
            </div>
            
          </div>
        `;
      }`;
  
  html = html.substring(0, startIndex) + replacement + html.substring(endIndex + endToken.length);
}

// 2. Add riwayat() and hutang() pages logic just before function kalkulator()
const kalkulatorIndex = html.indexOf('function kalkulator() {');
if (kalkulatorIndex !== -1) {
  const newPages = `
      function riwayat() {
        setTimeout(() => window.renderRiwayatTable(), 50);
        return \`
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
        \`;
      }
      
      window.renderRiwayatTable = function() {
        const tbody = document.getElementById('riwayat-tbody');
        if (!tbody) return;
        const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
        if (txs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#888;">Belum ada riwayat transaksi.</td></tr>';
          return;
        }
        
        tbody.innerHTML = txs.map((tx, idx) => \`
          <tr>
            <td style="font-size: 0.75rem;">\${tx.date}</td>
            <td style="font-weight: 800;">\${tx.customer}</td>
            <td style="color: #ee4d2d; font-weight: bold;">Rp \${new Intl.NumberFormat('id-ID').format(tx.grandTotal)}</td>
            <td>
              <span style="padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; 
              background: \${tx.paymentType === 'tunai' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(255, 71, 87, 0.2)'}; 
              color: \${tx.paymentType === 'tunai' ? '#2ecc71' : '#ff4757'};">
                \${tx.paymentType.toUpperCase()}
              </span>
            </td>
            <td>
               <button class="btn" onclick="window.reprintRiwayat(\${idx})" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem;" title="Cetak Ulang">🖨️</button>
            </td>
          </tr>
        \`).join('');
      };
      
      window.clearRiwayat = function() {
        if(confirm("Yakin ingin menghapus seluruh riwayat transaksi?")) {
           localStorage.setItem('transactions', '[]');
           window.renderRiwayatTable();
        }
      };
      
      window.reprintRiwayat = function(idx) {
         const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
         const tx = txs[idx];
         if (tx) {
            window.ngitungPrintPDF(tx);
         }
      };
      
      function hutang() {
        setTimeout(() => window.renderHutangTable(), 50);
        return \`
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
        \`;
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
        
        tbody.innerHTML = aktifHutangs.map((h, idx) => \`
          <tr>
            <td style="font-weight: 800;">\${h.customer}</td>
            <td style="color: #ff4757; font-weight: bold;">Rp \${new Intl.NumberFormat('id-ID').format(h.sisaTagihan)}</td>
            <td style="font-size: 0.75rem;">\${h.date}</td>
            <td style="display: flex; gap: 4px;">
               <button class="btn" onclick="window.bayarHutang('\${h.id}')" style="background: var(--GARNETA STORE-cyan); color: #000; padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; font-weight: bold;">LUNAS</button>
               <button class="btn" onclick="window.reprintHutang('\${h.id}')" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem;" title="Cetak Ulang">🖨️</button>
            </td>
          </tr>
        \`).join('');
      };
      
      window.bayarHutang = function(id) {
         let hutangs = JSON.parse(localStorage.getItem('hutang') || '[]');
         const index = hutangs.findIndex(h => h.id === id);
         if (index !== -1) {
            if(confirm(\`Yakin ingin melunasi sisa hutang Rp \${new Intl.NumberFormat('id-ID').format(hutangs[index].sisaTagihan)} atas nama \${hutangs[index].customer}?\`)) {
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
`;
  html = html.substring(0, kalkulatorIndex) + newPages + html.substring(kalkulatorIndex);
}

// 3. Update ngitungJS logic (HandleBayarInput & ProcessCheckout)
const jsStartStr = '// SHOPEE-STYLE CHECKOUT LOGIC';
const jsEndStr = 'window.ngitungClearAll = function() {';
const jsStartIdx = html.indexOf(jsStartStr);
const jsEndIdx = html.indexOf(jsEndStr, jsStartIdx);

if (jsStartIdx !== -1 && jsEndIdx !== -1) {
  const newJs = `
      // INLINE POS CHECKOUT LOGIC
      window.ngitungPaymentType = "tunai";
      
      window.ngitungHandleBayarInput = function() {
         const bayarEl = document.getElementById("ngitung-inline-bayar");
         const statusCont = document.getElementById("ngitung-inline-status-container");
         const statusLabel = document.getElementById("ngitung-inline-status-label");
         const statusVal = document.getElementById("ngitung-inline-status-value");
         const customerCont = document.getElementById("ngitung-inline-customer-container");
         
         if (!bayarEl || bayarEl.value === "") {
            statusCont.classList.add("hidden");
            customerCont.classList.add("hidden");
            window.ngitungPaymentType = "tunai";
            return;
         }
         
         statusCont.classList.remove("hidden");
         
         const bayar = Number(bayarEl.value);
         const total = window.ngitungTotalRaw || 0;
         
         if (bayar >= total) {
            window.ngitungPaymentType = "tunai";
            customerCont.classList.add("hidden");
            statusCont.style.background = "rgba(46, 204, 113, 0.15)";
            statusCont.style.border = "1px solid rgba(46, 204, 113, 0.3)";
            
            const kembali = bayar - total;
            if (kembali === 0) {
               statusLabel.innerText = "Status";
               statusLabel.style.color = "#2ecc71";
               statusVal.innerText = "PAS / LUNAS";
               statusVal.style.color = "#2ecc71";
            } else {
               statusLabel.innerText = "Kembalian";
               statusLabel.style.color = "#2ecc71";
               statusVal.innerText = "Rp " + new Intl.NumberFormat("id-ID").format(kembali);
               statusVal.style.color = "#2ecc71";
            }
         } else {
            window.ngitungPaymentType = "kasbon";
            customerCont.classList.remove("hidden");
            statusCont.style.background = "rgba(255, 71, 87, 0.15)";
            statusCont.style.border = "1px solid rgba(255, 71, 87, 0.3)";
            
            const hutang = total - bayar;
            statusLabel.innerText = "Sisa Hutang";
            statusLabel.style.color = "#ff4757";
            statusVal.innerText = "Rp " + new Intl.NumberFormat("id-ID").format(hutang);
            statusVal.style.color = "#ff4757";
         }
      };
      
      window.ngitungProcessCheckout = function(actionType) {
        let validRows = window.ngitungRows.filter(r => r.name.trim().length > 0 && r.qty > 0 && r.price >= 0);
        if (validRows.length === 0) {
           showToast("Barang tidak valid!", "error");
           return;
        }
        
        const customerEl = document.getElementById("ngitung-inline-customer");
        const customer = customerEl ? customerEl.value.trim() : "";
        
        if (window.ngitungPaymentType === "kasbon" && !customer) {
           showToast("Nama pelanggan wajib diisi untuk Kasbon!", "error");
           if(customerEl) customerEl.focus();
           return;
        }
        
        const bayarEl = document.getElementById("ngitung-inline-bayar");
        const dp = bayarEl && bayarEl.value ? Number(bayarEl.value) : 0;
        
        const total = window.ngitungTotalRaw || 0;
        let sisaTagihan = 0;
        if (window.ngitungPaymentType === "kasbon") {
           sisaTagihan = total - dp;
        }
        
        let receiptData = {
           id: "TRX-" + Date.now(),
           customer: customer || "Umum",
           date: new Date().toLocaleString("id-ID"),
           paymentType: window.ngitungPaymentType,
           items: validRows,
           subtotal: total,
           discount: 0,
           dp: dp,
           grandTotal: total,
           sisaTagihan: sisaTagihan
        };
        
        // Save to localStorage
        let txs = JSON.parse(localStorage.getItem("transactions") || "[]");
        txs.unshift(receiptData);
        localStorage.setItem("transactions", JSON.stringify(txs));
        
        if (window.ngitungPaymentType === "kasbon") {
           let hutangs = JSON.parse(localStorage.getItem("hutang") || "[]");
           hutangs.unshift(receiptData);
           localStorage.setItem("hutang", JSON.stringify(hutangs));
        }
        
        if (actionType === "save") {
           showToast("Transaksi Berhasil Disimpan!", "success");
           window.ngitungClearAll();
           if(bayarEl) bayarEl.value = "";
           window.ngitungHandleBayarInput();
        } else if (actionType === "pdf") {
           window.ngitungPrintPDF(receiptData);
           showToast("Transaksi Disimpan & PDF Dicetak", "success");
           window.ngitungClearAll();
           if(bayarEl) bayarEl.value = "";
           window.ngitungHandleBayarInput();
        } else if (actionType === "bluetooth") {
           showToast("Transaksi Disimpan. Fitur BT Checkout coming soon!", "info");
           window.ngitungClearAll();
        } else if (actionType === "wa") {
           window.ngitungPrintWhatsApp(receiptData);
           showToast("Transaksi Disimpan & Dialihkan ke WA", "success");
           window.ngitungClearAll();
        }
      };
      
      window.ngitungUpdateInlineTotal = function() {
         const totalEl = document.getElementById("ngitung-inline-total");
         if (totalEl) {
            totalEl.innerText = "Rp " + new Intl.NumberFormat("id-ID").format(window.ngitungTotalRaw || 0);
         }
         window.ngitungHandleBayarInput();
      };
      
      window.ngitungPrintWhatsApp = function(data) {
         let msg = "*STRUK PEMBELIAN - " + data.date + "*\\n";
         msg += "Pelanggan: " + data.customer + "\\n";
         msg += "Status: " + (data.paymentType === "tunai" ? "LUNAS" : "KASBON") + "\\n";
         msg += "------------------------\\n";
         
         data.items.forEach(r => {
            let amount = r.price * r.qty;
            if (amount > 0) amount = Math.ceil(amount / 500) * 500;
            msg += r.name + "\\n" + r.qty + " x " + new Intl.NumberFormat("id-ID").format(r.price) + " = " + new Intl.NumberFormat("id-ID").format(amount) + "\\n";
         });
         
         msg += "------------------------\\n";
         msg += "*Total: Rp " + new Intl.NumberFormat("id-ID").format(data.grandTotal) + "*\\n";
         
         if (data.paymentType === "kasbon") {
            msg += "\\nDP/Bayar: Rp " + new Intl.NumberFormat("id-ID").format(data.dp) + "\\n";
            msg += "*Sisa Hutang: Rp " + new Intl.NumberFormat("id-ID").format(data.sisaTagihan) + "*\\n";
         }
         
         const waUrl = "https://wa.me/?text=" + encodeURIComponent(msg);
         window.open(waUrl, "_blank");
      };
      
      window.ngitungPrintPDF = function(data) {
         let itemsHtml = data.items.map(r => {
            let amount = r.price * r.qty;
            if (amount > 0) amount = Math.ceil(amount / 500) * 500;
            return \`
              <div class="item-row">
                <div class="item-name">\${r.name}</div>
                <div class="item-details">
                  <span>\${r.qty} x \${new Intl.NumberFormat("id-ID").format(r.price)}</span>
                  <span>\${new Intl.NumberFormat("id-ID").format(amount)}</span>
                </div>
              </div>
            \`;
         }).join("");
         
         let rupiah = (num) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
         
         let receiptHtml = \`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Struk - \${data.customer}</title>
              <style>
                @page { margin: 0; }
                body {
                  font-family: Arial, Helvetica, sans-serif;
                  width: 44mm;
                  margin: 0;
                  padding: 0 4mm 0 0;
                  box-sizing: border-box;
                  font-size: 13px;
                  font-weight: 600;
                  color: #000000 !important;
                  background: #fff;
                  line-height: 1.3;
                }
                .header { text-align: center; margin-bottom: 15px; }
                .header h2 { margin: 0 0 5px 0; font-size: 18px; font-weight: 900; }
                .header div { font-weight: bold; font-size: 12px; }
                .divider { border-top: 2px dashed #000000; margin: 10px 0; }
                .item-row { margin-bottom: 6px; }
                .item-name { font-weight: 900; font-size: 14px; }
                .item-details { display: flex; justify-content: space-between; font-weight: bold; }
                .total-section { display: flex; justify-content: space-between; font-weight: 900; font-size: 16px; margin-top: 5px; }
                .sub-section { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; font-weight: bold; }
                * { color: #000000 !important; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2 style="font-size: 22px; margin-bottom: 2px;">Toko GARNETA STORE</h2>
                <div>085123871118</div>
                <div>\${data.date}</div>
                <div>Pelanggan: \${data.customer}</div>
                <div>Status: \${data.paymentType === "tunai" ? "LUNAS" : "KASBON"}</div>
              </div>
              <div class="divider"></div>
              \${itemsHtml}
              <div class="divider"></div>
              <div class="total-section">
                <span>TOTAL</span><span>\${rupiah(data.grandTotal)}</span>
              </div>
              \${data.paymentType === "kasbon" ? \`
              <div class="divider"></div>
              <div class="sub-section"><span>DP/Bayar</span><span>\${rupiah(data.dp)}</span></div>
              <div class="total-section" style="font-size:14px;"><span>Sisa Hutang</span><span>\${rupiah(data.sisaTagihan)}</span></div>
              \` : ""}
              <div class="footer">Terima kasih atas<br>kunjungan Anda!</div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(() => window.close(), 500);
                };
              <\\/script>
            </body>
          </html>
         \`;
         const printWindow = window.open("", "_blank", "width=300,height=500");
         printWindow.document.write(receiptHtml);
         printWindow.document.close();
      };
      
      window.ngitungPrintBluetoothCheckout = async function(data) {
          showToast("Bluetooth Kasbon print coming soon! (Gunakan PDF / WA sementara)", "info");
      };
\n`;
  html = html.substring(0, jsStartIdx) + newJs + html.substring(jsEndIdx);
}

// 4. Update ngitungUpdateInlineTotal hook
const sumLogicOld = 'window.ngitungTotalRaw = sum;';
const sumLogicNew = 'window.ngitungTotalRaw = sum;\n      if (window.ngitungUpdateInlineTotal) window.ngitungUpdateInlineTotal();';
html = html.replace(sumLogicOld, sumLogicNew);

// 5. Remove padding-bottom: 50vh from ngitung-container because we don't use sticky bar anymore, wait, user still wants safety space!
// But wait, the inline checkout is INSIDE .table-wrap, so padding-bottom on container is fine, but maybe we can reduce it. I will keep it for now.

fs.writeFileSync('index.html', html, 'utf8');
console.log("SUCCESS!");
