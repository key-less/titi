@echo off
echo Iniciando backend HELPDEX en http://127.0.0.1:8000
echo.
echo Abre otra terminal y en frontend ejecuta: npm run dev
echo Luego en el navegador: http://localhost:5173
echo.
php artisan serve --host=127.0.0.1
pause
