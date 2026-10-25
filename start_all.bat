@echo off
title QSVM Medical - Full Stack Launcher
echo ====================================================
echo   QSVM Medical SaaS - Full Stack Launcher
echo ====================================================
echo.

echo [1/2] Starting Backend Server (FastAPI :8000)...
start "QSVM Medical - Backend" "%~dp0run_backend.bat"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Server (React Vite :5173)...
start "QSVM Medical - Frontend" "%~dp0run_frontend.bat"

echo.
echo ====================================================
echo   Both services are launching in separate windows!
echo   - Backend:  http://127.0.0.1:8000
echo   - Frontend: http://localhost:5173
echo ====================================================
echo.

timeout /t 3 /nobreak >nul
start http://localhost:5173
