<?php

namespace App\Infrastructure\DattoRmm;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cliente para la API Datto RMM v2.
 * OAuth 2.0: token con API Key + API Secret Key (password grant).
 * Doc: https://rmm.datto.com/help/en/Content/2SETUP/APIv2.htm
 */
final class DattoRmmApiClient
{
    private const TOKEN_CACHE_KEY = 'datto_rmm_access_token';
    private const TOKEN_EXPIRY_BUFFER = 3600; // renovar 1h antes de que venza (100h = 360000s)

    public function __construct(
        private string $baseUrl,
        private string $apiKey,
        private string $apiSecret,
        private string $clientId,
        private string $clientSecret,
        private bool $verifySsl = true
    ) {}

    /**
     * Obtiene un access token (cacheado hasta ~99h).
     */
    public function getAccessToken(): ?string
    {
        $cached = Cache::get(self::TOKEN_CACHE_KEY);
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $url = rtrim($this->baseUrl, '/') . '/auth/oauth/token';
        $response = Http::withOptions(['verify' => $this->verifySsl])
            ->withBasicAuth($this->clientId, $this->clientSecret)
            ->asForm()
            ->post($url, [
                'grant_type' => 'password',
                'username' => $this->apiKey,
                'password' => $this->apiSecret,
            ]);

        if (!$response->successful()) {
            Log::warning('Datto RMM token request failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return null;
        }

        $data = $response->json();
        $token = $data['access_token'] ?? null;
        $expiresIn = (int) ($data['expires_in'] ?? 360000);

        if ($token !== null && $token !== '') {
            Cache::put(self::TOKEN_CACHE_KEY, $token, $expiresIn - self::TOKEN_EXPIRY_BUFFER);
        }

        return $token;
    }

    /**
     * GET a un path de la API (base URL + /api).
     */
    public function get(string $path, array $query = []): ?array
    {
        $token = $this->getAccessToken();
        if ($token === null) {
            return null;
        }

        $url = rtrim($this->baseUrl, '/') . '/api' . (str_starts_with($path, '/') ? $path : '/' . $path);
        if ($query !== []) {
            $url .= '?' . http_build_query($query);
        }

        $response = Http::withOptions(['verify' => $this->verifySsl])
            ->withToken($token)
            ->get($url);

        if (!$response->successful()) {
            Log::warning('Datto RMM API request failed', ['url' => $url, 'status' => $response->status()]);
            return null;
        }

        return $response->json();
    }

    /**
     * Lista todos los sites (paginado).
     * GET /v2/account/sites — la API usa página base 0.
     */
    public function getSites(): array
    {
        $all = [];
        $page = 0;
        $max = 250;

        do {
            $data = $this->get('/v2/account/sites', ['page' => $page, 'max' => $max]);
            if ($data === null) {
                break;
            }
            $sites = $data['sites'] ?? [];
            $all = array_merge($all, $sites);
            $pageDetails = $data['pageDetails'] ?? [];
            $nextUrl = $pageDetails['nextPageUrl'] ?? null;
            if (empty($nextUrl) || count($sites) < $max) {
                break;
            }
            $page++;
        } while (true);

        return $all;
    }

    private const DEVICES_CACHE_TTL = 300; // 5 min
    private const DEVICES_CACHE_PREFIX = 'datto_rmm_devices_';

    /**
     * Lista dispositivos: de toda la cuenta o de un site. Cacheado 5 min para reducir lentitud.
     * GET /v2/account/devices o GET /v2/site/{siteUid}/devices — la API usa página base 0.
     */
    public function getDevices(?string $siteUid = null): array
    {
        $cacheKey = self::DEVICES_CACHE_PREFIX . ($siteUid ?? 'all');
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }

        $all = [];
        $page = 0;
        $max = 250;

        do {
            if ($siteUid !== null && $siteUid !== '') {
                $data = $this->get('/v2/site/' . $siteUid . '/devices', ['page' => $page, 'max' => $max]);
            } else {
                $data = $this->get('/v2/account/devices', ['page' => $page, 'max' => $max]);
            }
            if ($data === null) {
                break;
            }
            $devices = $data['devices'] ?? [];
            $all = array_merge($all, $devices);
            $pageDetails = $data['pageDetails'] ?? [];
            $nextUrl = $pageDetails['nextPageUrl'] ?? null;
            if (empty($nextUrl) || count($devices) < $max) {
                break;
            }
            $page++;
        } while (true);

        Cache::put($cacheKey, $all, self::DEVICES_CACHE_TTL);
        return $all;
    }

