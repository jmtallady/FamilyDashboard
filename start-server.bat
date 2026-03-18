@echo off
echo Starting Family Dashboard server...
echo.
echo Dashboard will be available at:
echo http://localhost:8000/family-dashboard.html
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
python -m http.server 8000
