<?php

namespace App\Http\Controllers\Api;

use App\Application\Tickets\GetTicketWithSuggestions;
use App\Application\Tickets\ListMyTickets;
use App\Http\Controllers\Controller;
use App\Infrastructure\AutoTask\AutoTaskApiClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

final class TicketController extends Controller
{
    /**
     * Lista de tickets (AutoTask).
     * Query: status[]=3&limit=100&open_only=1&period=24h|7d|6m|all
     * - open_only=1: solo tickets abiertos (New, In Progress, Waiting Customer, Waiting Vendor).
     * - period=24h|7d|6m|all: filtrar por createDate (últimas 24h, 7 días, 6 meses, o todos).
     */
    public function index(Request $request, ListMyTickets $listMyTickets, AutoTaskApiClient $autotaskClient): JsonResponse
    {
        $filters = [];
        $assignedParam = $request->input('assigned_resource_id');
        if ($assignedParam !== null && $assignedParam !== '' && $assignedParam !== 'me' && $assignedParam !== 'mine') {
            $filters['assignedResourceId'] = (int) $assignedParam;
        }
        if ($request->boolean('open_only')) {
            $filters['openOnly'] = true;
        } elseif ($request->has('status') && is_array($request->status)) {
            $filters['status'] = array_map('intval', $request->status);
        }
        $period = $request->input('period', 'all');
        if ($period !== 'all') {
            $from = match ($period) {
                '24h' => Carbon::now()->utc()->subHours(24),
                '7d' => Carbon::now()->utc()->subDays(7),
                '6m' => Carbon::now()->utc()->subMonths(6),
                default => null,
            };
            if ($from) {
                $filters['createDateGte'] = $from->format('Y-m-d\TH:i:s.000');
            }
        }
        $filters['limit'] = min((int) $request->input('limit', 100), 500);

        try {
            $tickets = $listMyTickets->execute($filters);
        } catch (\Throwable $e) {
            return response()->json([
                'tickets' => [],
                'count' => 0,
                'message' => $e->getMessage() ?: 'AutoTask no configurado o error al conectar. Revisa .env (AUTOTASK_*).',
            ], 200, ['Content-Type' => 'application/json; charset=UTF-8'], JSON_UNESCAPED_UNICODE);
        }

        // Hidratar assignedResource para la lista (el repositorio solo lo devuelve en getTicketWithDetails)
        $resourceMap = $this->fetchResourcesMap($tickets, $autotaskClient);

        $queueLabels = config('autotask.queue_labels', []);
        $data = array_map(function ($t) use ($queueLabels, $resourceMap) {
            $queueLabel = $t->queueId !== null
                ? ($queueLabels[$t->queueId] ?? 'Queue ' . $t->queueId)
                : null;
            $assignedResource = $t->assignedResource ?? ($t->assignedResourceId && isset($resourceMap[$t->assignedResourceId])
                ? $resourceMap[$t->assignedResourceId]
                : null);
            return [
                'id' => $t->id,
                'ticketNumber' => $t->ticketNumber,
                'title' => $t->title,
                'description' => $t->description ? mb_substr($t->description, 0, 500) : null,
                'status' => $t->status?->value,
                'statusLabel' => $t->statusLabel(),
                'priority' => $t->priority,
                'priorityLabel' => $t->priorityLabel,
                'resolution' => $t->resolution,
                'createDate' => $t->createDate,
                'completedDate' => $t->completedDate,
                'lastActivityDate' => $t->lastActivityDate,
                'estimatedHours' => $t->estimatedHours,
                'companyId' => $t->companyId,
                'contactId' => $t->contactId,
                'assignedResourceId' => $t->assignedResourceId,
                'creatorResourceId' => $t->creatorResourceId,
                'completedByResourceId' => $t->completedByResourceId,
                'queueId' => $t->queueId,
                'queueLabel' => $queueLabel,
                'account' => $t->account ? [
                    'id' => $t->account->id,
                    'companyName' => $t->account->companyName,
                    'phone' => $t->account->phone,
                ] : null,
                'contact' => $t->contact ? [
                    'id' => $t->contact->id,
                    'fullName' => $t->contact->fullName(),
                    'email' => $t->contact->email,
                    'phone' => $t->contact->phone,
                ] : null,
                'assignedResource' => $assignedResource,
            ];
        }, $tickets);

        $count = count($data);
        $hadAssignedFilter = isset($filters['assignedResourceId']);
        $message = $count > 0
            ? null
            : ($hadAssignedFilter
                ? 'Conectado a AutoTask. No hay tickets que coincidan con el filtro asignado.'
                : 'Conectado a AutoTask. No hay tickets que coincidan con los criterios actuales.');

        return response()->json([
            'tickets' => $data,
            'count' => $count,
            'message' => $message,
        ], 200, ['Content-Type' => 'application/json; charset=UTF-8'], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Obtiene un mapa id => {id, fullName, initials} de Resources (AutoTask) para los assignedResourceId de los tickets.
     *
     * @param array<\App\Domain\Entities\Ticket> $tickets
     * @return array<int, array{id: int, fullName: string, initials: string}>
     */
    private function fetchResourcesMap(array $tickets, AutoTaskApiClient $client): array
    {
        $ids = [];
        foreach ($tickets as $t) {
            if ($t->assignedResourceId !== null && $t->assignedResource === null) {
                $ids[$t->assignedResourceId] = true;
            }
        }
        $ids = array_keys($ids);
        if ($ids === []) {
            return [];
        }
        try {
            $filter = [
                ['op' => 'in', 'field' => 'id', 'value' => array_map('strval', $ids)],
            ];
            $items = $client->query('Resources', $filter, 500);
            $map = [];
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
                $map[$id] = [
                    'id' => $id,
                    'fullName' => $fullName,
                    'initials' => strtoupper($initials),
                ];
            }
            return $map;
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * Un ticket por ID con cuenta, contacto, técnicos y sugerencias de IA.
     * GET /api/tickets/{id}
     */
    public function show(string $id, GetTicketWithSuggestions $getTicketWithSuggestions): JsonResponse
    {
        $result = $getTicketWithSuggestions->execute($id);
        if ($result === null) {
            return response()->json(['message' => 'Ticket not found'], 404);
        }
        return response()->json($result);
    }
}
