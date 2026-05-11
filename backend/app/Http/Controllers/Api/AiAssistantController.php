<?php

namespace App\Http\Controllers\Api;

use App\Application\AI\ChatWithAssistant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

final class AiAssistantController extends Controller
{
    /**
     * Chat con el asistente de IA (preparado para agente de IA).
     * POST /api/ai/chat
     * Body: { "message": "...", "ticketContext": "opcional" }
     */
    public function chat(Request $request, ChatWithAssistant $chatWithAssistant): JsonResponse
    {
        $key = 'ai_chat:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 20)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json(['error' => "Demasiadas solicitudes. Intenta en {$seconds}s."], 429);
        }
        RateLimiter::hit($key, 60);

        $message = $request->input('message');
        if (!is_string($message) || trim($message) === '') {
            return response()->json(['error' => 'message is required'], 422);
        }
        if (mb_strlen($message) > 4000) {
            return response()->json(['error' => 'El mensaje no puede superar 4000 caracteres.'], 422);
        }

        $ticketContext = $request->input('ticketContext');
        if (is_string($ticketContext) && mb_strlen($ticketContext) > 2000) {
            $ticketContext = mb_substr($ticketContext, 0, 2000);
        }
        $response = $chatWithAssistant->execute(trim($message), is_string($ticketContext) ? $ticketContext : null);

        return response()->json(['response' => $response]);
    }
}
