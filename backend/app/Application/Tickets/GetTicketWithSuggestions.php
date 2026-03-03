<?php

namespace App\Application\Tickets;

use App\Application\AI\SuggestionsServiceInterface;
use App\Domain\Entities\Ticket;

final class GetTicketWithSuggestions
{
    public function __construct(
        private TicketRepositoryInterface $ticketRepository,
        private SuggestionsServiceInterface $suggestionsService
    ) {}

    /**
     * Devuelve el ticket con detalles (cuenta, contacto, recursos) y sugerencias de IA.
     * @return array{ticket: array, suggestions: array<string>}
     */
    public function execute(int|string $ticketId): ?array
    {
        $ticket = $this->ticketRepository->getTicketWithDetails($ticketId);
        if (!$ticket) {
            return null;
        }

        $ticketArr = $this->ticketToArray($ticket);
        $notesRaw = $this->ticketRepository->getTicketNotes($ticketId);
        $ticketArr['notes'] = $this->notesToArray($notesRaw);

        try {
            $suggestions = $this->suggestionsService->getSuggestionsForTicket(
                $ticket->title,
                $ticket->description
            );
        } catch (\Throwable $e) {
            $suggestions = [];
        }

        return [
            'ticket' => $ticketArr,
            'suggestions' => $suggestions,
        ];
    }

    /**
     * @param array<int, array> $notes Items crudos de TicketNotes (AutoTask).
     * @return array<int, array{id: mixed, description: string, createDate: string|null, creatorResourceId: int|null, creatorName: string}>
     */
    private function notesToArray(array $notes): array
    {
        $out = [];
        $creatorCache = [];
        foreach ($notes as $n) {
            $creatorId = isset($n['creatorResourceID']) ? (int) $n['creatorResourceID'] : (isset($n['creatorResourceId']) ? (int) $n['creatorResourceId'] : null);
            $creatorName = null;
            if ($creatorId !== null && $creatorId > 0) {
                if (!isset($creatorCache[$creatorId])) {
                    $res = $this->ticketRepository->getResource($creatorId);
                    $creatorCache[$creatorId] = $res ? trim(($res['firstName'] ?? $res['FirstName'] ?? '') . ' ' . ($res['lastName'] ?? $res['LastName'] ?? '')) : null;
                }
                $creatorName = $creatorCache[$creatorId] ?? (string) $creatorId;
            }
            $out[] = [
                'id' => $n['id'] ?? $n['ID'] ?? null,
                'description' => $n['description'] ?? $n['Description'] ?? '',
                'createDate' => $n['createDate'] ?? $n['CreateDate'] ?? null,
                'creatorResourceId' => $creatorId,
                'creatorName' => $creatorName ?? '—',
            ];
        }
        return $out;
    }

    private function ticketToArray(Ticket $t): array
    {
        $arr = [
            'id' => $t->id,
            'ticketNumber' => $t->ticketNumber,
            'title' => $t->title,
            'description' => $t->description,
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
            'queueLabel' => $t->queueId !== null ? (config('autotask.queue_labels', [])[$t->queueId] ?? 'Queue ' . $t->queueId) : null,
        ];
        $arr['account'] = $t->account ? [
            'id' => $t->account->id,
            'companyName' => $t->account->companyName,
            'phone' => $t->account->phone,
            'website' => $t->account->website,
        ] : null;
        $arr['contact'] = $t->contact ? [
            'id' => $t->contact->id,
            'firstName' => $t->contact->firstName,
            'lastName' => $t->contact->lastName,
            'fullName' => $t->contact->fullName(),
            'email' => $t->contact->email,
            'phone' => $t->contact->phone,
            'title' => $t->contact->title,
        ] : null;
        $arr['assignedResource'] = $t->assignedResource ? $this->resourceToArray($t->assignedResource) : null;
        $arr['creatorResource'] = $t->creatorResource ? $this->resourceToArray($t->creatorResource) : null;
        $arr['completedByResource'] = $t->completedByResource ? $this->resourceToArray($t->completedByResource) : null;
        return $arr;
    }

    private function resourceToArray(\App\Domain\Entities\Resource $r): array
    {
        return [
            'id' => $r->id,
            'firstName' => $r->firstName,
            'lastName' => $r->lastName,
            'fullName' => $r->fullName(),
            'initials' => $r->initials(),
            'email' => $r->email,
            'userName' => $r->userName,
        ];
    }
}
