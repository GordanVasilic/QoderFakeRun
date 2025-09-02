@echo off
echo Checking for processes on port 3000...

REM Find and kill process using port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Killing process %%a on port 3000...
    taskkill /PID %%a /F >nul 2>&1
)

echo Port 3000 is now free. Starting development server...
npm run dev