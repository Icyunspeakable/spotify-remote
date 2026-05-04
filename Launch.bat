@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
    echo npm was not found. Install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo Install failed.
        pause
        exit /b 1
    )
)

call npm start
if errorlevel 1 pause
