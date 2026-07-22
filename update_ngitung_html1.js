const fs = require('fs');
let html = fs.readFileSync('D:/JADI/SAAS/inventory system/index.html', 'utf8');

html = html.replace(
  'onclick="ngitungPrintPDF()"',
  'onclick="ngitungProcessCheckout(\'pdf\')"'
);
html = html.replace(
  'onclick="ngitungPrintBluetooth()"',
  'onclick="ngitungProcessCheckout(\'bluetooth\')"'
);
html = html.replace(
  'onclick="ngitungSendWA()"',
  'onclick="ngitungProcessCheckout(\'wa\')"'
);

const tabsInjection = `
          <div style="display:flex; background:var(--surface); border-radius:12px; padding:4px; margin-bottom:20px; overflow-x:auto;">
            <button onclick="window.ngitungWorkspace = 'kalkulator'; renderShell();" style="flex:1; padding:12px 15px; border-radius:8px; border:none; background:${(window.ngitungWorkspace||'kalkulator') === 'kalkulator' ? 'var(--primary)' : 'transparent'}; color:${(window.ngitungWorkspace||'kalkulator') === 'kalkulator' ? '#fff' : 'var(--text-muted)'}; font-weight:bold; font-size:0.9rem; cursor:pointer; white-space:nowrap; transition:all 0.2s;">🧮 Kalkulator</button>
            <button onclick="window.ngitungWorkspace = 'riwayat'; window.ngitungRenderHistory(); renderShell();" style="flex:1; padding:12px 15px; border-radius:8px; border:none; background:${window.ngitungWorkspace === 'riwayat' ? 'var(--primary)' : 'transparent'}; color:${window.ngitungWorkspace === 'riwayat' ? '#fff' : 'var(--text-muted)'}; font-weight:bold; font-size:0.9rem; cursor:pointer; white-space:nowrap; transition:all 0.2s;">🕒 Riwayat & Hutang</button>
          </div>
`;

html = html.replace(
  '<div id="ngitung-reader-container"',
  tabsInjection + '\n          <div id="ngitung-reader-container"'
);

html = html.replace(
  'function ngitung() {',
  `function ngitung() {
      if (window.ngitungWorkspace === 'riwayat') {
        return \`
        <div style="max-width: 800px; margin: 0 auto; width: 100%; padding: 10px 5px;">
${tabsInjection}
          <div id="ngitung-history-ui-container">Loading...</div>
        </div>
        \`;
      }
`
);

