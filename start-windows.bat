@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 22 or newer is required. Install from https://nodejs.org/
 pause
 exit /b 1
)
rem Refuse to open an old server still listening on the same localhost port.
node -e "fetch('http://127.0.0.1:4285/api/status',{signal:AbortSignal.timeout(1500)}).then(()=>process.exit(9)).catch(()=>process.exit(0))"
if errorlevel 9 (
 echo.
 echo ERROR: Port 4285 already has a CommanderOracle server running.
 echo Close the old CommanderOracle server command window and run this BAT again.
 echo Do not trust the browser tab until the header says v1.1.5.
 echo.
 pause
 exit /b 1
)
start "CommanderOracle v1.1.5 server" cmd /k "node server.mjs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4285"
