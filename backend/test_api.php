<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Testing AutoTask...\n";
try {
    $client = app(\App\Infrastructure\AutoTask\AutoTaskApiClient::class);
    $result = $client->query('Tickets', [], 10);
    echo "AutoTask Tickets count: " . count($result) . "\n";
    if (count($result) > 0) {
        echo "First ticket ID: " . $result[0]['id'] . "\n";
    }
} catch (\Exception $e) {
    echo "AutoTask Exception: " . $e->getMessage() . "\n";
}

echo "Testing DattoRMM...\n";
try {
    $client = app(\App\Infrastructure\DattoRmm\DattoRmmApiClient::class);
    $result = $client->getSites();
    echo "DattoRMM Sites count: " . count($result) . "\n";
    if (count($result) > 0) {
        echo "First site UID: " . $result[0]['uid'] . "\n";
    }
} catch (\Exception $e) {
    echo "DattoRMM Exception: " . $e->getMessage() . "\n";
}
