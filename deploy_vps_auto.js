const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();

const SETUP_SCRIPT = `
#!/bin/bash
set -e

echo "=== 1. System Update & Dependencies ==="
apt-get update -y
apt-get install -y curl git nginx mysql-server

echo "=== 2. Install Node.js (v20) ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "=== 3. Install PM2 ==="
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

echo "=== 4. Setup MySQL Database & User ==="
mysql -e "CREATE DATABASE IF NOT EXISTS garneta_db;"
mysql -e "CREATE USER IF NOT EXISTS 'garneta_user'@'localhost' IDENTIFIED BY 'GarnetaSecurePassword2026!';"
mysql -e "GRANT ALL PRIVILEGES ON garneta_db.* TO 'garneta_user'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

echo "=== 5. Clone Repository & Setup Backend ==="
mkdir -p /var/www
cd /var/www
if [ -d "Inventory-Garneta" ]; then
    echo "Directory exists, pulling latest..."
    cd Inventory-Garneta
    git config --global --add safe.directory /var/www/Inventory-Garneta
    git checkout main || git checkout master || echo "Branch switch failed"
    git reset --hard HEAD
    git pull origin main || git pull origin master
else
    echo "Cloning repository..."
    git clone https://github.com/gudangbelajar81/Inventory-Garneta.git
    cd Inventory-Garneta
fi

echo "=== 6. Setup Environment & Install Dependencies ==="
npm install --production

# Buat .env untuk backend
cat << 'EOF' > .env
PORT=3000
DB_HOST=localhost
DB_USER=garneta_user
DB_PASS=GarnetaSecurePassword2026!
DB_NAME=garneta_db
JWT_SECRET=GarnetaSystemSuperSecretKey2026_VPS!
EOF

echo "=== 7. Start PM2 ==="
pm2 stop garneta-api || true
pm2 start server.js --name "garneta-api"
pm2 save
pm2 startup | tail -n 1 | bash || true

echo "=== 8. Setup Nginx Reverse Proxy for api.alvezadigital.com ==="
cat << 'EOF' > /etc/nginx/sites-available/api.alvezadigital.com
server {
    listen 80;
    server_name api.alvezadigital.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
        
        # CORS Headers - Let Node.js handle it, but just in case
        # add_header Access-Control-Allow-Origin *;
    }
}
EOF

ln -sf /etc/nginx/sites-available/api.alvezadigital.com /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "=== DEPLOYMENT COMPLETE ==="
`;

conn.on('ready', () => {
    console.log('SSH Connection Established! Executing VPS Deployment Script...');
    
    conn.exec('sudo bash -s', (err, stream) => {
        if (err) throw err;
        
        stream.on('close', (code, signal) => {
            console.log('VPS Deployment Script Finished. Exit Code:', code);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
        
        // Feed the script to bash -s
        stream.write(SETUP_SCRIPT);
        stream.end();
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '76.13.16.24',
    port: 22,
    username: 'root',
    password: '@Alvezadigital81.',
    readyTimeout: 30000
});
