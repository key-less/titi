<?php

use App\Http\Controllers\Api\AiAssistantController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\PatchController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\TicketController;
use App\Infrastructure\AutoTask\AutoTaskApiClient;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| HELPDEX API — Fase 1: Tickets (AutoTask) + IA
|--------------------------------------------------------------------------
*/

// Ruta simple: texto plano para comprobar que la API responde (evita problemas de JSON en navegador)
Route::get('/ping', function () {
    return response('HELPDEX API OK', 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
});

Route::prefix('tickets')->group(function () {
    // Debe ir antes que /{id} para que "status" no se interprete como id
    // Descubre la URL de zona para tu cuenta (solo necesita username). Útil si recibes 401 por zona incorrecta.
    Route::get('/zone-info', function () {
        $username = request()->query('username') ?? config('autotask.username');
        if (empty($username)) {
            return response()->json([
                'error' => 'Falta el usuario. Usa: GET /api/tickets/zone-info?username=tu_api_user@ejemplo.com',
                'hint' => 'El usuario debe ser un recurso con nivel "API User (API-only)" en AutoTask.',
            ], 400, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
        }
        $zoneUrl = AutoTaskApiClient::getZoneUrl($username);
        if ($zoneUrl === null) {
            return response()->json([
                'zone_url' => null,
                'ok' => false,
                'hint' => 'No se pudo obtener la zona. Verifica que el username sea correcto y que el recurso sea API User (API-only). Revisa también AUTOTASK_VERIFY_SSL si hay error SSL.',
            ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
        }
        return response()->json([
            'zone_url' => $zoneUrl,
            'ok' => true,
            'hint' => 'Copia esta URL en .env como AUTOTASK_ZONE_URL (con o sin /atservicesrest al final). Luego reinicia el backend.',
        ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
    });

    Route::get('/status', function () {
        try {
            $zone = config('autotask.zone_url');
            $username = config('autotask.username');
            $secret = config('autotask.secret');
            $code = config('autotask.integration_code');
            $hasUser = !empty($username);
            $hasSecret = !empty($secret);
            $hasCode = !empty($code);
            $verifySsl = config('autotask.verify_ssl');
            // Diagnóstico sin revelar valores: longitudes para verificar que .env se leyó bien
            $credentials_check = [
                'username_length' => $hasUser ? strlen($username) : 0,
                'secret_length' => $hasSecret ? strlen($secret) : 0,
                'integration_code_length' => $hasCode ? strlen($code) : 0,
            ];
            $webUrl = rtrim((string) config('autotask.web_url', 'https://ww3.autotask.net'), '/');
            $ticketDetailUrl = $webUrl . '/Autotask/AutotaskExtend/ExecuteCommand.aspx?Code=OpenTicketDetail&TicketID=';
            return response()->json([
                'backend' => 'ok',
                'autotask_configured' => $hasUser && $hasSecret && $hasCode,
                'autotask_zone' => $zone,
                'autotask_web_url' => $webUrl,
                'autotask_ticket_detail_url' => $ticketDetailUrl,
                'verify_ssl' => $verifySsl,
                'my_resource_id' => null,
                'credentials_check' => $credentials_check,
                'hint' => !$hasUser || !$hasSecret || !$hasCode
                    ? 'Completa AUTOTASK_USERNAME, AUTOTASK_SECRET, AUTOTASK_INTEGRATION_CODE en .env (sin espacios al pegar).'
                    : 'Si acabas de cambiar .env (incl. AUTOTASK_WEB_URL) ejecuta: php artisan config:clear y reinicia el servidor. Si el enlace "Ver en AutoTask" abre en otra zona (ej. ww3 en vez de ww14), hace falta config:clear. Si sigue 401: usuario API User (API-only), Tracking identifier = AUTOTASK_INTEGRATION_CODE.',
            ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            Log::error('Autotask status route error', ['msg' => $e->getMessage()]);
            return response()->json([
                'backend' => 'ok',
                'error' => 'Error al leer la configuración. Ejecuta php artisan config:clear.',
            ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
        }
    });
    Route::get('/status-ids', function () {
        $labels = config('autotask.status_labels', []);
        $closedIds = config('autotask.closed_status_ids', [2, 6, 12, 13, 14]);
        $closedLabelNames = config('autotask.closed_status_labels', ['Complete', 'Work Complete', 'RMM Resolved']);
        return response()->json([
            'status_labels' => $labels,
            'closed_status_ids' => $closedIds,
            'closed_status_labels' => $closedLabelNames,
            'hint' => 'Tickets abiertos excluye: 1) IDs en closed_status_ids, 2) nombres en closed_status_labels, 3) cualquier estado cuyo nombre contenga "complete" o "resolved".',
        ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
    });
    Route::get('/', [TicketController::class, 'index']);
    Route::get('/{id}', [TicketController::class, 'show']);
});

Route::get('/resources', function () {
    $list = [];
    try {
        $client = app(AutoTaskApiClient::class);
        $listMyTickets = app(\App\Application\Tickets\ListMyTickets::class);

        $filter = [['op' => 'eq', 'field' => 'isActive', 'value' => true]];
        $items = $client->query('Resources', $filter, 500);
        if (empty($items)) {
            $items = $client->query('Resources', [], 500);
        }
        if (empty($items)) {
            $statusIds = array_values(array_unique(array_merge(
                config('autotask.open_status_ids', [1, 6, 9, 10]),
                config('autotask.resolved_status_ids', [13])
            )));
            $tickets = $listMyTickets->execute(['limit' => 500, 'status' => $statusIds]);
            $ids = [];
            foreach ($tickets as $t) {
                if ($t->assignedResourceId && !isset($ids[$t->assignedResourceId])) {
                    $ids[$t->assignedResourceId] = true;
                }
            }
            $ids = array_keys($ids);
            if (!empty($ids)) {
                $items = $client->query('Resources', [['op' => 'in', 'field' => 'id', 'value' => array_map('strval', $ids)]], 500);
            }
        }

        foreach ($items as $item) {
            $id = (int) ($item['id'] ?? $item['ID'] ?? 0);
            if ($id === 0) {
                continue;
            }
            $first = trim($item['firstName'] ?? $item['FirstName'] ?? '');
            $last = trim($item['lastName'] ?? $item['LastName'] ?? '');
            $fullName = $first === '' && $last === '' ? ('Resource #' . $id) : trim($first . ' ' . $last);
            $initials = '';
            if ($first !== '') {
                $initials .= mb_substr($first, 0, 1);
            }
            if ($last !== '') {
                $initials .= mb_substr($last, 0, 1);
            }
            if ($initials === '') {
                $initials = (string) $id;
            }
            $list[] = ['id' => $id, 'fullName' => $fullName, 'initials' => strtoupper($initials)];
        }
        usort($list, fn ($a, $b) => strcasecmp($a['fullName'], $b['fullName']));
        return response()->json(['resources' => $list], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
    } catch (\Throwable $e) {
        Log::error('Resources route error', ['msg' => $e->getMessage()]);
        return response()->json(['resources' => [], 'error' => 'Error al obtener recursos de AutoTask.'], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
    }
});

Route::get('/patches/sites', [PatchController::class, 'sites']);
Route::get('/patches', [PatchController::class, 'index']);

Route::prefix('devices')->group(function () {
    Route::get('/sites-summary', [DeviceController::class, 'sitesSummary']);
    Route::get('/', [DeviceController::class, 'index']);
    Route::get('/{deviceUid}/alerts', [DeviceController::class, 'alerts']);
    Route::get('/{deviceUid}', [DeviceController::class, 'show']);
});

Route::get('/reports/summary', [ReportController::class, 'summary']);
Route::get('/dashboard/metrics', [DashboardController::class, 'metrics']);

Route::prefix('ai')->group(function () {
    Route::post('/chat', [AiAssistantController::class, 'chat']);
});
