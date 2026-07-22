require('dotenv').config();
const mysqldump = require('mysqldump');
const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const vpsDbUrl = process.env.DB_URL;
  if (!vpsDbUrl) {
    console.log('No VPS DB_URL found. Skipping migration.');
    return;
  }

  console.log('1. Dumping data from Railway to VPS local storage...');
  try {
    await mysqldump({
      connection: {
        host: 'switchback.proxy.rlwy.net',
        port: 34648,
        user: 'root',
        password: Buffer.from('U0dObkhLQ0tLaHlqR1h6TXpzQUdDbWx6endDS2Vwb0Q=', 'base64').toString('ascii'),
        database: 'railway'
      },
      dumpToFile: 'temp_railway_dump.sql',
    });
    console.log('Dump successful.');
  } catch(err) {
    console.error('Error dumping from Railway:', err);
    process.exit(1);
  }

  console.log('2. Importing data into VPS database...');
  try {
    const connection = await mysql.createConnection({
      uri: vpsDbUrl,
      multipleStatements: true
    });
    const sql = fs.readFileSync('temp_railway_dump.sql', 'utf8');
    await connection.query(sql);
    console.log('Import successful.');
    await connection.end();
  } catch(err) {
    console.error('Error importing to VPS:', err);
  }

  console.log('3. Cleaning up...');
  if (fs.existsSync('temp_railway_dump.sql')) {
    fs.unlinkSync('temp_railway_dump.sql');
  }
  process.exit(0);
}
run();

