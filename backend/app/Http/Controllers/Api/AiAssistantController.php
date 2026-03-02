<?php

namespace App\Http\Controllers\Api;

use App\Application\AI\ChatWithAssistant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AiAssistantController extends Controller
{
    /**
     * Chat con el asistente de IA (preparado para agente de IA).
     * POST /api/ai/chat
     * Body: { "message": "...", "ticketContext": "opcional" }
     */
    public function chat(Request $request, ChatWithAssistant $chatWithAssistant): JsonResponse
    {
        $message = $request->input('message');
        if (!is_string($message) || trim($message) === '') {
            return response()->json(['error' => 'message is required'], 422);
        }

        $ticketContext = $request->input('ticketContext');
        $response = $chatWithAssistant->execute(trim($message), is_string($ticketContext) ? $ticketContext : null);

        return response()->json(['response' => $response]);
    }
}
