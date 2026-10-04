@echo off
title CareConnect Server
echo ========================================================
echo   Starting CareConnect Full-Stack Web Application...
echo   Open your browser at: http://localhost:8080/
echo ========================================================
powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0server.ps1" -Port 8080
pause
