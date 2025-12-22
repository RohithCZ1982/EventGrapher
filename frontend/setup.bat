@echo off
echo Setting up EventGrapher Frontend...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 14+ from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found!
echo.

REM Install dependencies
echo Installing dependencies...
call npm install

echo.
echo Frontend setup complete!
echo.
echo To run the frontend:
echo   npm run dev
echo.
pause

