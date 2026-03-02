@echo off
REM Quita COMPOSER para esta sesion y ejecuta composer install
set COMPOSER=
composer install
if errorlevel 1 (
  echo.
  echo Si el error es "ext-fileinfo missing", habilitalo en php.ini o ejecuta:
  echo   composer install --ignore-platform-req=ext-fileinfo
)
