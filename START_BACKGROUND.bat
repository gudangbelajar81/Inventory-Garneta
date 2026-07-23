@echo off
echo Memulai Mesin Database MySQL...
wmic process call create "C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --standalone"

echo Menjalankan Migrasi Database...
node migrate.js

echo Memulai Server Node.js secara Ghoib dengan PM2...
call pm2 start server.js --name "inventory"

echo Selesai! Server berjalan di http://localhost:3000
