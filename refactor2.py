import os
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace HTML
start_token = '<!-- STICKY BOTTOM BAR (SHOPEE STYLE) -->'
end_token = 'function kalkulator() {'

start_idx = html.find(start_token)
end_idx = html.find(end_token, start_idx)

if start_idx != -1 and end_idx != -1:
    replacement = '''<!-- INLINE POS CHECKOUT -->
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
                <button class="btn" onclick="ngitungProcessCheckout('save')" style="background: linear-gradient(135deg, #f53d2d, #ff6633); color: #fff; font-weight: 800; border: none; padding: 12px; border-radius: 8px; flex: 1; text-transform: uppercase;">Simpan</button>
                <button class="btn" onclick="ngitungProcessCheckout('pdf')" style="background: #00a8ff; border: none; color: #fff; padding: 12px; border-radius: 8px; font-size: 1.2rem; width: 48px; padding: 0; display:flex; justify-content:center; align-items:center;" title="Cetak PDF">📄</button>
                <button class="btn" onclick="ngitungProcessCheckout('bluetooth')" style="background: var(--garneta-cyan); color: #000; border: none; padding: 12px; border-radius: 8px; font-size: 1.2rem; width: 48px; padding: 0; display:flex; justify-content:center; align-items:center;" title="Bluetooth">🖨️</button>
                <button class="btn" onclick="ngitungProcessCheckout('wa')" style="background: #25D366; border: none; color: #fff; padding: 12px; border-radius: 8px; font-size: 1.2rem; width: 48px; padding: 0; display:flex; justify-content:center; align-items:center;" title="Kirim WA">💬</button>
              </div>
            </div>
            
          </div>
        ;
      }
  
      '''
    html = html[:start_idx] + replacement + html[end_idx:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("HTML injected!")
