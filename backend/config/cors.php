<?php

return [
    'paths' => ['api/*'],

    /*
    | Allowed origins. In production set CORS_ALLOWED_ORIGINS to the
    | exact frontend domain (e.g. https://helpdex.example.com).
    | '*' is only acceptable while the app is internal/trusted-network only.
    */
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')),

    'allowed_origins_patterns' => [],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

    'allowed_headers' => ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,
];
