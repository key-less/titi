<?php

/*
|--------------------------------------------------------------------------
| HELPDEX — Claves y TTL de caché unificados
|--------------------------------------------------------------------------
| Todas las claves usan el prefijo para poder limpiar solo caché HELPDEX.
| CACHE_STORE en .env: file (por defecto), array (no persiste, útil en dev/Windows).
*/

return [
    'prefix' => 'helpdex_',

    'keys' => [
        'autotask_tickets' => 'helpdex_autotask_tickets_list',
        'resources_map' => 'helpdex_resources_map',
        'datto_sites' => 'helpdex_datto_rmm_sites',
        'datto_devices' => 'helpdex_datto_rmm_devices',
    ],

    'ttl' => [
        'autotask' => (int) env('AUTOTASK_CACHE_TTL', 60),
        'resources_map' => (int) env('AUTOTASK_CACHE_TTL', 60),
        'datto' => (int) env('DATTO_RMM_CACHE_TTL', 300),
    ],
];
