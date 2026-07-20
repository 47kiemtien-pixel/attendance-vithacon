@echo off
setlocal

set "PM2=%APPDATA%\npm\pm2.cmd"
if not exist "%PM2%" exit /b 1

call "%PM2%" resurrect >nul 2>&1
exit /b %errorlevel%
