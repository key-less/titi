<?php

namespace App\Infrastructure\AutoTask;

use App\Application\Tickets\TicketRepositoryInterface;
use App\Domain\Entities\Account;
use App\Domain\Entities\Contact;
use App\Domain\Entities\Resource;
use App\Domain\Entities\Ticket;
use App\Domain\Enums\TicketStatus;
use Illuminate\Support\Facades\Cache;

final class AutoTaskTicketRepository implements TicketRepositoryInterface
{
    private const CACHE_KEY_PREFIX = 'helpdex_autotask_';
    private const TICKETS_CACHE_KEY = self::CACHE_KEY_PREFIX . 'tickets_list';

    public function __construct(
        private AutoTaskApiClient $client,
        private int $cacheTtl = 60
    ) {}

    public function listTickets(array $filters = []): array
    {
        $openOnly = !empty($filters['openOnly']);
        $filter = [];

        // Filtrar por colas (Level I Support, Level II, Level III, Monitoring Alerts, etc.)
        $queueIds = $filters['queueIds'] ?? config('autotask.queue_ids', []);
        if (!empty($queueIds) && is_array($queueIds)) {
            $filter[] = [
                'op' => 'in',
                'field' => 'queueID',
                'value' => array_map('strval', $queueIds),
            ];
        }

        if (!empty($filters['assignedResourceId'])) {
            $filter[] = [
                'op' => 'eq',
                'field' => 'assignedResourceID',
                'value' => (string) $filters['assignedResourceId'],
            ];
        }
        // Filtro por estado: si openOnly, pedir solo open_status_ids a la API (New, In Progress, Waiting Customer, Waiting Vendor)
        if ($openOnly) {
            $openStatusIds = config('autotask.open_status_ids', [1, 6, 9, 10]);
            if (!empty($openStatusIds)) {
                $filter[] = [
                    'op' => 'in',
                    'field' => 'status',
                    'value' => array_map('strval', $openStatusIds),
                ];
            }
        } elseif (!empty($filters['status'])) {
            $filter[] = [
                'op' => 'in',
                'field' => 'status',
                'value' => array_map('strval', $filters['status']),
            ];
        }
        if (!empty($filters['createDateGte'])) {
            $filter[] = [
                'op' => 'gte',
                'field' => 'createDate',
                'value' => $filters['createDateGte'],
            ];
        }

        $cacheKey = self::TICKETS_CACHE_KEY . '_' . md5(json_encode($filters))
            . '_q_' . md5(json_encode($queueIds))
            . ($openOnly ? '_o_' . md5(json_encode(config('autotask.open_status_ids', [1, 6, 9, 10]))) : '');
        if ($this->cacheTtl > 0) {
            $cached = Cache::get($cacheKey);
            if ($cached !== null) {
                return $cached;
            }
        }

        $items = $this->client->query('Tickets', $filter, $filters['limit'] ?? 500);

        // Con openOnly el filtro por status ya se aplicó en la query a la API; no hace falta filtrar en PHP.

        $tickets = [];
        foreach ($items as $item) {
            $ticket = $this->mapToTicket($item);
            if ($ticket) {
                $tickets[] = $ticket;
            }
        }

        if ($this->cacheTtl > 0) {
            Cache::put($cacheKey, $tickets, $this->cacheTtl);
        }

        return $tickets;
    }

    public function getTicketWithDetails(int|string $id): ?Ticket
    {
        $item = $this->client->get('Tickets', $id);
        if (!$item) {
            return null;
        }

        $ticket = $this->mapToTicket($item);
        if (!$ticket) {
            return null;
        }

        $account = null;
        if ($ticket->companyId) {
            $company = $this->client->get('Companies', $ticket->companyId);
            if ($company) {
                $account = $this->mapToAccount($company);
            }
        }

        $contact = null;
        if ($ticket->contactId) {
            $contactData = $this->client->get('Contacts', $ticket->contactId);
            if ($contactData) {
                $contact = $this->mapToContact($contactData);
            }
        }

        $assignedResource = null;
        $creatorResource = null;
        $completedByResource = null;
        if ($ticket->assignedResourceId) {
            $res = $this->client->get('Resources', $ticket->assignedResourceId);
            if ($res) {
                $assignedResource = $this->mapToResource($res);
            }
        }
        if ($ticket->creatorResourceId) {
            $res = $this->client->get('Resources', $ticket->creatorResourceId);
            if ($res) {
                $creatorResource = $this->mapToResource($res);
            }
        }
        if ($ticket->completedByResourceId) {
            $res = $this->client->get('Resources', $ticket->completedByResourceId);
            if ($res) {
                $completedByResource = $this->mapToResource($res);
            }
        }

        return new Ticket(
            id: $ticket->id,
            ticketNumber: $ticket->ticketNumber,
            title: $ticket->title,
            description: $ticket->description,
            status: $ticket->status,
            priority: $ticket->priority,
            priorityLabel: $ticket->priorityLabel,
            resolution: $ticket->resolution,
            createDate: $ticket->createDate,
            completedDate: $ticket->completedDate,
            lastActivityDate: $ticket->lastActivityDate,
            estimatedHours: $ticket->estimatedHours,
            companyId: $ticket->companyId,
            contactId: $ticket->contactId,
            assignedResourceId: $ticket->assignedResourceId,
            creatorResourceId: $ticket->creatorResourceId,
            completedByResourceId: $ticket->completedByResourceId,
            queueId: $ticket->queueId,
            account: $account,
            contact: $contact,
            assignedResource: $assignedResource,
            creatorResource: $creatorResource,
            completedByResource: $completedByResource,
        );
    }

