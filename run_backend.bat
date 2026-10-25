@echo off
title QSVM Medical Backend (FastAPI :8000)
echo ====================================================
echo   QSVM Medical SaaS - Starting FastAPI Backend
echo ====================================================

cd /d "%~dp0backend"

set "PYTHON_EXE="

if exist "C:\Users\manin\anaconda3\python.exe" set "PYTHON_EXE=C:\Users\manin\anaconda3\python.exe"
if "%PYTHON_EXE%"=="" if exist "%USERPROFILE%\anaconda3\python.exe" set "PYTHON_EXE=%USERPROFILE%\anaconda3\python.exe"

if "%PYTHON_EXE%"=="" (
    python --version >nul 2>nul
    if %errorlevel% equ 0 set "PYTHON_EXE=python"
)

if "%PYTHON_EXE%"=="" (
    py -3 --version >nul 2>nul
    if %errorlevel% equ 0 set "PYTHON_EXE=py -3"
)

if "%PYTHON_EXE%"=="" (
    echo [ERROR] Python 3 was not found!
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Using Python: %PYTHON_EXE%
"%PYTHON_EXE%" --version

echo Checking backend packages...
"%PYTHON_EXE%" -c "import fastapi, uvicorn, PIL" >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing backend dependencies...
    "%PYTHON_EXE%" -m pip install -r requirements.txt
)

echo Launching FastAPI server on http://127.0.0.1:8000 ...
"%PYTHON_EXE%" run_server.py
pause
