<?php

namespace App\Application\Tickets;

use App\Domain\Entities\Ticket;

interface TicketRepositoryInterface
{
    /**
     * Lista tickets del técnico/recurso actual (o todos si no hay filtro de recurso).
     * @param array{status?: int[], assignedResourceId?: int, limit?: int, page?: int} $filters
     * @return array<Ticket>
     */
    public function listTickets(array $filters = []): array;

    /**
     * Obtiene un ticket por ID con cuenta, contacto y recursos (asignado, creador, completado).
     */
    public function getTicketWithDetails(int|string $id): ?Ticket;
}
