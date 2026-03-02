<?php

namespace App\Infrastructure\AutoTask;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cliente HTTP para la API REST de AutoTask (Datto).
 * Documentación: https://www.autotask.net/help/developerhelp/Content/APIs/REST/REST_API_Home.htm
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
     * @param array<string, mixed> $filter Ej. [ ["op": "eq", "field": "id", "value": "123"] ]
     */
    public function query(string $entity, array $filter = [], int $maxRecords = 500): array
    {
        $url = $this->baseUrl . '/' . $entity . '/query';
        $body = [
            'filter' => $filter,
            'maxRecords' => $maxRecords,
        ];

        try {
            $response = $this->request('POST', $url, $body);
        } catch (\Throwable $e) {
            Log::warning('AutoTask API request failed', ['entity' => $entity, 'error' => $e->getMessage()]);
            throw new \RuntimeException(
                'Error de conexión con AutoTask (SSL o red). Si ves "SSL certificate", añade en .env: AUTOTASK_VERIFY_SSL=false',
                0,
                $e
            );
        }

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
                throw new \RuntimeException(
                    'AutoTask: credenciales rechazadas (401). Revisa en .env: AUTOTASK_USERNAME, AUTOTASK_SECRET, AUTOTASK_INTEGRATION_CODE y que la API esté habilitada para tu cuenta.'
                );
            }
            if ($status === 404) {
                throw new \RuntimeException(
                    'AutoTask: recurso no encontrado (404). Revisa AUTOTASK_ZONE_URL: debe ser la URL de tu zona (ej. https://webservices14.autotask.net/atservicesrest). Comprueba el número de zona en la URL de tu AutoTask en el navegador.'
                );
            }
            throw new \RuntimeException($msg ?: 'AutoTask API error: ' . $status);
        }

        if (!is_array($data)) {
            return [];
        }
        // La API puede devolver "items" o "Items"
        $items = $data['items'] ?? $data['Items'] ?? [];
        return is_array($items) ? $items : [];
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
     * Obtiene la URL de zona para el usuario (no requiere auth).
     * Útil si no se conoce la zona: GET https://webservices.autotask.net/atservicesrest/v1.0/zoneInformation
     */
    public static function getZoneUrl(string $username): ?string
    {
        $response = Http::withHeaders([
            'UserName' => $username,
            'Content-Type' => 'application/json',
        ])->get('https://webservices.autotask.net/atservicesrest/v1.0/zoneInformation');

        if (!$response->successful()) {
            return null;
        }
        $data = $response->json();
        return $data['url'] ?? null;
    }

    private function request(string $method, string $url, array $body = []): \Illuminate\Http\Client\Response
    {
        $headers = [
            'UserName' => $this->username,
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
