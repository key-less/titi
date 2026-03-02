<?php

namespace App\Application\AI;

/**
 * Servicio de sugerencias de IA para tickets (y futuro agente de IA).
 */
interface SuggestionsServiceInterface
{
    /**
     * Obtiene sugerencias de resolución para un ticket dado su título y descripción.
     * @return array<string> Lista de sugerencias/pasos recomendados
     */
    public function getSuggestionsForTicket(string $title, ?string $description): array;

    /**
     * Envía un mensaje al asistente (chat) y devuelve la respuesta.
     * Preparado para integración con un agente de IA.
     */
    public function chat(string $message, ?string $ticketContext = null): string;
}
