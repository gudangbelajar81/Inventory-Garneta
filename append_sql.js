const fs = require('fs');

const sql = fs.readFileSync('database/gaji_bon.sql', 'utf8');

const schemaPath = 'database/schema.sql';
let schema = fs.readFileSync(schemaPath, 'utf8');
if (!schema.includes('CREATE TABLE IF NOT EXISTS employees')) {
  schema += '\n\n' + sql;
  fs.writeFileSync(schemaPath, schema);
  console.log('Appended to schema.sql');
} else {
  console.log('Already in schema.sql');
}