    private function mapToTicket(array $item): ?Ticket
    {
        $id = $item['id'] ?? $item['ID'] ?? null;
        $ticketNumber = $item['ticketNumber'] ?? $item['TicketNumber'] ?? (string) $id;
        $title = $item['title'] ?? $item['Title'] ?? '';
        $statusLabel = $this->resolveStatusLabel($item['status'] ?? $item['Status'] ?? null);
        $status = TicketStatus::fromAutotaskLabel($statusLabel);

        // Algunos endpoints pueden no devolver "id" pero sí "ticketNumber".
        // El constructor de Ticket requiere id (int|string), así que usamos el ticketNumber como fallback.
        if ($id === null) {
            $id = $ticketNumber !== null ? (string) $ticketNumber : '0';
        }

        return new Ticket(
            id: $id,
            ticketNumber: (string) $ticketNumber,
            title: (string) $title,
            description: $item['description'] ?? $item['Description'] ?? null,
            status: $status,
            priority: isset($item['priority']) ? (int) $item['priority'] : (isset($item['Priority']) ? (int) $item['Priority'] : null),
            priorityLabel: $this->resolvePriorityLabel($item['priority'] ?? $item['Priority'] ?? null),
            resolution: $item['resolution'] ?? $item['Resolution'] ?? null,
            createDate: $item['createDate'] ?? $item['CreateDate'] ?? null,
            completedDate: $item['completedDate'] ?? $item['CompletedDate'] ?? null,
            lastActivityDate: $item['lastActivityDate'] ?? $item['LastActivityDate'] ?? null,
            estimatedHours: isset($item['estimatedHours']) ? (float) $item['estimatedHours'] : (isset($item['EstimatedHours']) ? (float) $item['EstimatedHours'] : null),
            companyId: $this->intFrom($item, ['companyID', 'CompanyID', 'CompanyId']),
            contactId: $this->intFrom($item, ['contactID', 'ContactID', 'ContactId']),
            assignedResourceId: $this->intFrom($item, ['assignedResourceID', 'AssignedResourceID', 'AssignedResourceId']),
            creatorResourceId: $this->intFrom($item, ['creatorResourceID', 'CreatorResourceID', 'CreatorResourceId']),
            completedByResourceId: $this->intFrom($item, ['completedByResourceID', 'CompletedByResourceID', 'CompletedByResourceId']),
            queueId: $this->intFrom($item, ['queueID', 'QueueID', 'QueueId']),
        );
    }

    private function intFrom(array $item, array $keys): ?int
    {
        foreach ($keys as $key) {
            if (isset($item[$key]) && $item[$key] !== '' && $item[$key] !== null) {
                return (int) $item[$key];
            }
        }
        return null;
    }

    private function resolveStatusLabel(mixed $statusId): ?string
    {
        if ($statusId === null) {
            return null;
        }
        $id = (int) $statusId;
        $map = config('autotask.status_labels', [
            1 => 'New',
            2 => 'Complete',
            3 => 'In Progress',
            4 => 'Waiting Customer',
            5 => 'Waiting Vendor',
            6 => 'Work Complete',
        ]);
        return $map[$id] ?? 'Status ' . $id;
    }

    private function resolvePriorityLabel(mixed $priorityId): ?string
    {
        if ($priorityId === null) {
            return null;
        }
        $id = (int) $priorityId;
        $map = config('autotask.priority_labels', [
            1 => 'Normal',
            2 => 'Media',
            3 => 'Alta',
            4 => 'Critica',
        ]);
        return $map[$id] ?? 'Priority ' . $id;
    }

    private function mapToAccount(array $item): Account
    {
        $id = (int) ($item['id'] ?? $item['ID'] ?? 0);
        $name = $item['companyName'] ?? $item['CompanyName'] ?? 'Company #' . $id;
        return new Account(
            id: $id,
            companyName: (string) $name,
            phone: $item['phone'] ?? $item['Phone'] ?? null,
            website: $item['website'] ?? $item['Website'] ?? null,
            accountType: isset($item['companyType']) ? (int) $item['companyType'] : (isset($item['CompanyType']) ? (int) $item['CompanyType'] : null),
        );
    }

    private function mapToContact(array $item): Contact
    {
        $id = (int) ($item['id'] ?? $item['ID'] ?? 0);
        return new Contact(
            id: $id,
            firstName: (string) ($item['firstName'] ?? $item['FirstName'] ?? ''),
            lastName: (string) ($item['lastName'] ?? $item['LastName'] ?? ''),
            email: $item['email'] ?? $item['EmailAddress'] ?? $item['Email'] ?? null,
            phone: $item['phone'] ?? $item['Phone'] ?? null,
            title: $item['title'] ?? $item['Title'] ?? null,
        );
    }

    private function mapToResource(array $item): Resource
    {
        $id = (int) ($item['id'] ?? $item['ID'] ?? 0);
        return new Resource(
            id: $id,
            firstName: (string) ($item['firstName'] ?? $item['FirstName'] ?? ''),
            lastName: (string) ($item['lastName'] ?? $item['LastName'] ?? ''),
            email: $item['email'] ?? $item['Email'] ?? null,
            userName: $item['userName'] ?? $item['UserName'] ?? null,
        );
    }
}
