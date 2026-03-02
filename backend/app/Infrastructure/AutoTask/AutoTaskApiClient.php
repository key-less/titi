<?php

namespace App\Infrastructure\AutoTask;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cliente HTTP para la API REST de AutoTask (Datto).
 *
 * Referencias oficiales:
 * - Seguridad y autenticación: https://www.autotask.net/help/developerhelp/Content/APIs/REST/General_Topics/REST_Security_Auth.htm
 * - Llamadas REST (sintaxis, paginación): https://www.autotask.net/help/developerhelp/Content/APIs/REST/API_Calls/REST_API_Calls.htm
 * - Entidades (Tickets, Companies, etc.): https://www.autotask.net/help/developerhelp/Content/APIs/REST/Entities/_EntitiesOverview.htm
 *
 * Headers requeridos (REST_Security_Auth): Username, Secret, APIIntegrationcode, Content-Type application/json.
 * Solo recursos con nivel "API User (API-only)" y Tracking identifier en la pestaña Security pueden usar la API.
 */
final class AutoTaskApiClient
{
    private string $baseUrl;
    private string $username;
    private string $secret;
    private string $integrationCode;

    public function __construct(
        string $zoneUrl,
        string $username,
        string $secret,
        string $integrationCode
    ) {
        // Acepta con o sin /atservicesrest: .../atservicesrest -> .../atservicesrest/v1.0; ...autotask.net -> .../atservicesrest/v1.0
        $base = rtrim($zoneUrl, '/');
        $this->baseUrl = str_ends_with(strtolower($base), 'atservicesrest')
            ? $base . '/v1.0'
            : $base . '/atservicesrest/v1.0';
        $this->username = $username;
        $this->secret = $secret;
        $this->integrationCode = $integrationCode;
    }

    /**
     * Ejecuta una query POST sobre una entidad (ej. Tickets, Companies, Contacts, Resources).
     * La API devuelve máximo 500 resultados por página; si hay nextPageUrl se siguen obteniendo páginas.
     *
     * @param array<string, mixed> $filter Ej. [ ["op": "eq", "field": "id", "value": "123"] ]
     * @see https://www.autotask.net/help/developerhelp/Content/APIs/REST/API_Calls/REST_API_Calls.htm (paginación: pageDetails, nextPageUrl)
     */
    public function query(string $entity, array $filter = [], int $maxRecords = 500): array
    {
        $url = $this->baseUrl . '/' . $entity . '/query';
        $body = [
            'filter' => $filter,
            'maxRecords' => min($maxRecords, 500),
        ];

        $allItems = [];

        try {
            $response = $this->request('POST', $url, $body);
            $data = $response->json();

            if (!$response->successful()) {
                $status = $response->status();
                Log::warning('AutoTask API query failed', [
                    'entity' => $entity,
                    'status' => $status,
                    'body' => $data,
                ]);
                $msg = $data['message'] ?? $data['error'] ?? null;
                if ($status === 401) {
                    $apiMessage = is_string($msg) ? $msg : (is_array($data) ? json_encode($data) : '');
                    $fullMsg = 'AutoTask: credenciales rechazadas (401). Verifica en .env: AUTOTASK_USERNAME, AUTOTASK_SECRET, AUTOTASK_INTEGRATION_CODE. '
                        . 'El usuario debe ser "API User (API-only)" con Tracking identifier en Security. ';
                    if ($apiMessage !== '') {
                        $fullMsg .= 'Respuesta API: ' . $apiMessage . '. ';
                    }
                    $fullMsg .= 'Ref: https://www.autotask.net/help/developerhelp/Content/APIs/REST/General_Topics/REST_Security_Auth.htm';
                    throw new \RuntimeException($fullMsg);
                }
                if ($status === 404) {
                    throw new \RuntimeException(
                        'AutoTask: recurso no encontrado (404). Revisa AUTOTASK_ZONE_URL: debe ser la URL de tu zona (ej. https://webservices14.autotask.net/atservicesrest). Usa GET /api/tickets/zone-info?username=TU_USER para obtenerla.'
                    );
                }
                throw new \RuntimeException($msg ?: 'AutoTask API error: ' . $status);
            }

            if (is_array($data)) {
                $items = $data['items'] ?? $data['Items'] ?? [];
                if (is_array($items)) {
                    $allItems = array_merge($allItems, $items);
                }
            }

            // Paginación (doc REST API Calls): usar nextPageUrl hasta que sea null
            $nextPageUrl = $data['pageDetails']['nextPageUrl'] ?? null;
            while ($nextPageUrl !== null && $nextPageUrl !== '') {
                $response = $this->request('GET', $nextPageUrl);
                $data = $response->json();
                if (!$response->successful() || !is_array($data)) {
                    break;
                }
                $items = $data['items'] ?? $data['Items'] ?? [];
                if (is_array($items)) {
                    $allItems = array_merge($allItems, $items);
                }
                $nextPageUrl = $data['pageDetails']['nextPageUrl'] ?? null;
            }
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::warning('AutoTask API request failed', ['entity' => $entity, 'error' => $e->getMessage()]);
            throw new \RuntimeException(
                'Error de conexión con AutoTask (SSL o red). Si ves "SSL certificate", añade en .env: AUTOTASK_VERIFY_SSL=false',
                0,
                $e
            );
        }

        return $allItems;
    }

    /**
     * GET por ID en una entidad.
     */
    public function get(string $entity, int|string $id): ?array
    {
        $url = $this->baseUrl . '/' . $entity . '/' . $id;
        $response = $this->request('GET', $url);
        if (!$response->successful()) {
            Log::debug('AutoTask API get failed', ['entity' => $entity, 'id' => $id, 'status' => $response->status()]);
            return null;
        }
        return $response->json();
    }

    /**
     * Obtiene la URL de zona para el usuario (solo requiere Username; no Secret ni Integration code).
     * Útil para configurar AUTOTASK_ZONE_URL correctamente.
     *
     * @see https://www.autotask.net/help/developerhelp/Content/APIs/REST/API_Calls/REST_ZoneInformation.htm
     */
    public static function getZoneUrl(string $username): ?string
    {
        $verifySsl = config('autotask.verify_ssl', true);
        $response = Http::withHeaders([
            'Username' => $username,
            'Content-Type' => 'application/json',
        ])
            ->withOptions(['verify' => $verifySsl])
            ->get('https://webservices.autotask.net/atservicesrest/v1.0/zoneInformation');

        if (!$response->successful()) {
            return null;
        }
        $data = $response->json();
        return $data['url'] ?? null;
    }

    private function request(string $method, string $url, array $body = []): \Illuminate\Http\Client\Response
    {
        // Documentación AutoTask: Username, Secret, APIIntegrationcode, Content-Type
        $headers = [
            'Username' => $this->username,
            'Secret' => $this->secret,
            'APIIntegrationcode' => $this->integrationCode,
            'Content-Type' => 'application/json',
        ];

        // En Windows PHP suele no tener CA bundle; desactivar verificación SSL solo para AutoTask.
        // En producción: configurar php.ini curl.cainfo con la ruta a cacert.pem (https://curl.se/ca/cacert.pem)
        $request = Http::withHeaders($headers)
            ->timeout(30)
            ->withOptions(['verify' => config('autotask.verify_ssl', true)]);

        if ($method === 'GET') {
            return $request->get($url);
        }

        return $request->post($url, $body);
    }
}
