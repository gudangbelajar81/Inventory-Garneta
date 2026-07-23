const { Client } = require('ssh2');
const conn = new Client();

const vpsNodeScript = `
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
        password: 'SGNnHKCKKhyjGXzMzsAGCmlzzwCKepoD',
        database: 'railway'
      },
      dumpToFile: '/tmp/temp_railway_dump.sql',
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
    const sql = fs.readFileSync('/tmp/temp_railway_dump.sql', 'utf8');
    await connection.query(sql);
    console.log('Import successful.');
    await connection.end();
  } catch(err) {
    console.error('Error importing to VPS:', err);
  }

  console.log('3. Cleaning up...');
  if (fs.existsSync('/tmp/temp_railway_dump.sql')) {
    fs.unlinkSync('/tmp/temp_railway_dump.sql');
  }
  process.exit(0);
}
run();
`;

conn.on('ready', () => {
  console.log('SSH connection ready. Executing migration commands...');
  const cmd = `
    cd /var/www/inventory
    cat << 'EOF' > /var/www/inventory/migrate.js
${vpsNodeScript}
EOF
    node /var/www/inventory/migrate.js
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      process.stderr.write('STDERR: ' + data);
    });
  });
}).connect({
  host: '76.13.16.24',
  port: 22,
  username: 'root',
  password: '@Alvezadigital81'
});

