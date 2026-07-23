import os

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_str = '''<button class="btn" onclick="window.reprintRiwayat(, 'pdf')" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem;" title="Cetak PDF">📄</button>
               <button class="btn" onclick="window.reprintRiwayat(, 'wa')" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem;" title="Kirim WA">💬</button>'''

new_str = '''<button class="btn" onclick="window.reprintRiwayat(, 'pdf')" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem;" title="Cetak Ulang">🖨️</button>'''

html = html.replace(old_str, new_str)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("SUCCESS")
