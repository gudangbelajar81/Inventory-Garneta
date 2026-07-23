import os
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# I will use a literal backtick in python by specifying it using char code or just a normal string if powershell doesn't eat it.
# Actually I will use chr(96) to be 100% safe from PowerShell.
backtick = chr(96)

replacement = f'</div>\n          </div>\n        {backtick};\n      }}\n\n      function kalkulator() {{'

match = re.search(r'</div>\s*function kalkulator\(\) \{', html)
if match:
    html = re.sub(r'</div>\s*function kalkulator\(\) \{', replacement, html)
    print("Fixed missing closures!")
else:
    # Try finding it with the ; already there
    match2 = re.search(r'</div>\n          </div>\n        ;\n      \}\n\n      function kalkulator\(\) \{', html)
    if match2:
         html = re.sub(r'</div>\n          </div>\n        ;\n      \}\n\n      function kalkulator\(\) \{', replacement, html)
         print("Fixed missing backtick only!")
    else:
         print("Could not find the pattern!")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
