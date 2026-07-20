const fs = require('fs');
let sql = fs.readFileSync('database/schema.sql', 'utf8');
sql = sql.replace(/CREATE TABLE IF NOT EXISTS employees/g, 'CREATE TABLE employees');
sql = sql.replace(/CREATE TABLE IF NOT EXISTS cash_advances/g, 'CREATE TABLE cash_advances');
sql = sql.replace(/CREATE TABLE IF NOT EXISTS payrolls/g, 'CREATE TABLE payrolls');
fs.writeFileSync('database/schema.sql', sql);
console.log('Fixed schema.sql');
