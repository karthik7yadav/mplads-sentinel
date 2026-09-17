@echo off
setlocal
title MPLADS Sentinel Launcher
echo ======================================================================
echo           MPLADS SENTINEL - FULL-STACK ENVIRONMENT LAUNCHER
echo ======================================================================
echo.
echo Launching authoritative FastAPI backend and Vite frontend...
echo.
call npm run dev:full
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Startup failed with exit code %ERRORLEVEL%.
    pause
)
