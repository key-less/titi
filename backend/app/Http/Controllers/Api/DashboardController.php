<?php

namespace App\Http\Controllers\Api;

use App\Application\Tickets\ListMyTickets;
use App\Infrastructure\DattoRmm\DattoRmmApiClient;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Métricas del Dashboard: tickets (AutoTask) y parches/dispositivos (Datto RMM).
 * Todo con datos reales de las APIs.
 */
class DashboardController
{
    public function metrics(Request $request, ListMyTickets $listMyTickets, ?DattoRmmApiClient $dattoClient = null): JsonResponse
    {
        $resolvedIds = config('autotask.resolved_status_ids', [13]);
        $now = Carbon::now()->utc();
        $todayStart = $now->copy()->startOfDay()->format('Y-m-d\TH:i:s.000');
        $weekStart = $now->copy()->subDays(7)->startOfDay()->format('Y-m-d\TH:i:s.000');
        $monthStart = $now->copy()->startOfMonth()->format('Y-m-d\TH:i:s.000');

        $openTickets = 0;
        $resolvedToday = 0;
        $resolvedWeek = 0;
        $resolvedMonth = 0;
        $weeklyChart = [];
        $responseTimeChart = [];
        $byStatus = [];
        $ticketsError = null;

        $openList = [];
        try {
            $openList = $listMyTickets->execute(['openOnly' => true, 'limit' => 500]);
            $openTickets = count($openList);
        } catch (\Throwable $e) {
            $ticketsError = $e->getMessage();
        }

        try {
            $resolvedFilter = ['status' => $resolvedIds, 'limit' => 500];
            $resolvedFilterToday = $resolvedFilter + ['completedDateGte' => $todayStart];
            $resolvedToday = count($listMyTickets->execute($resolvedFilterToday));

            $resolvedFilterWeek = $resolvedFilter + ['completedDateGte' => $weekStart];
            $resolvedWeekList = $listMyTickets->execute($resolvedFilterWeek);
            $resolvedWeek = count($resolvedWeekList);

            $resolvedFilterMonth = $resolvedFilter + ['completedDateGte' => $monthStart];
            $resolvedMonthList = $listMyTickets->execute($resolvedFilterMonth);
            $resolvedMonth = count($resolvedMonthList);

            $byDay = [];
            for ($i = 6; $i >= 0; $i--) {
                $d = $now->copy()->subDays($i);
                $dayKey = $d->format('Y-m-d');
                $byDay[$dayKey] = [
                    'day' => $d->locale('es')->dayName,
                    'resolved' => 0,
                    'open' => 0,
                ];
            }
            foreach ($resolvedWeekList as $t) {
                if (!$t->completedDate) {
                    continue;
                }
                $completed = Carbon::parse($t->completedDate)->format('Y-m-d');
                if (isset($byDay[$completed])) {
                    $byDay[$completed]['resolved']++;
                }
            }
            foreach ($openList as $t) {
                $created = $t->createDate ? Carbon::parse($t->createDate)->format('Y-m-d') : null;
                if ($created && isset($byDay[$created])) {
                    $byDay[$created]['open']++;
                }
            }
            $weeklyChart = array_values($byDay);

            // Tiempo de resolución: promedio de minutos (completedDate - createDate) por día
            $responseTimeByDay = [];
            for ($i = 6; $i >= 0; $i--) {
                $d = $now->copy()->subDays($i);
                $responseTimeByDay[$d->format('Y-m-d')] = [
                    'time' => $d->locale('es')->dayName,
                    'minutesList' => [],
                    'sla' => 30,
                ];
            }
            foreach ($resolvedWeekList as $t) {
                if (!$t->completedDate || !$t->createDate) {
                    continue;
                }
                $completed = Carbon::parse($t->completedDate);
                $created = Carbon::parse($t->createDate);
                $dayKey = $completed->format('Y-m-d');
                if (!isset($responseTimeByDay[$dayKey])) {
                    continue;
                }
                $responseTimeByDay[$dayKey]['minutesList'][] = $completed->diffInMinutes($created);
            }
            $responseTimeChart = [];
            foreach ($responseTimeByDay as $row) {
                $minsList = $row['minutesList'];
                $avg = count($minsList) > 0 ? (int) round(array_sum($minsList) / count($minsList)) : 0;
                $responseTimeChart[] = [
                    'time' => $row['time'],
                    'minutes' => $avg,
                    'sla' => $row['sla'],
                ];
            }
        } catch (\Throwable $e) {
            $weeklyChart = $this->emptyWeeklyChart();
            $responseTimeChart = $this->emptyResponseTimeChart();
            if (!$ticketsError) {
                $ticketsError = $e->getMessage();
            }
        }

        try {
            $allPeriod = $listMyTickets->execute(['createDateGte' => $monthStart, 'limit' => 500]);
            foreach ($allPeriod as $t) {
                $label = $t->statusLabel() ?: ($t->status?->value ?? 'Unknown');
                $byStatus[$label] = ($byStatus[$label] ?? 0) + 1;
            }
        } catch (\Throwable $e) {
            // leave byStatus empty
        }

        $patchesSummary = [];
        $devicesTotal = 0;
        $patchesConfigured = false;
        if ($dattoClient && $this->dattoConfigured()) {
            try {
                $devices = $dattoClient->getDevices($request->query('site_uid'));
                $devicesTotal = count($devices);
                $patchesConfigured = true;
                $patchStatusLabels = [
                    'InstallError' => 'Install Error',
                    'NoPolicy' => 'No Policy',
                    'NoData' => 'No Data',
                    'RebootRequired' => 'Reboot Required',
                    'ApprovedPending' => 'Approved Pending',
                    'FullyPatched' => 'Compliant',
                ];
                $patchCounts = array_fill_keys(array_keys($patchStatusLabels), 0);
                foreach ($devices as $d) {
                    $pm = $d['patchManagement'] ?? null;
                    $ps = $pm['patchStatus'] ?? null;
                    if ($ps !== null && isset($patchCounts[$ps])) {
                        $patchCounts[$ps]++;
                    } elseif ($ps !== null) {
                        $patchCounts[$ps] = ($patchCounts[$ps] ?? 0) + 1;
                    }
                }
                foreach ($patchCounts as $k => $v) {
                    $patchesSummary[] = [
                        'key' => $k,
                        'label' => $patchStatusLabels[$k] ?? $k,
                        'count' => $v,
                    ];
                }
            } catch (\Throwable $e) {
                // leave patches empty
            }
        }

        return response()->json([
            'tickets' => [
                'openTickets' => $openTickets,
                'resolvedToday' => $resolvedToday,
                'resolvedWeek' => $resolvedWeek,
                'resolvedMonth' => $resolvedMonth,
                'weeklyChart' => $weeklyChart,
                'responseTimeChart' => $responseTimeChart,
                'byStatus' => $byStatus,
                'error' => $ticketsError,
            ],
            'patches' => [
                'configured' => $patchesConfigured,
                'devicesTotal' => $devicesTotal,
                'byCategory' => $patchesSummary,
            ],
            'slaBreached' => 0,
            'generatedAt' => $now->toIso8601String(),
        ], 200, ['Content-Type' => 'application/json'], JSON_UNESCAPED_UNICODE);
    }

    private function emptyWeeklyChart(): array
    {
        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = Carbon::now()->utc()->subDays($i);
            $days[] = [
                'day' => $d->locale('es')->dayName,
                'resolved' => 0,
                'open' => 0,
            ];
        }
        return $days;
    }

    private function emptyResponseTimeChart(): array
    {
        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = Carbon::now()->utc()->subDays($i);
            $days[] = [
                'time' => $d->locale('es')->dayName,
                'minutes' => 0,
                'sla' => 30,
            ];
        }
        return $days;
    }

    private function dattoConfigured(): bool
    {
        return !empty(config('datto_rmm.api_url'))
            && !empty(config('datto_rmm.api_key'))
            && !empty(config('datto_rmm.api_secret'));
    }
}
