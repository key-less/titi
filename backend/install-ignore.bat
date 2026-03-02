@echo off
REM Instala dependencias aunque no tengas ext-fileinfo habilitada en PHP
set COMPOSER=
composer install --ignore-platform-req=ext-fileinfo
