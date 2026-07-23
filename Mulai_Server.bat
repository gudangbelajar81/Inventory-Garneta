@echo off
title Server Kasir Lokal
cd /d "D:\jadi\saas\inventory system"
echo ==========================================
echo MESIN SERVER KASIR SEDANG BERJALAN
echo ==========================================
echo.
echo JANGAN DITUTUP JENDELA HITAM INI!
echo Jika ditutup, aplikasi akan mati (Connection Refused).
echo Silakan minimize (kecilkan) jendela ini.
echo.
node server.js
pause
