require('dotenv').config();
const mysql = require('mysql2/promise');

function toTitleCase(str) {
  if (!str) return str;
  return String(str).toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
}

async function run() {
  try {
    const conn = await mysql.createConnection(process.env.DB_URL);
    const [rows] = await conn.query('SELECT id, name, category FROM products');
    let count = 0;
    
    for (let row of rows) {
      const newName = toTitleCase(row.name);
      const newCategory = toTitleCase(row.category);
      if (newName !== row.name || newCategory !== row.category) {
        await conn.query('UPDATE products SET name = ?, category = ? WHERE id = ?', [newName, newCategory, row.id]);
        count++;
      }
    }
    
    console.log('Updated ' + count + ' products to Title Case.');
    await conn.end();
  } catch(e) {
    console.error(e);
  }
}

run();
