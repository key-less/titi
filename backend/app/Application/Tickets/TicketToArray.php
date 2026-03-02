<?php

namespace App\Application\Tickets;

use App\Domain\Entities\Ticket;

/**
 * Convierte un Ticket a array para respuestas API (lista).
 */
final class TicketToArray
{
    public static function forList(Ticket $t): array
    {
        $arr = [
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
        ];
        if ($t->account) {
            $arr['account'] = [
                'id' => $t->account->id,
                'companyName' => $t->account->companyName,
                'phone' => $t->account->phone,
            ];
        }
        if ($t->contact) {
            $arr['contact'] = [
                'id' => $t->contact->id,
                'fullName' => $t->contact->fullName(),
                'email' => $t->contact->email,
                'phone' => $t->contact->phone,
            ];
        }
        if ($t->assignedResource) {
            $arr['assignedResource'] = [
                'id' => $t->assignedResource->id,
                'fullName' => $t->assignedResource->fullName(),
                'initials' => $t->assignedResource->initials(),
            ];
        }
        return $arr;
    }
}
