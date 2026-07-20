const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/function productPayload\(item\) \{\s+return \{\s+supplierId: number\(item\.supplierId\),/g, 
`function productPayload(item) {
    return {
      supplierId: nullableNumber(item.supplierId),`);

fs.writeFileSync('server.js', code);
console.log('Fixed supplierId mapping to use nullableNumber');
