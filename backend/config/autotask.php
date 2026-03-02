<?php

return [
    'zone_url' => rtrim((string) env('AUTOTASK_ZONE_URL', 'https://webservices3.autotask.net')),
    'username' => is_string($u = env('AUTOTASK_USERNAME')) ? trim($u) : '',
    'secret' => is_string($s = env('AUTOTASK_SECRET')) ? trim($s) : '',
    'integration_code' => is_string($c = env('AUTOTASK_INTEGRATION_CODE')) ? trim($c) : '',

    /*
    | Tiempo de caché en segundos para respuestas de la API (0 = sin caché).
    */
    'cache_ttl' => env('AUTOTASK_CACHE_TTL', 60),

    /*
    | Verificación SSL al llamar a la API de AutoTask. En Windows suele fallar por falta de CA bundle.
    | Pon false solo en desarrollo si ves "cURL error 60: unable to get local issuer certificate".
    | En producción configura php.ini (curl.cainfo) con cacert.pem.
    */
    'verify_ssl' => filter_var(env('AUTOTASK_VERIFY_SSL', false), FILTER_VALIDATE_BOOLEAN),

    /*
    | Mapeo IDs → nombre (según Task & Ticket Statuses en AutoTask, solo activos).
    | Orden típico en lista: si los IDs no coinciden, revisa GET /api/tickets y ajusta.
    */
    'status_labels' => [
        1 => 'New',
        2 => 'Waiting Approval',
        3 => 'Dispatched',
        4 => 'Change Order',
        5 => 'Customer Note Added',
        6 => 'In Progress',
        7 => 'Escalate',
        8 => 'Waiting Materials',
        9 => 'Waiting Customer',
        10 => 'Waiting Vendor',
        11 => 'On Hold',
        12 => 'Work Complete',
        13 => 'Complete',
        14 => 'RMM Resolved',
    ],
    'priority_labels' => [
        1 => 'Low',
        2 => 'Medium',
        3 => 'High',
        4 => 'Critical',
    ],

    /*
    | Tickets abiertos = estado NO cerrado. Solo se excluyen por nombre o por ID.
    | closed_status_labels: se excluye por NOMBRE (independiente del ID en tu instancia).
    | closed_status_ids: IDs que en TU instancia son cerrados (según status_labels de arriba: 12, 13, 14).
    | No incluyas IDs de estados abiertos (p. ej. 6 = In Progress, 2 = Waiting Approval en este mapeo).
    */
    'closed_status_labels' => ['Complete', 'Work Complete', 'RMM Resolved'],
    'closed_status_ids' => [12, 13, 14],
];
