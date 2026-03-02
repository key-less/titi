<?php

namespace App\Domain\Entities;

use App\Domain\Enums\TicketStatus;

final class Ticket
{
    public function __construct(
        public int|string $id,
        public string $ticketNumber,
        public string $title,
        public ?string $description,
        public ?TicketStatus $status,
        public ?int $priority,
        public ?string $priorityLabel,
        public ?string $resolution,
        public ?string $createDate,
        public ?string $completedDate,
        public ?string $lastActivityDate,
        public ?float $estimatedHours,
        public ?int $companyId,
        public ?int $contactId,
        public ?int $assignedResourceId,
        public ?int $creatorResourceId,
        public ?int $completedByResourceId,
        /** ID de la cola en AutoTask (Level I, Level II, Monitoring Alerts, etc.) */
        public ?int $queueId = null,
        /** Cuenta/empresa asociada al ticket (desde AutoTask Companies) */
        public ?Account $account = null,
        /** Contacto que reporta (desde AutoTask Contacts) */
        public ?Contact $contact = null,
        /** Recurso asignado (técnico) */
        public ?Resource $assignedResource = null,
        /** Recurso que creó el ticket */
        public ?Resource $creatorResource = null,
        /** Recurso que completó el ticket */
        public ?Resource $completedByResource = null,
    ) {}

    public function statusLabel(): string
    {
        return $this->status?->label() ?? 'Unknown';
    }
}
