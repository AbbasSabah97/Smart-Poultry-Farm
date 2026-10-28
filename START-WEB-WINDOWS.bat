@echo off
chcp 65001 >nul
cd /d "%~dp0"
where npm >nul 2>&1 || (echo Node.js 22 LTS is required. Visit https://nodejs.org & pause & exit /b 1)
if not exist node_modules (call npm install || (echo npm install failed & pause & exit /b 1))
start "" http://127.0.0.1:5173
call npm run dev
pause
