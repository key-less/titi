<?php

use App\Application\Tickets\ListMyTickets;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Refresco de caché HELPDEX (unificado en config/helpdex_cache.php).
| Limpia caché de AutoTask (tickets, resources map) y Datto RMM (sites, devices).
| En Windows/OneDrive si falla por permisos: en .env usa CACHE_STORE=array (no persiste, sin disco).
*/
Artisan::command('helpdex:refresh-cache', function () {
    try {
        Cache::flush();
        $this->info('Caché HELPDEX limpiada (AutoTask + Datto RMM). La próxima petición traerá datos frescos.');
    } catch (\Throwable $e) {
        $this->error('No se pudo limpiar la caché: ' . $e->getMessage());
        $this->line('Si usas Windows/OneDrive y hay problemas de permisos, añade en .env: CACHE_STORE=array');
        return 1;
    }
    return 0;
})->purpose('Limpia la caché unificada HELPDEX (tickets, parches, dispositivos, resources)');

/*
| Sincroniza enlaces ticket ↔ resource en la tabla ticket_assignments (PostgreSQL).
| Requiere migraciones ejecutadas. Usa los tickets abiertos + últimos del mes.
*/
Artisan::command('helpdex:sync-ticket-assignments', function () {
    if (!Schema::hasTable('ticket_assignments')) {
        $this->warn('La tabla ticket_assignments no existe. Ejecuta: php artisan migrate');
        return 1;
    }
    $listMyTickets = app(ListMyTickets::class);
    $open = $listMyTickets->execute(['openOnly' => true, 'limit' => 500]);
    $monthStart = now()->utc()->startOfMonth()->format('Y-m-d\TH:i:s.000');
    $resolved = $listMyTickets->execute(['status' => config('autotask.resolved_status_ids', [13]), 'limit' => 500, 'completedDateGte' => $monthStart]);
    $tickets = array_merge($open, $resolved);
    $seen = [];
    $inserted = 0;
    $now = now();
    foreach ($tickets as $t) {
        if ($t->assignedResourceId === null) {
            continue;
        }
        $key = $t->id . ':' . $t->assignedResourceId;
        if (isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;
        DB::table('ticket_assignments')->updateOrInsert(
            ['ticket_id' => $t->id, 'assigned_resource_autotask_id' => $t->assignedResourceId],
            ['synced_at' => $now, 'updated_at' => $now, 'created_at' => $now]
        );
        $inserted++;
    }
    $this->info("Sincronizados {$inserted} enlaces ticket ↔ resource.");
    return 0;
})->purpose('Sincroniza ticket_assignments desde AutoTask (tickets abiertos + resueltos del mes)');

Schedule::command('helpdex:refresh-cache')->everyFiveMinutes();
