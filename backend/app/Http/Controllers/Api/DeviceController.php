<?php

namespace App\Http\Controllers\Api;

use App\Infrastructure\DattoRmm\DattoRmmApiClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Módulo Dispositivos — Sites, resumen por tipo (Workstation, Network, ESXi, etc.), grupos y detalle con link RMM.
 * Doc: https://rmm.datto.com/help/en/Content/2SETUP/APIv2.htm
 */
class DeviceController
{
    private const CACHE_KEY_SITES_SUMMARY = 'datto_rmm_devices_sites_summary_';
    private const CACHE_KEY_DEVICES_LIST = 'datto_rmm_devices_list_';
    private const CACHE_TTL = 300;

    private const DEVICE_CLASS_LABELS = [
        'device' => 'Workstation',
        'rmmnetworkdevice' => 'Network',
        'esxihost' => 'ESXi',
        'printer' => 'Printer',
        'unknown' => 'Unknown',
    ];

    private function configured(): bool
    {
        return !empty(config('datto_rmm.api_url'))
            && !empty(config('datto_rmm.api_key'))
            && !empty(config('datto_rmm.api_secret'));
    }

    /**
     * GET /api/devices/sites-summary — resumen por site: total, Workstation, Network, ESXi, Printer, grupos.
     * Query: site_uid (opcional, si se envía solo ese site).
     */
    public function sitesSummary(Request $request, DattoRmmApiClient $client): JsonResponse
    {
        if (!$this->configured()) {
            return response()->json([
                'sites' => [],
                'configured' => false,
                'message' => 'Configurar DATTO_RMM_API_URL, DATTO_RMM_API_KEY y DATTO_RMM_API_SECRET en .env.',
            ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
        }

        $siteUid = $request->query('site_uid');
        $cacheKey = self::CACHE_KEY_SITES_SUMMARY . ($siteUid ?: 'all');

        $result = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($client, $siteUid) {
            $sites = $client->getSites();
            $list = [];
            foreach ($sites as $site) {
                $uid = $site['uid'] ?? null;
                if ($uid === null) {
                    continue;
                }
                if ($siteUid !== null && $siteUid !== '' && $uid !== $siteUid) {
                    continue;
                }
                $devices = $client->getDevices($uid);
                $filters = $client->getSiteFilters($uid);
                $summary = $this->summarizeDevicesByClass($devices);
                $list[] = [
                    'uid' => $uid,
                    'id' => $site['id'] ?? null,
                    'name' => $site['name'] ?? 'Sin nombre',
                    'total' => count($devices),
                    'workstation' => $summary['device'] ?? 0,
                    'network' => $summary['rmmnetworkdevice'] ?? 0,
                    'esxi' => $summary['esxihost'] ?? 0,
                    'printer' => $summary['printer'] ?? 0,
                    'unknown' => $summary['unknown'] ?? 0,
                    'groupsCount' => count($filters),
                    'groups' => array_map(fn ($f) => [
                        'id' => $f['id'] ?? null,
                        'name' => $f['name'] ?? '',
                        'type' => $f['type'] ?? null,
                    ], $filters),
                ];
            }
            return ['sites' => $list];
        });

        $result['configured'] = true;
        $result['message'] = null;
        return response()->json($result, 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
    }

    /**
     * GET /api/devices — lista de dispositivos. Query: site_uid (opcional).
     */
    public function index(Request $request, DattoRmmApiClient $client): JsonResponse
    {
        if (!$this->configured()) {
            return response()->json([
                'devices' => [],
                'configured' => false,
                'message' => 'Configurar DATTO_RMM_API_URL, DATTO_RMM_API_KEY y DATTO_RMM_API_SECRET en .env.',
            ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
        }

        $siteUid = $request->query('site_uid');
        $cacheKey = self::CACHE_KEY_DEVICES_LIST . ($siteUid ?: 'all');

        $out = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($client, $siteUid) {
            $sites = $client->getSites();
            $siteNames = [];
            foreach ($sites as $s) {
                $u = $s['uid'] ?? null;
                if ($u) {
                    $siteNames[$u] = $s['name'] ?? 'Sin nombre';
                }
            }
            $devices = $client->getDevices($siteUid ?: null);
            $list = [];
            foreach ($devices as $d) {
                $list[] = $this->mapDeviceListItem($d, $siteNames);
            }
            return ['devices' => $list];
        });

        $out['configured'] = true;
        $out['message'] = null;
        return response()->json($out, 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
    }

    /**
     * GET /api/devices/{deviceUid} — detalle de un dispositivo + resumen audit (hardware/software) y portalUrl.
     */
    public function show(string $deviceUid, DattoRmmApiClient $client): JsonResponse
    {
        if (!$this->configured()) {
            return response()->json([
                'device' => null,
                'configured' => false,
                'message' => 'Configurar DATTO_RMM en .env.',
            ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
        }

        $device = $client->getDevice($deviceUid);
        if ($device === null) {
            return response()->json([
                'device' => null,
                'configured' => true,
                'message' => 'Dispositivo no encontrado.',
            ], 404, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
        }

        $deviceClass = $device['deviceClass'] ?? 'device';
        $audit = $client->getDeviceAudit($deviceUid, $deviceClass);
        $auditSummary = $this->auditToSummary($audit, $deviceClass);

        $response = [
            'device' => [
                'uid' => $device['uid'] ?? null,
                'id' => $device['id'] ?? null,
                'hostname' => $device['hostname'] ?? '',
                'siteUid' => $device['siteUid'] ?? null,
                'siteName' => $device['siteName'] ?? '',
                'deviceClass' => $deviceClass,
                'deviceClassLabel' => self::DEVICE_CLASS_LABELS[$deviceClass] ?? $deviceClass,
                'operatingSystem' => $device['operatingSystem'] ?? '',
                'lastLoggedInUser' => $device['lastLoggedInUser'] ?? '',
                'intIpAddress' => $device['intIpAddress'] ?? '',
                'extIpAddress' => $device['extIpAddress'] ?? '',
                'online' => $device['online'] ?? false,
                'lastSeen' => $device['lastSeen'] ?? null,
                'lastReboot' => $device['lastReboot'] ?? null,
                'description' => $device['description'] ?? '',
                'domain' => $device['domain'] ?? '',
                'portalUrl' => $device['portalUrl'] ?? '',
                'patchManagement' => $device['patchManagement'] ?? null,
                'antivirus' => $device['antivirus'] ?? null,
            ],
            'auditSummary' => $auditSummary,
            'configured' => true,
            'message' => null,
        ];

        return response()->json($response, 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
    }

    /**
     * GET /api/devices/{deviceUid}/alerts — alertas abiertas del dispositivo.
     */
    public function alerts(string $deviceUid, Request $request, DattoRmmApiClient $client): JsonResponse
    {
        if (!$this->configured()) {
            return response()->json([
                'alerts' => [],
                'configured' => false,
            ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
        }

        $open = $request->query('open', 'true') !== 'false';
        $alerts = $client->getDeviceAlerts($deviceUid, $open);

        $list = array_map(function ($a) {
            return [
                'alertUid' => $a['alertUid'] ?? null,
                'priority' => $a['priority'] ?? null,
                'diagnostics' => $a['diagnostics'] ?? '',
                'timestamp' => $a['timestamp'] ?? null,
                'resolved' => $a['resolved'] ?? false,
                'alertContext' => $a['alertContext'] ?? null,
                'alertSourceInfo' => $a['alertSourceInfo'] ?? null,
            ];
        }, $alerts);

        return response()->json([
            'alerts' => $list,
            'configured' => true,
        ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
    }

    private function summarizeDevicesByClass(array $devices): array
    {
        $counts = ['device' => 0, 'rmmnetworkdevice' => 0, 'esxihost' => 0, 'printer' => 0, 'unknown' => 0];
        foreach ($devices as $d) {
            $class = $d['deviceClass'] ?? 'unknown';
            $counts[$class] = ($counts[$class] ?? 0) + 1;
        }
        return $counts;
    }

    private function mapDeviceListItem(array $d, array $siteNames): array
    {
        $siteUid = $d['siteUid'] ?? null;
        $siteName = $d['siteName'] ?? ($siteNames[$siteUid] ?? '');
        $class = $d['deviceClass'] ?? 'device';
        return [
            'uid' => $d['uid'] ?? null,
            'id' => $d['id'] ?? null,
            'hostname' => $d['hostname'] ?? '',
            'siteUid' => $siteUid,
            'siteName' => $siteName,
            'deviceClass' => $class,
            'deviceClassLabel' => self::DEVICE_CLASS_LABELS[$class] ?? $class,
            'operatingSystem' => $d['operatingSystem'] ?? '',
            'lastLoggedInUser' => $d['lastLoggedInUser'] ?? '',
            'intIpAddress' => $d['intIpAddress'] ?? '',
            'extIpAddress' => $d['extIpAddress'] ?? '',
            'online' => $d['online'] ?? false,
            'lastSeen' => $d['lastSeen'] ?? null,
            'portalUrl' => $d['portalUrl'] ?? '',
        ];
    }

    private function auditToSummary(?array $audit, string $deviceClass): array
    {
        if ($audit === null) {
            return ['hardware' => null, 'software' => null];
        }
        $out = ['hardware' => null, 'software' => null];
        if ($deviceClass === 'device' && isset($audit['systemInfo'])) {
            $si = $audit['systemInfo'];
            $out['hardware'] = [
                'manufacturer' => $si['manufacturer'] ?? '',
                'model' => $si['model'] ?? '',
                'totalPhysicalMemory' => $si['totalPhysicalMemory'] ?? null,
                'totalCpuCores' => $si['totalCpuCores'] ?? null,
                'username' => $si['username'] ?? '',
            ];
            if (!empty($audit['processors'])) {
                $out['hardware']['processors'] = array_map(fn ($p) => $p['name'] ?? '', array_slice($audit['processors'], 0, 4));
            }
            if (!empty($audit['logicalDisks'])) {
                $out['hardware']['disks'] = array_map(fn ($d) => [
                    'description' => $d['description'] ?? '',
                    'size' => $d['size'] ?? null,
                    'freespace' => $d['freespace'] ?? null,
                ], array_slice($audit['logicalDisks'], 0, 10));
            }
        }
        if ($deviceClass === 'esxihost' && isset($audit['systemInfo'])) {
            $si = $audit['systemInfo'];
            $out['hardware'] = [
                'manufacturer' => $si['manufacturer'] ?? '',
                'model' => $si['model'] ?? '',
                'name' => $si['name'] ?? '',
            ];
        }
        return $out;
    }
}
