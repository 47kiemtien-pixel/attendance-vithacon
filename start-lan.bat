@echo off
setlocal

echo Starting Attendance System for LAN access...

for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "$ip = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' -or $_.IPAddress -like '172.16.*' -or $_.IPAddress -like '172.17.*' -or $_.IPAddress -like '172.18.*' -or $_.IPAddress -like '172.19.*' -or $_.IPAddress -like '172.2?.*' -or $_.IPAddress -like '172.30.*' -or $_.IPAddress -like '172.31.*' } | Where-Object { $_.InterfaceAlias -notlike '*WSL*' } | Select-Object -First 1 -ExpandProperty IPAddress; if ($ip) { $ip } else { '127.0.0.1' }"`) do set LAN_IP=%%i

set ATTENDANCE_SERVER_PORT=5015
set ATTENDANCE_CLIENT_PORT=5183

set VITE_API_URL=http://%LAN_IP%:%ATTENDANCE_SERVER_PORT%/api

echo.
echo LAN IP: %LAN_IP%
echo API:    %VITE_API_URL%
echo App:    http://%LAN_IP%:%ATTENDANCE_CLIENT_PORT%
echo.
echo If another computer cannot open the app, allow Node.js in Windows Firewall.
echo.

echo Starting Server...
start "Attendance API" cmd /k "set ATTENDANCE_SERVER_PORT=%ATTENDANCE_SERVER_PORT%&& npm run server:start"

echo Starting Client...
start "Attendance Web LAN" cmd /k "cd client && set VITE_API_URL=%VITE_API_URL%&& npm run dev -- --host 0.0.0.0 --port %ATTENDANCE_CLIENT_PORT% --strictPort"

echo.
echo Open this address on another computer in the same network:
echo http://%LAN_IP%:%ATTENDANCE_CLIENT_PORT%

endlocal
