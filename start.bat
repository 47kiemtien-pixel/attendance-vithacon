@echo off
echo Starting Attendance System...

echo Starting Server...
cd server
start cmd /k "npm start"
cd ..

echo Starting Client...
cd client
start cmd /k "npm run dev"
cd ..

echo Both server and client are starting in separate windows.
