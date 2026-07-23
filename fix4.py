import os
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

match = re.search(r'</div>\s*function kalkulator\(\) \{', html)
if match:
    html = re.sub(r'</div>\s*function kalkulator\(\) \{', '</div>\n          </div>\n        ;\n      }\n\n      function kalkulator() {', html)
    print("Fixed missing closures!")
else:
    print("Could not find the missing closure pattern.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
