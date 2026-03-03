<?php

namespace App\Infrastructure\AI;

use App\Application\AI\SuggestionsServiceInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Servicio de sugerencias usando OpenAI (o compatible).
 * Preparado para extender con un Agente de IA para tickets.
 */
final class OpenAISuggestionsService implements SuggestionsServiceInterface
{
    public function __construct(
        private string $apiKey,
        private string $model = 'gpt-4o-mini',
        private string $baseUrl = 'https://api.openai.com/v1',
        private bool $verifySsl = true
    ) {}

    public function getSuggestionsForTicket(string $title, ?string $description): array
    {
        $prompt = $this->buildSuggestionsPrompt($title, $description);
        $response = $this->chatCompletion($prompt, max_tokens: 600);

        if ($response === null) {
            return [
                'No se pudieron generar sugerencias en este momento. Verifica la configuración de la API de IA.',
            ];
        }

        $lines = preg_split('/\n+/', trim($response), -1, PREG_SPLIT_NO_EMPTY);
        $suggestions = [];
        foreach ($lines as $line) {
            $line = preg_replace('/^[\d\-\.\)\*]+\s*/', '', trim($line));
            if ($line !== '') {
                $suggestions[] = $line;
            }
        }
        return $suggestions ?: [$response];
    }

    public function chat(string $message, ?string $ticketContext = null): string
    {
        $system = 'Eres un asistente técnico para ingenieros de soporte (Help Desk).';
        if ($ticketContext) {
            $system .= "\nContexto del ticket actual:\n" . $ticketContext;
        }
        $response = $this->chatCompletion($message, system: $system, max_tokens: 800);
        return $response ?? 'No pude procesar tu mensaje. Revisa la configuración de la API de IA.';
    }

    private function buildSuggestionsPrompt(string $title, ?string $description): string
    {
        $desc = $description ? "\nDescripción: " . mb_substr($description, 0, 2000) : '';
        return <<<PROMPT
Como experto en soporte técnico y troubleshooting, sugiere pasos concretos y técnicos para resolver este ticket. Responde solo con una lista numerada de acciones (cada una en una línea), sin introducción ni conclusión.

Título del ticket: {$title}{$desc}
PROMPT;
    }

    private function chatCompletion(string $userMessage, ?string $system = null, int $max_tokens = 500): ?string
    {
        $messages = [];
        if ($system) {
            $messages[] = ['role' => 'system', 'content' => $system];
        }
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type' => 'application/json',
        ])->withOptions(['verify' => $this->verifySsl])->timeout(30)->post($this->baseUrl . '/chat/completions', [
            'model' => $this->model,
            'messages' => $messages,
            'max_tokens' => $max_tokens,
        ]);

        if (!$response->successful()) {
            Log::warning('OpenAI API error', ['status' => $response->status(), 'body' => $response->body()]);
            return null;
        }

        $data = $response->json();
        $content = $data['choices'][0]['message']['content'] ?? null;
        return $content ? trim($content) : null;
    }
}
