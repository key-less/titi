<?php

/*
| Datto RMM API — Configuración.
| Documentación: https://rmm.datto.com/help/en/Content/2SETUP/APIv2.htm
| OAuth 2.0: token con API Key (username) y API Secret Key (password). Client: public-client / public.
*/

return [
    'api_url' => rtrim((string) env('DATTO_RMM_API_URL', '')),
    'api_key' => env('DATTO_RMM_API_KEY', env('DATTO_RMM_CLIENT_ID', '')),
    'api_secret' => env('DATTO_RMM_API_SECRET', env('DATTO_RMM_CLIENT_SECRET', '')),
    'client_id' => env('DATTO_RMM_OAUTH_CLIENT_ID', 'public-client'),
    'client_secret' => env('DATTO_RMM_OAUTH_CLIENT_SECRET', 'public'),
    'cache_ttl' => (int) env('DATTO_RMM_CACHE_TTL', 300),

    /*
    | Verificación SSL al llamar a la API de Datto RMM. En Windows suele fallar (cURL 60: unable to get local issuer certificate).
    | Pon false solo en desarrollo si es necesario; en producción configura php.ini (curl.cainfo) con cacert.pem.
    */
    'verify_ssl' => filter_var(env('DATTO_RMM_VERIFY_SSL', true), FILTER_VALIDATE_BOOLEAN),

    /*
    | Categorías de patch según la API (enum patchStatus en Device.patchManagement).
    | NoPolicy, NoData, RebootRequired, InstallError, ApprovedPending, FullyPatched
    */
    'patch_status_labels' => [
        'InstallError' => 'Install Error',
        'NoCompliant' => 'No Compliant',
        'NoPolicy' => 'No Policy',
        'ApprovedPending' => 'Approved Pending',
        'NoData' => 'No Data',
        'RebootRequired' => 'Reboot Required',
        'FullyPatched' => 'Compliant',
    ],
];
