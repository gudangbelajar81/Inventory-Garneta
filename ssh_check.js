const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('mysql -u inventory_user -p"KasirAman123!" inventory_db -e "SELECT count(*) FROM products;"', (err, stream) => {
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
