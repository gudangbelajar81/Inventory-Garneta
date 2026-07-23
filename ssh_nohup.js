const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  console.log('Deploying background migration on VPS...');
  const cmd = `
    nohup bash -c 'mysqldump -h switchback.proxy.rlwy.net -P 34648 -u root -p"SGNnHKCKKhyjGXzMzsAGCmlzzwCKepoD" railway > /tmp/railway_full.sql && mysql -u inventory_user -p"KasirAman123!" inventory_db < /tmp/railway_full.sql && rm /tmp/railway_full.sql && echo "DONE" > /tmp/migration_status.txt' > /tmp/migration.log 2>&1 &
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => conn.end())
          .on('data', data => console.log('STDOUT: ' + data))
          .stderr.on('data', data => console.log('STDERR: ' + data));
  });
}).connect({
  host: '76.13.16.24',
  port: 22,
  username: 'root',
  password: '@Alvezadigital81'
});
