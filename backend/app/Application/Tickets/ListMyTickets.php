<?php

namespace App\Application\Tickets;

use App\Domain\Entities\Ticket;

final class ListMyTickets
{
    public function __construct(
        private TicketRepositoryInterface $ticketRepository
    ) {}

    /**
     * @param array{status?: int[], limit?: int, page?: int} $filters
     * @return array<Ticket>
     */
    public function execute(array $filters = []): array
    {
        return $this->ticketRepository->listTickets($filters);
    }
}
