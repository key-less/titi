<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Refresco de caché HELPDEX: limpia caché de AutoTask (tickets) y Datto RMM (token, sites, devices)
| para que los datos se carguen frescos. Ejecutar a mano: php artisan helpdex:refresh-cache
*/
Artisan::command('helpdex:refresh-cache', function () {
    Cache::flush();
    $this->info('Caché HELPDEX actualizada (AutoTask + Datto RMM). La próxima petición traerá datos frescos.');
})->purpose('Limpia la caché del proyecto (tickets, parches, dispositivos) para que los datos carguen más rápido');

Schedule::command('helpdex:refresh-cache')->everyFiveMinutes();
