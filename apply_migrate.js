const fs = require('fs');
let code = fs.readFileSync('migrate.js', 'utf8');

const titleCaseLogic = `
    // Format existing data to Title Case
    try {
      const [rows] = await connection.query('SELECT id, name, category FROM products');
      let updated = 0;
      for (let r of rows) {
        const titleCase = str => {
          if (!str) return str;
          return String(str).toLowerCase().replace(/\\b\\w/g, s => s.toUpperCase());
        };
        const newName = titleCase(r.name);
        const newCat = titleCase(r.category);
        if (newName !== r.name || newCat !== r.category) {
          await connection.query('UPDATE products SET name = ?, category = ? WHERE id = ?', [newName, newCat, r.id]);
          updated++;
        }
      }
      if (updated > 0) logger.info(\`Migrasi: \${updated} produk diperbarui format namanya ke Title Case\`);
    } catch (e) {
      logger.error('Migrasi Title Case gagal', { error: e.message });
    }
`;

if (!code.includes('Format existing data to Title Case')) {
  code = code.replace(/logger\.info\(\`Migrasi database sepenuhnya selesai:/, titleCaseLogic + '\n    logger.info(`Migrasi database sepenuhnya selesai:');
}

fs.writeFileSync('migrate.js', code);
console.log('migrate.js updated');
