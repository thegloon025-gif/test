@echo off
cd /d "%~dp0"
node export-benchmark.mjs
if errorlevel 1 echo ERROR: could not create the benchmark export.
echo.
echo Upload the resulting CommanderOracle-benchmark-cards.json.gz file to ChatGPT.
pause
