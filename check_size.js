const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec("ls -la /var/www/inventory/index.html && wc -c /var/www/inventory/index.html && cat /var/www/inventory/server.js | grep -E 'gzip|compress|brotli'", (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', data => console.log(data.toString()))
          .stderr.on('data', data => console.error(data.toString()));
  });
}).connect({ host: '76.13.16.24', port: 22, username: 'root', password: '@Alvezadigital81' });
