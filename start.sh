#!/bin/sh

# Jalankan migrasi database
node migrate.js

# Jalankan script tambahan jika ada
if [ -f "scripts/add-base-price-ecer.js" ]; then
  node scripts/add-base-price-ecer.js
fi

# Jalankan Cron Job di background
node scripts/run-cron.js &

# Jalankan Server Utama di foreground
node server.js
