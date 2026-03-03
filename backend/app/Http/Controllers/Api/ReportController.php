<?php

namespace App\Http\Controllers\Api;

use App\Application\Tickets\ListMyTickets;
use App\Infrastructure\DattoRmm\DattoRmmApiClient;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Reportes básicos: tickets por estado/periodo, dispositivos por site/tipo, parches por categoría.
 */
class ReportController
{
    private const PATCH_STATUS_LABELS = [
        'InstallError' => 'Install Error',
        'NoPolicy' => 'No Policy',
        'NoData' => 'No Data',
        'RebootRequired' => 'Reboot Required',
        'ApprovedPending' => 'Approved Pending',
        'FullyPatched' => 'Compliant',
    ];

    public function summary(Request $request, ListMyTickets $listMyTickets, DattoRmmApiClient $dattoClient): JsonResponse
    {
        $period = $request->input('period', '7d');
        $from = match ($period) {
            '24h' => Carbon::now()->utc()->subHours(24),
            '7d' => Carbon::now()->utc()->subDays(7),
            '6m' => Carbon::now()->utc()->subMonths(6),
            default => null,
        };

        $ticketsReport = ['byStatus' => [], 'total' => 0, 'period' => $period, 'error' => null];
        try {
            $filters = ['limit' => 1000];
            if ($from) {
                $filters['createDateGte'] = $from->format('Y-m-d\TH:i:s.000');
            }
            $tickets = $listMyTickets->execute($filters);
            $byStatus = [];
            foreach ($tickets as $t) {
                $status = $t->statusLabel() ?: ($t->status?->value ?? 'Unknown');
                $byStatus[$status] = ($byStatus[$status] ?? 0) + 1;
            }
            $ticketsReport['byStatus'] = $byStatus;
            $ticketsReport['total'] = count($tickets);
        } catch (\Throwable $e) {
            $ticketsReport['error'] = $e->getMessage();
        }

        $devicesReport = ['sites' => [], 'byType' => ['Workstation' => 0, 'Network' => 0, 'ESXi' => 0, 'Printer' => 0, 'Unknown' => 0], 'total' => 0, 'configured' => false];
        $patchesReport = ['byCategory' => [], 'total' => 0, 'configured' => false];

        if ($this->dattoConfigured()) {
            try {
                $sites = $dattoClient->getSites();
                $siteNames = [];
                foreach ($sites as $s) {
                    $uid = $s['uid'] ?? null;
                    if ($uid) {
                        $siteNames[$uid] = $s['name'] ?? 'Sin nombre';
                    }
                }
                $devices = $dattoClient->getDevices(null);
                $devicesReport['configured'] = true;
                $devicesReport['total'] = count($devices);

                $byType = ['Workstation' => 0, 'Network' => 0, 'ESXi' => 0, 'Printer' => 0, 'Unknown' => 0];
                $classMap = ['device' => 'Workstation', 'rmmnetworkdevice' => 'Network', 'esxihost' => 'ESXi', 'printer' => 'Printer'];
                $bySite = [];
                $patchSummary = array_fill_keys(array_keys(self::PATCH_STATUS_LABELS), 0);

                foreach ($devices as $d) {
                    $class = $d['deviceClass'] ?? 'unknown';
                    $type = $classMap[$class] ?? 'Unknown';
                    $byType[$type] = ($byType[$type] ?? 0) + 1;

                    $siteUid = $d['siteUid'] ?? null;
                    $siteName = $siteNames[$siteUid] ?? '—';
                    if (!isset($bySite[$siteName])) {
                        $bySite[$siteName] = ['total' => 0, 'Workstation' => 0, 'Network' => 0, 'ESXi' => 0, 'Printer' => 0, 'Unknown' => 0];
                    }
                    $bySite[$siteName]['total']++;
                    $bySite[$siteName][$type] = ($bySite[$siteName][$type] ?? 0) + 1;

                    $pm = $d['patchManagement'] ?? null;
                    $ps = $pm['patchStatus'] ?? null;
                    if ($ps !== null && isset($patchSummary[$ps])) {
                        $patchSummary[$ps]++;
                    }
                }

                $devicesReport['byType'] = $byType;
                $devicesReport['sites'] = [];
                foreach ($bySite as $siteName => $counts) {
                    $devicesReport['sites'][] = ['siteName' => $siteName, 'total' => $counts['total'], 'byType' => $counts];
                }

                $patchesReport['configured'] = true;
                $patchesReport['total'] = count($devices);
                $patchesReport['byCategory'] = array_map(fn ($k) => ['label' => self::PATCH_STATUS_LABELS[$k], 'count' => $patchSummary[$k]], array_keys(self::PATCH_STATUS_LABELS));
            } catch (\Throwable $e) {
                $devicesReport['error'] = $e->getMessage();
                $patchesReport['error'] = $e->getMessage();
            }
        }

        return response()->json([
            'tickets' => $ticketsReport,
            'devices' => $devicesReport,
            'patches' => $patchesReport,
            'generatedAt' => now()->toIso8601String(),
        ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
    }

    private function dattoConfigured(): bool
    {
        return !empty(config('datto_rmm.api_url'))
            && !empty(config('datto_rmm.api_key'))
            && !empty(config('datto_rmm.api_secret'));
    }
}