const logicInjection = `
    window.ngitungRenderHistory = async function() {
      const container = document.getElementById('ngitung-history-ui-container');
      if (!container) return;
      try {
        const history = await gas("list", { collection: "ngitungSales" });
        const formatRibuan = (num) => new Intl.NumberFormat('id-ID').format(num);
        if (history.length === 0) {
          container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">Belum ada riwayat transaksi.</div>';
          return;
        }
        let htmlStr = '';
        history.forEach(trx => {
          const isHutang = trx.status === 'Hutang';
          htmlStr += \`
            <div style="background:var(--surface); padding:15px; border-radius:12px; margin-bottom:15px; border-left: 4px solid \${isHutang ? '#e74c3c' : '#2ecc71'};">
              <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <div style="font-size:0.85rem; color:var(--text-muted);">\${new Date(trx.date).toLocaleString('id-ID')}</div>
                <div style="font-size:0.85rem; font-weight:bold; color:\${isHutang ? '#e74c3c' : '#2ecc71'};">\${trx.status}</div>
              </div>
              \${trx.customer_name ? \`<div style="font-weight:bold; color:var(--text); margin-bottom:10px;">👤 \${trx.customer_name}</div>\` : ''}
              <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span style="color:var(--text-muted);">Total Belanja:</span>
                <span style="font-weight:bold; color:var(--text);">Rp \${formatRibuan(trx.total_amount)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span style="color:var(--text-muted);">Telah Dibayar:</span>
                <span style="font-weight:bold; color:#2ecc71;">Rp \${formatRibuan(trx.paid_amount)}</span>
              </div>
              \${isHutang ? \`
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; padding-top:10px; border-top:1px dashed var(--border);">
                  <span style="font-weight:bold; color:#e74c3c;">Sisa Hutang:</span>
                  <span style="font-weight:bold; color:#e74c3c;">Rp \${formatRibuan(trx.total_amount - trx.paid_amount)}</span>
                </div>
                <button onclick="ngitungBayarCicilan(\${trx.id}, \${trx.total_amount - trx.paid_amount})" style="width:100%; padding:12px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-weight:bold; cursor:pointer;">💸 Bayar Cicilan</button>
              \` : ''}
            </div>
          \`;
        });
        container.innerHTML = htmlStr;
      } catch (e) {
        container.innerHTML = 'Gagal memuat data.';
      }
    };

    window.ngitungBayarCicilan = async function(id, sisaHutang) {
      const nominalStr = prompt('Masukkan nominal cicilan yang dibayarkan sekarang:');
      if (!nominalStr) return;
      const nominal = Number(nominalStr.replace(/[^0-9]/g, ''));
      if (nominal <= 0) return;
      
      try {
        const history = await gas("list", { collection: "ngitungSales" });
        const trx = history.find(h => h.id == id);
        if (!trx) return;
        
        trx.paid_amount = Number(trx.paid_amount) + nominal;
        if (trx.paid_amount >= trx.total_amount) {
          trx.status = 'Lunas';
        }
        trx.installments = trx.installments || [];
        trx.installments.push({ date: new Date().toISOString(), amount: nominal });
        
        await gas("update", { collection: "ngitungSales", id: trx.id, item: { ...trx, totalAmount: trx.total_amount, paidAmount: trx.paid_amount, customerName: trx.customer_name } });
        alert('Cicilan berhasil dibayarkan!');
        window.ngitungRenderHistory();
      } catch (e) {
        alert('Gagal memproses cicilan: ' + e.message);
      }
    };

    window.ngitungCalculateChange = function() {
      const totalText = document.getElementById('ngitung-total').textContent;
      const total = Number(totalText.replace(/[^0-9]/g, ''));
      const paidVal = document.getElementById('ngitung-payment-paid').value;
      const paid = Number(paidVal.replace(/[^0-9]/g, '')) || 0;
      const formatRibuan = (num) => new Intl.NumberFormat('id-ID').format(num);
      
      if (paid >= total) {
         document.getElementById('ngitung-payment-change-container').style.display = 'block';
         document.getElementById('ngitung-payment-debt-container').style.display = 'none';
         document.getElementById('ngitung-payment-customer-container').style.display = 'none';
         document.getElementById('ngitung-payment-change-label').textContent = 'Rp ' + formatRibuan(paid - total);
      } else {
         document.getElementById('ngitung-payment-change-container').style.display = 'none';
         document.getElementById('ngitung-payment-debt-container').style.display = 'block';
         document.getElementById('ngitung-payment-customer-container').style.display = 'block';
         document.getElementById('ngitung-payment-debt-label').textContent = 'Rp ' + formatRibuan(total - paid);
      }
    };

    window.ngitungProcessCheckout = function(method) {
      if (window.ngitungRows.length <= 1) {
        alert("Belum ada data belanjaan!");
        return;
      }
      let modal = document.getElementById('ngitung-payment-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ngitung-payment-modal';
        modal.style = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; justify-content:center; align-items:center; padding:20px;';
        modal.innerHTML = \`
          <div style="background:var(--bg); width:100%; max-width:400px; border-radius:16px; padding:24px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
            <h3 style="margin-top:0; color:var(--text); text-align:center;">Proses Pembayaran</h3>
            <div style="margin-bottom:15px;">
              <label style="display:block; color:var(--text-muted); font-size:0.85rem; margin-bottom:5px;">Total Tagihan</label>
              <div id="ngitung-payment-total-label" style="font-size:1.8rem; font-weight:bold; color:var(--primary);">Rp 0</div>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; color:var(--text-muted); font-size:0.85rem; margin-bottom:5px;">Dibayar (Tunai)</label>
              <input type="tel" id="ngitung-payment-paid" placeholder="Masukkan jumlah uang..." style="width:100%; padding:14px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:1.2rem; font-weight:bold;" oninput="ngitungCalculateChange()">
            </div>
            <div id="ngitung-payment-change-container" style="margin-bottom:15px; padding:12px; border-radius:8px; background:rgba(46, 204, 113, 0.1); border:1px solid rgba(46, 204, 113, 0.3);">
              <label style="display:block; color:var(--text-muted); font-size:0.85rem; margin-bottom:5px;">Kembalian</label>
              <div id="ngitung-payment-change-label" style="font-size:1.3rem; font-weight:bold; color:#2ecc71;">Rp 0</div>
            </div>
            <div id="ngitung-payment-debt-container" style="margin-bottom:15px; display:none; padding:12px; border-radius:8px; background:rgba(231, 76, 60, 0.1); border:1px solid rgba(231, 76, 60, 0.3);">
              <label style="display:block; color:var(--text-muted); font-size:0.85rem; margin-bottom:5px;">Sisa Hutang</label>
              <div id="ngitung-payment-debt-label" style="font-size:1.3rem; font-weight:bold; color:#e74c3c;">Rp 0</div>
            </div>
            <div id="ngitung-payment-customer-container" style="margin-bottom:20px; display:none;">
              <label style="display:block; color:var(--text-muted); font-size:0.85rem; margin-bottom:5px;">Nama Pelanggan (Hutang)</label>
              <input type="text" id="ngitung-payment-customer" placeholder="Nama yang berhutang..." style="width:100%; padding:14px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:1rem;">
            </div>
            <div style="display:flex; gap:10px;">
              <button onclick="document.getElementById('ngitung-payment-modal').style.display='none'" style="flex:1; padding:14px; border-radius:8px; border:1px solid var(--border); background:transparent; color:var(--text); font-weight:bold; cursor:pointer;">Batal</button>
              <button id="ngitung-payment-submit" style="flex:2; padding:14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-weight:bold; cursor:pointer;">Simpan & Cetak</button>
            </div>
          </div>
        \`;
        document.body.appendChild(modal);
      }
      
      const totalText = document.getElementById('ngitung-total').textContent;
      document.getElementById('ngitung-payment-total-label').textContent = totalText;
      document.getElementById('ngitung-payment-paid').value = totalText.replace(/[^0-9]/g, '');
      window.ngitungCalculateChange();
      
      modal.style.display = 'flex';
      
      const submitBtn = document.getElementById('ngitung-payment-submit');
      submitBtn.onclick = async function() {
        const total = Number(totalText.replace(/[^0-9]/g, ''));
        const paid = Number(document.getElementById('ngitung-payment-paid').value.replace(/[^0-9]/g, '')) || 0;
        const customerName = document.getElementById('ngitung-payment-customer').value;
        const status = paid >= total ? 'Lunas' : 'Hutang';
        
        if (status === 'Hutang' && !customerName.trim()) {
          alert("Nama pelanggan wajib diisi untuk transaksi hutang!");
          return;
        }
        
        submitBtn.textContent = 'Menyimpan...';
        
        const payload = {
          date: new Date(),
          customerName: customerName.trim(),
          totalAmount: total,
          paidAmount: paid,
          status: status,
          items: window.ngitungRows.filter(r => r.name || r.price)
        };
        
        try {
          await gas("add", { collection: "ngitungSales", item: payload });
        } catch(e) {
          console.error(e);
        }
        
        submitBtn.textContent = 'Simpan & Cetak';
        modal.style.display = 'none';
        
        if (method === 'pdf') window.ngitungPrintPDF(payload);
        else if (method === 'bluetooth') window.ngitungPrintBluetooth(payload);
        else if (method === 'wa') window.ngitungSendWA(payload);
      };
    };
` + "\n\n    window.ngitungRemoveRow = function";

html = html.replace('window.ngitungRemoveRow = function', logicInjection);

fs.writeFileSync('D:/JADI/SAAS/inventory system/index.html', html, 'utf8');
console.log('Success HTML replace 1');
