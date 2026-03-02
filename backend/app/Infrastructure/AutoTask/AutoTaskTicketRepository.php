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
        if (!empty($filters['assignedResourceId'])) {
            $filter[] = [
                'op' => 'eq',
                'field' => 'assignedResourceID',
                'value' => (string) $filters['assignedResourceId'],
            ];
        }
        if (!empty($filters['status']) && !$openOnly) {
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
            . ($openOnly ? '_o_' . md5(json_encode([
                config('autotask.closed_status_ids', []),
                config('autotask.closed_status_labels', []),
            ])) : '');
        if ($this->cacheTtl > 0) {
            $cached = Cache::get($cacheKey);
            if ($cached !== null) {
                return $cached;
            }
        }

        $items = $this->client->query('Tickets', $filter, $filters['limit'] ?? 500);

        if ($openOnly) {
            $closedLabels = array_map('strtolower', config('autotask.closed_status_labels', ['Complete', 'Work Complete', 'RMM Resolved']));
            $closedIds = config('autotask.closed_status_ids', [12, 13, 14]);
            $items = array_values(array_filter($items, function (array $item) use ($closedLabels, $closedIds) {
                $raw = $item['status'] ?? $item['Status'] ?? null;
                $statusId = $raw !== null && $raw !== '' ? (int) $raw : 0;
                if ($statusId > 0 && in_array($statusId, $closedIds, true)) {
                    return false;
                }
                $label = is_numeric($raw) ? $this->resolveStatusLabel($raw) : (is_string($raw) ? trim($raw) : null);
                if ($label === null || $label === '') {
                    return true;
                }
                $labelLower = strtolower($label);
                if (in_array($labelLower, $closedLabels, true)) {
                    return false;
                }
                $closedSubstrings = ['complete', 'resolved', 'closed', 'cerrado', 'completado', 'cancelado', 'cancelled'];
                foreach ($closedSubstrings as $sub) {
                    if (str_contains($labelLower, $sub)) {
                        return false;
                    }
                }
                return true;
            }));
        }

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
            1 => 'Low',
            2 => 'Medium',
            3 => 'High',
            4 => 'Critical',
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
