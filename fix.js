const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
code = code.split('["Sak", "Karton", "Dus", "Jligen", "Ball", "Pack", "Kotak"]').join('["-", "Sak", "Karton", "Dus", "Jligen", "Ball", "Pack", "Kotak"]');
code = code.split('["pcs", "kg", "gram", "renteng", "pack", "biji", "buah", "botol"]').join('["-", "pcs", "kg", "gram", "renteng", "pack", "biji", "buah", "botol"]');
fs.writeFileSync('index.html', code);
