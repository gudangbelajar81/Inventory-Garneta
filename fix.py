import os

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix literal \n
html = html.replace('\\n        ;\\n      }', '')

# The broken string is currently:
#             </div>
#             
#           </div>\n        ;\n      }
# Let's replace the whole ending of ngitung()

old_end = '''              </div>
              
            </div>\\n        ;\\n      }'''
            
new_end = '''              </div>
              
            </div>
        ;
      }'''

html = html.replace(old_end, new_end)

# Alternative fallback if that failed:
html = html.replace('</div>\n        ;\n      }', '</div>\n        ;\n      }')
html = html.replace('</div>\\n        ;\\n      }', '</div>\n        ;\n      }')

# Make absolutely sure it has the backtick
if '</div>\\n        ;\\n      }' in html:
    print('Still found escaped string!')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
