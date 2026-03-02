<?php

use App\Http\Controllers\Api\AiAssistantController;
use App\Http\Controllers\Api\TicketController;
use App\Infrastructure\AutoTask\AutoTaskApiClient;
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
            return response()->json([
                'backend' => 'ok',
                'autotask_configured' => $hasUser && $hasSecret && $hasCode,
                'autotask_zone' => $zone,
                'verify_ssl' => $verifySsl,
                'my_resource_id' => null,
                'credentials_check' => $credentials_check,
                'hint' => !$hasUser || !$hasSecret || !$hasCode
                    ? 'Completa AUTOTASK_USERNAME, AUTOTASK_SECRET, AUTOTASK_INTEGRATION_CODE en .env (sin espacios al pegar).'
                    : ($verifySsl ? 'Si falla SSL, añade AUTOTASK_VERIFY_SSL=false en .env' : 'Si sigue 401: revisa en AutoTask que el usuario sea API-only, el Secret sea correcto y el Integration Code coincida con la pestaña Security del recurso.'),
            ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            return response()->json([
                'backend' => 'ok',
                'error' => $e->getMessage(),
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
    try {
        $client = app(AutoTaskApiClient::class);
        $items = $client->query('Resources', [], 200);
        $list = [];
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
        return response()->json(['resources' => [], 'error' => $e->getMessage()], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
    }
});

Route::prefix('ai')->group(function () {
    Route::post('/chat', [AiAssistantController::class, 'chat']);
});
