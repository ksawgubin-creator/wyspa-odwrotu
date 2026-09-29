@echo off
chcp 65001 >nul
title Wyspa Odwrotu - serwer lokalny
cd /d "%~dp0"
echo.
echo  === WYSPA ODWROTU ===
echo  Uruchamiam lokalny serwer na http://localhost:8080
echo  Zamknij to okno, aby zakonczyc serwer.
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8080/"
python -m http.server 8080
if errorlevel 1 (
  echo.
  echo  Nie udalo sie uruchomic serwera. Sprawdz, czy Python 3 jest zainstalowany ^(polecenie: python --version^)
  echo  albo czy port 8080 nie jest zajety.
  pause
)
