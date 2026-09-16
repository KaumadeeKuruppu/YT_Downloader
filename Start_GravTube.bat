@echo off
title GravTube Server Manager

echo Checking dependencies...
if not exist "backend\node_modules\" (
    echo Installing backend dependencies ^(this may take a minute^)...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules\" (
    echo Installing frontend dependencies ^(this may take a minute^)...
    cd frontend
    call npm install
    cd ..
)

echo.
echo Starting GravTube Backend Server...
start "GravTube Backend" cmd /k "cd backend && node server.js"

echo Starting GravTube Frontend Server...
start "GravTube Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Waiting a few seconds for the servers to start...
timeout /t 4 /nobreak > NUL

echo.
echo Opening GravTube in your default web browser...
start http://localhost:5173

echo.
echo Servers are running in the background windows. 
echo To stop the application, just close those command prompt windows.
echo You can now close this window safely.
pause
