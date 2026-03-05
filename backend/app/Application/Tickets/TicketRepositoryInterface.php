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

    /**
     * Notas/respuestas del ticket (TicketNotes en AutoTask).
     * @return array<int, array>
     */
    public function getTicketNotes(int|string $ticketId): array;

    /**
     * Recurso (técnico) por ID para mostrar autor de notas. Devuelve array con firstName, lastName, etc. o null.
     */
    public function getResource(int $resourceId): ?array;

    /**
     * Varios Resources por ID en una sola llamada.
     * @param list<int> $ids
     * @return array<int, array> id => item crudo de la API
     */
    public function getResourcesByIds(array $ids): array;
}
