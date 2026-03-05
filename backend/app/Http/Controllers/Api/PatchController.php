<?php

namespace App\Http\Controllers\Api;

use App\Infrastructure\DattoRmm\DattoRmmApiClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Estado de parches desde Datto RMM.
 * Categorías: Install Error, No Compliant, No Policy, Approved Pending, No Data, Reboot Required, Compliant.
 * Doc: https://rmm.datto.com/help/en/Content/2SETUP/APIv2.htm
 */
class PatchController
{
    private static function cacheKeySites(): string
    {
        return config('helpdex_cache.keys.datto_sites', 'helpdex_datto_rmm_sites');
    }

    private static function cacheKeyDevices(string $siteUid = ''): string
    {
        return config('helpdex_cache.keys.datto_devices', 'helpdex_datto_rmm_devices') . ($siteUid ?: '_all');
    }

    private static function cacheTtl(): int
    {
        return (int) config('helpdex_cache.ttl.datto', 300);
    }

    /** Labels para cada patchStatus de la API */
    private const STATUS_LABELS = [
        'InstallError' => 'Install Error',
        'NoPolicy' => 'No Policy',
        'NoData' => 'No Data',
        'RebootRequired' => 'Reboot Required',
        'ApprovedPending' => 'Approved Pending',
        'FullyPatched' => 'Compliant',
    ];

    /**
     * GET /api/patches/sites — lista de sites (organizaciones) para filtrar.
     */
    public function sites(DattoRmmApiClient $client): JsonResponse
    {
        if (!$this->configured()) {
            return response()->json([
                'sites' => [],
                'message' => 'Datto RMM no configurado.',
                'hint' => 'Configura DATTO_RMM_API_URL, DATTO_RMM_API_KEY y DATTO_RMM_API_SECRET en .env.',
                'source' => 'datto',
            ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
        }

        $sites = Cache::remember(self::cacheKeySites(), self::cacheTtl(), function () use ($client) {
            $list = $client->getSites();
            return array_map(function ($s) {
                return [
                    'uid' => $s['uid'] ?? '',
                    'id' => $s['id'] ?? null,
                    'name' => $s['name'] ?? 'Sin nombre',
                    'devicesStatus' => $s['devicesStatus'] ?? null,
                ];
            }, $list);
        });

        return response()->json([
            'sites' => $sites,
        ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
    }

    /**
     * GET /api/patches — dispositivos con estado de parches. Query: site_uid (opcional).
     */
    public function index(Request $request, DattoRmmApiClient $client): JsonResponse
    {
        $siteUid = $request->query('site_uid');
        $cacheKey = self::cacheKeyDevices($siteUid ?: '');

        if (!$this->configured()) {
            return response()->json([
                'devices' => [],
                'summary' => $this->emptySummary(),
                'lastUpdated' => null,
                'configured' => false,
                'message' => 'Datto RMM no configurado.',
                'hint' => 'Configura DATTO_RMM_API_URL, DATTO_RMM_API_KEY y DATTO_RMM_API_SECRET en .env.',
                'source' => 'datto',
            ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
        }

        $result = Cache::remember($cacheKey, self::cacheTtl(), function () use ($client, $siteUid) {
            $sites = $client->getSites();
            $siteNames = [];
            foreach ($sites as $s) {
                $uid = $s['uid'] ?? null;
                if ($uid !== null) {
                    $siteNames[$uid] = $s['name'] ?? 'Sin nombre';
                }
            }
            $devices = $client->getDevices($siteUid ?: null);
            $mapped = $this->mapDevicesAndSummary($devices, $siteNames);
            $mapped['patches'] = $this->legacyPatchesArray($mapped['devices']);
            return $mapped;
        });

        $result['lastUpdated'] = now()->toIso8601String();
        $result['configured'] = true;
        $result['message'] = null;

        return response()->json($result, 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
    }

    /** Array legacy para Dashboard: Workstations y Servers con compliant/pending/critical %. */
    private function legacyPatchesArray(array $devices): array
    {
        $workstations = [];
        $servers = [];
        foreach ($devices as $d) {
            $class = $d['deviceClass'] ?? 'device';
            $status = $d['patchStatus'] ?? null;
            if ($class === 'esxihost') {
                $servers[] = $status;
            } else {
                $workstations[] = $status;
            }
        }
        $toPercent = function (array $list) {
            $total = count($list);
            if ($total === 0) return ['compliant' => 0, 'pending' => 0, 'critical' => 0];
            $compliant = count(array_filter($list, fn($s) => $s === 'FullyPatched'));
            $critical = count(array_filter($list, fn($s) => in_array($s, ['InstallError', 'RebootRequired'], true)));
            $pending = $total - $compliant - $critical;
            return [
                'compliant' => (int) round(100 * $compliant / $total),
                'pending' => (int) round(100 * $pending / $total),
                'critical' => (int) round(100 * $critical / $total),
            ];
        };
        $ws = $toPercent($workstations);
        $sv = $toPercent($servers);
        return [
            ['name' => 'Workstations', 'compliant' => $ws['compliant'], 'pending' => $ws['pending'], 'critical' => $ws['critical']],
            ['name' => 'Servers', 'compliant' => $sv['compliant'], 'pending' => $sv['pending'], 'critical' => $sv['critical']],
        ];
    }

    private function configured(): bool
    {
        return !empty(config('datto_rmm.api_url'))
            && !empty(config('datto_rmm.api_key'))
            && !empty(config('datto_rmm.api_secret'));
    }

    private function emptySummary(): array
    {
        $summary = [];
        foreach (array_keys(self::STATUS_LABELS) as $status) {
            $summary[$status] = 0;
        }
        return $summary;
    }

    private function mapDevicesAndSummary(array $devices, array $siteNames = []): array
    {
        $summary = $this->emptySummary();
        $list = [];

        foreach ($devices as $d) {
            $pm = $d['patchManagement'] ?? null;
            $status = $pm['patchStatus'] ?? null;
            if ($status !== null && isset($summary[$status])) {
                $summary[$status]++;
            } elseif ($status !== null) {
                $summary[$status] = ($summary[$status] ?? 0) + 1;
            }

            $siteUid = $d['siteUid'] ?? null;
            $siteName = $d['siteName'] ?? ($siteNames[$siteUid] ?? '');

            $list[] = [
                'uid' => $d['uid'] ?? null,
                'id' => $d['id'] ?? null,
                'hostname' => $d['hostname'] ?? '',
                'siteUid' => $siteUid,
                'siteName' => $siteName,
                'deviceClass' => $d['deviceClass'] ?? null,
                'operatingSystem' => $d['operatingSystem'] ?? '',
                'online' => $d['online'] ?? false,
                'lastSeen' => $d['lastSeen'] ?? null,
                'patchStatus' => $status,
                'patchStatusLabel' => self::STATUS_LABELS[$status] ?? $status,
                'patchesApprovedPending' => $pm['patchesApprovedPending'] ?? null,
                'patchesNotApproved' => $pm['patchesNotApproved'] ?? null,
                'patchesInstalled' => $pm['patchesInstalled'] ?? null,
            ];
        }

        return [
            'devices' => $list,
            'summary' => $summary,
            'summaryLabels' => self::STATUS_LABELS,
        ];
    }
}
