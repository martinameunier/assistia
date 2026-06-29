@echo off
set FILE_TO_SIGN=%~1

C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe ^
  -NoProfile ^
  -ExecutionPolicy Bypass ^
  -File "%~dp0sign-windows.ps1" ^
  "%FILE_TO_SIGN%"

exit /b %ERRORLEVEL%