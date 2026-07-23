@echo off
echo Mematikan Server Node.js...
call pm2 delete all

echo Mematikan Database MySQL...
taskkill /F /IM mysqld.exe

echo Semua mesin sudah dimatikan!