    /**
     * Un dispositivo por UID. GET /v2/device/{deviceUid}
     */
    public function getDevice(string $deviceUid): ?array
    {
        return $this->get('/v2/device/' . $deviceUid);
    }

    /**
     * Alertas de un dispositivo (abiertas o resueltas). Paginado.
     * GET /v2/device/{deviceUid}/alerts/open o /alerts/resolved
     */
    public function getDeviceAlerts(string $deviceUid, bool $open = true): array
    {
        $path = $open ? '/v2/device/' . $deviceUid . '/alerts/open' : '/v2/device/' . $deviceUid . '/alerts/resolved';
        $all = [];
        $page = 0;
        $max = 250;
        do {
            $data = $this->get($path, ['page' => $page, 'max' => $max]);
            if ($data === null) {
                break;
            }
            $alerts = $data['alerts'] ?? [];
            $all = array_merge($all, $alerts);
            $pageDetails = $data['pageDetails'] ?? [];
            $nextUrl = $pageDetails['nextPageUrl'] ?? null;
            if (empty($nextUrl) || count($alerts) < $max) {
                break;
            }
            $page++;
        } while (true);
        return $all;
    }

    /**
     * Filtros (grupos) de un site. GET /v2/site/{siteUid}/filters
     */
    public function getSiteFilters(string $siteUid): array
    {
        $all = [];
        $page = 0;
        $max = 250;
        do {
            $data = $this->get('/v2/site/' . $siteUid . '/filters', ['page' => $page, 'max' => $max]);
            if ($data === null) {
                break;
            }
            $filters = $data['filters'] ?? [];
            $all = array_merge($all, $filters);
            $pageDetails = $data['pageDetails'] ?? [];
            $nextUrl = $pageDetails['nextPageUrl'] ?? null;
            if (empty($nextUrl) || count($filters) < $max) {
                break;
            }
            $page++;
        } while (true);
        return $all;
    }

    /**
     * Audit de un dispositivo (hardware/software según deviceClass).
     * device -> GET /v2/audit/device/{deviceUid}
     * esxihost -> GET /v2/audit/esxihost/{deviceUid}
     * printer -> GET /v2/audit/printer/{deviceUid}
     */
    public function getDeviceAudit(string $deviceUid, string $deviceClass = 'device'): ?array
    {
        $path = match (strtolower($deviceClass)) {
            'esxihost' => '/v2/audit/esxihost/' . $deviceUid,
            'printer' => '/v2/audit/printer/' . $deviceUid,
            default => '/v2/audit/device/' . $deviceUid,
        };
        return $this->get($path);
    }

    /**
     * Software auditado de un device (deviceClass debe ser 'device'). Paginado.
     * GET /v2/audit/device/{deviceUid}/software
     */
    public function getDeviceAuditSoftware(string $deviceUid, int $maxItems = 100): array
    {
        $all = [];
        $page = 0;
        $max = 50;
        do {
            $data = $this->get('/v2/audit/device/' . $deviceUid . '/software', ['page' => $page, 'max' => $max]);
            if ($data === null) {
                break;
            }
            $software = $data['software'] ?? [];
            $all = array_merge($all, $software);
            if (count($all) >= $maxItems || count($software) < $max) {
                break;
            }
            $page++;
        } while (true);
        return array_slice($all, 0, $maxItems);
    }
}
