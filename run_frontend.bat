@echo off
title QSVM Medical Frontend (Vite :5173)
echo ====================================================
echo   QSVM Medical SaaS - Starting React Vite App
echo ====================================================

cd /d "%~dp0frontend"

echo Checking Node.js environment...
call node -v
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed or not in PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Checking npm environment...
call npm -v
if %errorlevel% neq 0 (
    echo [ERROR] npm is not found in PATH!
    pause
    exit /b 1
)

if not exist "node_modules\.bin\vite.cmd" (
    echo [1/2] Installing dependencies with npm install...
    call npm install
)

echo.
echo [2/2] Launching Vite server on http://localhost:5173 ...
call npm run dev -- --host
pause
