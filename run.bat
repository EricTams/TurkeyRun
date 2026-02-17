@echo off
setlocal

:: Port derived from project start date (2026-02-16): 50000 + 216 = 50216
:: Each project gets a unique port based on its birth date. No collisions.
set PORT=50216

echo.
echo  Turkey Runner - http://localhost:%PORT%
echo  Press Ctrl+C to stop.
echo.

start http://localhost:%PORT%
python -m http.server %PORT%
