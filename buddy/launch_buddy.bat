@echo off
title BUDDY AI LAUNCHER
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File ".\launch_buddy.ps1"
pause
