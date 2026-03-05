<?php

/*
| AutoTask (Datto) REST API — Configuración.
| Autenticación y requisitos: https://www.autotask.net/help/developerhelp/Content/APIs/REST/General_Topics/REST_Security_Auth.htm
| Solo recursos con nivel "API User (API-only)" y Tracking identifier (Security tab) pueden usar la API.
*/

$zoneUrl = rtrim((string) env('AUTOTASK_ZONE_URL', 'https://webservices3.autotask.net'));
$webUrl = env('AUTOTASK_WEB_URL');
if (!is_string($webUrl) || trim($webUrl) === '') {
    // Derivar de zone_url: https://webservices3.autotask.net -> https://ww3.autotask.net
    $webUrl = preg_match('/webservices(\d+)/i', $zoneUrl, $m) ? 'https://ww' . $m[1] . '.autotask.net' : 'https://ww3.autotask.net';
}
$webUrl = rtrim($webUrl, '/');

return [
    'zone_url' => $zoneUrl,
    'web_url' => $webUrl,
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
        1 => 'Normal',
        2 => 'Media',
        3 => 'Alta',
        4 => 'Critica',
    ],

    /*
    | Tickets abiertos = estado NO cerrado. Solo se excluyen por nombre o por ID.
    | closed_status_labels: se excluye por NOMBRE (independiente del ID en tu instancia).
    | closed_status_ids: IDs que en TU instancia son cerrados (según status_labels de arriba: 12, 13, 14).
    | No incluyas IDs de estados abiertos (p. ej. 6 = In Progress, 2 = Waiting Approval en este mapeo).
    */
    'closed_status_labels' => ['Complete', 'Work Complete', 'RMM Resolved'],
    'closed_status_ids' => [12, 13, 14],

    /*
    | IDs de estado para contar como "resueltos" en el Dashboard (Resueltos Hoy/Semana/Mes).
    | Solo tickets en estado Complete (13) cuentan como resueltos. Ajusta si tu flujo usa otros.
    */
    'resolved_status_ids' => [13],

    /*
    | IDs de estado para "tickets abiertos" en la query a la API (Dashboard / open_only=1).
    | In Progress (6), New (1), Waiting Customer (9), Waiting Vendor (10), On Hold (11).
    | Ref: https://www.autotask.net/help/developerhelp/Content/APIs/REST/API_Calls/REST_Advanced_Query_Features.htm
    */
    'open_status_ids' => [1, 6, 9, 10, 11],

    /*
    | Filtrar tickets por colas (Level I Support, Level II, etc.). Si está vacío, se muestran todos.
    | Obtén los IDs en AutoTask: Admin > Service Desk > Queues (o similar). Ej: AUTOTASK_QUEUE_IDS=123,456,789
    */
    'queue_ids' => array_values(array_filter(array_map('intval', explode(',', (string) env('AUTOTASK_QUEUE_IDS', ''))))),

    /*
    | Nombres de cola para mostrar en la UI. Clave = queue ID de tu AutoTask, valor = etiqueta.
    | Ajusta los IDs para que coincidan con los de AUTOTASK_QUEUE_IDS y los nombres de tus colas.
    */
    'queue_labels' => [29682833 => 'Level I Support', 29682969 => 'Level II Support', 29683485=> 'Level III Support', 8=> 'Monitoring Alerts',
        // Ejemplo (reemplaza con tus IDs reales desde AutoTask
        // 123 => 'Level I Support',
        // 456 => 'Level II Support',
        // 789 => 'Level III Support
        // 101 => 'Monitoring Alerts',
    ],
];
