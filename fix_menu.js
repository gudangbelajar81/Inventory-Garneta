const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// Inject gaji into superAdminMenus
if (!code.includes('["gaji"')) {
  code = code.replace(/\["users", ".*? Users"\], \["settings", ".*? Setting"\]/, '["users", "👥 Users"], ["gaji", "💸 Gaji & Bon"], ["settings", "⚙️ Setting"]');
}
fs.writeFileSync('index.html', code);
console.log('Fixed superAdminMenus');
