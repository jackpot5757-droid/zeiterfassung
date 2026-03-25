@echo off
title Zeiterfassung App

echo ============================================
echo   Zeiterfassung App wird gestartet...
echo ============================================
echo.

:: Backend starten (in neuem Fenster)
start "Backend - Server" cmd /k "cd /d C:\Users\Altin\App\backend && node server.js"

:: 2 Sekunden warten bis Backend bereit
timeout /t 2 /nobreak >nul

:: Frontend starten (in neuem Fenster)
start "Frontend - Vite" cmd /k "cd /d C:\Users\Altin\App\frontend && npm run dev"

:: Noch 3 Sekunden warten bis Vite bereit
timeout /t 3 /nobreak >nul

:: Browser oeffnen
start http://localhost:5173

echo.
echo Beide Server laufen!
echo Browser wurde geoeffnet: http://localhost:5173
echo.
echo Zum Beenden: Beide schwarze Fenster schliessen.
pause
