const { Client } = require('ssh2');
const conn = new Client();

const vpsNodeScript = `
require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const vpsDbUrl = process.env.DB_URL;
  if (!vpsDbUrl) { return; }
  const connection = await mysql.createConnection(vpsDbUrl);
  await connection.query(\`
    CREATE TABLE IF NOT EXISTS ngitung_sales (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      date DATETIME NOT NULL,
      customer_name VARCHAR(120) NULL,
      total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      status ENUM('Lunas', 'Hutang') NOT NULL DEFAULT 'Lunas',
      items JSON NULL,
      installments JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  \`);
  await connection.end();
  process.exit(0);
}
run();
`;

conn.on('ready', () => {
  const cmd = `
    cd /var/www/inventory
    cat << 'EOF' > /tmp/fix_schema.js
${vpsNodeScript}
EOF
    node /tmp/fix_schema.js
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    })
  });
}).connect({
  host: '76.13.16.24',
  port: 22,
  username: 'root',
  password: '@Alvezadigital81'
});
