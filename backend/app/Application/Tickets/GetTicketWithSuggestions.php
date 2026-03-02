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

        $suggestions = $this->suggestionsService->getSuggestionsForTicket(
            $ticket->title,
            $ticket->description
        );

        return [
            'ticket' => $this->ticketToArray($ticket),
            'suggestions' => $suggestions,
        ];
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
        ];
        if ($t->account) {
            $arr['account'] = [
                'id' => $t->account->id,
                'companyName' => $t->account->companyName,
                'phone' => $t->account->phone,
                'website' => $t->account->website,
            ];
        }
        if ($t->contact) {
            $arr['contact'] = [
                'id' => $t->contact->id,
                'firstName' => $t->contact->firstName,
                'lastName' => $t->contact->lastName,
                'fullName' => $t->contact->fullName(),
                'email' => $t->contact->email,
                'phone' => $t->contact->phone,
                'title' => $t->contact->title,
            ];
        }
        if ($t->assignedResource) {
            $arr['assignedResource'] = $this->resourceToArray($t->assignedResource);
        }
        if ($t->creatorResource) {
            $arr['creatorResource'] = $this->resourceToArray($t->creatorResource);
        }
        if ($t->completedByResource) {
            $arr['completedByResource'] = $this->resourceToArray($t->completedByResource);
        }
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
