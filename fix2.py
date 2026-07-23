import os

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix the missing closure for ngitung()
html = html.replace('            </div>\n    \n      function kalkulator() {', '            </div>\n        ;\n      }\n    \n      function kalkulator() {')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
