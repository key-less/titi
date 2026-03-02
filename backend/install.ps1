# Instalar dependencias sin que COMPOSER apunte a una carpeta.
# Ejecutar: .\install.ps1   o   powershell -ExecutionPolicy Bypass -File install.ps1
$env:COMPOSER = $null
composer install
