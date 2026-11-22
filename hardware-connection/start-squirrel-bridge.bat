@echo off
title Mochi squirrel bridge
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows-bridge.ps1" %*
pause
