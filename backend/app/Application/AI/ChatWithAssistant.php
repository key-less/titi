<?php

namespace App\Application\AI;

/**
 * Caso de uso: enviar mensaje al asistente de IA (preparado para agente de IA).
 */
final class ChatWithAssistant
{
    public function __construct(
        private SuggestionsServiceInterface $suggestionsService
    ) {}

    public function execute(string $message, ?string $ticketContext = null): string
    {
        return $this->suggestionsService->chat($message, $ticketContext);
    }
}
