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
    | Mapeo IDs → nombre (obtenido de GET /Tickets/entityInformation/fields, campo 'status').
    | Estos IDs son específicos de esta instancia AutoTask — no usar valores genéricos.
    */
    'status_labels' => [
        1  => 'New',
        5  => 'Complete',
        7  => 'Waiting Customer',
        8  => 'In Progress',
        9  => 'Waiting Materials',
        10 => 'Dispatched',
        11 => 'Escalate',
        12 => 'Waiting Vendor',
        13 => 'Waiting Approval',
        15 => 'Change Order',
        16 => 'Work Complete',
        17 => 'On Hold',
        19 => 'Customer Note Added',
        20 => 'RMM Resolved',
    ],
    'priority_labels' => [
        1 => 'Alta',
        2 => 'Media',
        3 => 'Normal',
        4 => 'Critica',
    ],

    /*
    | Tickets abiertos = estado NO cerrado. Solo se excluyen por nombre o por ID.
    | closed_status_labels: se excluye por NOMBRE (independiente del ID en tu instancia).
    | closed_status_ids: IDs que en TU instancia son cerrados (según status_labels de arriba: 12, 13, 14).
    | No incluyas IDs de estados abiertos (p. ej. 6 = In Progress, 2 = Waiting Approval en este mapeo).
    */
    'closed_status_labels' => ['Complete', 'Work Complete', 'RMM Resolved'],
    'closed_status_ids' => [5, 16, 20],

    /*
    | IDs de estado para contar como "resueltos" en el Dashboard (Resueltos Hoy/Semana/Mes).
    | Complete (5) es el estado de resolución en esta instancia.
    */
    'resolved_status_ids' => [5],

    /*
    | IDs de estado para "tickets abiertos" en la query a la API.
    | Todos los estados NO cerrados (excluye Complete=5, Work Complete=16, RMM Resolved=20).
    */
    'open_status_ids' => [1, 7, 8, 9, 10, 11, 12, 13, 15, 17, 19],

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
