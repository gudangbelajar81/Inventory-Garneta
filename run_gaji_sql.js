const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();
const { databaseConfig } = require('./config/database');

async function run() {
  const config = databaseConfig();
  console.log('Connecting to DB:', config.host, config.database);
  
  const connection = await mysql.createConnection(config);
  
  const sql = fs.readFileSync('database/gaji_bon.sql', 'utf8');
  await connection.query(sql);
  
  console.log('gaji_bon.sql executed successfully.');
  
  const schemaPath = 'database/schema.sql';
  let schema = fs.readFileSync(schemaPath, 'utf8');
  if (!schema.includes('CREATE TABLE IF NOT EXISTS employees')) {
    schema += '\n\n' + sql;
    fs.writeFileSync(schemaPath, schema);
    console.log('Appended to schema.sql');
  }
  
  process.exit(0);
}

run().catch(console.error);
