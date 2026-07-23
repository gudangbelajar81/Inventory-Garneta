const fs = require('fs');
const path = require('path');

const targetDirs = [
  'D:\\jadi\\SAAS\\inventory system',
  'D:\\JADI MASTER\\inventory system'
];

// Kata yang akan di-replace (urutkan dari yang terpanjang ke yang terpendek agar aman)
const replacements = [
  { regex: /GARNETA STORE/gi, replace: "GARNETA STORE" },
  { regex: /GARNETA STORE/gi, replace: "GARNETA STORE" },
  { regex: /GARNETA STORE/gi, replace: "GARNETA STORE" },
  { regex: /GARNETA STORE/gi, replace: "GARNETA STORE" },
  { regex: /\bGarneta\b(?! STORE)/gi, replace: "GARNETA STORE" }
];

function processDirectory(directory) {
  if (!fs.existsSync(directory)) {
    console.log(`Directory not found: ${directory}`);
    return;
  }
  
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    // Skip node_modules, .git, and binary/image files
    if (file === 'node_modules' || file === '.git' || file === 'package-lock.json') continue;
    if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.ico')) continue;
    
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile()) {
      try {
        const ext = path.extname(fullPath).toLowerCase();
        // Hanya proses file teks
        if (['.js', '.html', '.css', '.md', '.sql', '.json', '.env', '.bat', '.ps1'].includes(ext) || ext === '') {
          let content = fs.readFileSync(fullPath, 'utf8');
          let originalContent = content;
          let changed = false;
          
          for (const rule of replacements) {
            if (rule.regex.test(content)) {
              content = content.replace(rule.regex, rule.replace);
              changed = true;
            }
          }
          
          if (changed) {
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`Updated: ${fullPath}`);
          }
        }
      } catch (err) {
        console.error(`Error processing ${fullPath}: ${err.message}`);
      }
    }
  }
}

console.log("Memulai proses penggantian nama menjadi GARNETA STORE...");
for (const dir of targetDirs) {
  console.log(`\nMemproses direktori: ${dir}`);
  processDirectory(dir);
}
console.log("\nSelesai!");
