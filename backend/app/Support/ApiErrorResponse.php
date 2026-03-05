<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * Respuestas de error unificadas para la API HELPDEX.
 * Origen: autotask, datto, backend.
 */
final class ApiErrorResponse
{
    public static function json(
        string $message,
        int $httpStatus = 200,
        ?string $hint = null,
        ?string $source = null
    ): JsonResponse {
        $body = ['message' => $message];
        if ($hint !== null && $hint !== '') {
            $body['hint'] = $hint;
        }
        if ($source !== null && $source !== '') {
            $body['source'] = $source;
        }
        return response()->json(
            $body,
            $httpStatus,
            ['Content-Type' => 'application/json; charset=UTF-8'],
            JSON_UNESCAPED_UNICODE
        );
    }

    public static function autotask(string $message, ?string $hint = null): JsonResponse
    {
        return self::json(
            $message,
            200,
            $hint ?? 'Revisa AUTOTASK_* en .env. Si acabas de cambiar .env: php artisan config:clear y reinicia el servidor.',
            'autotask'
        );
    }

    public static function datto(string $message, ?string $hint = null): JsonResponse
    {
        return self::json(
            $message,
            200,
            $hint ?? 'Revisa DATTO_RMM_API_URL, DATTO_RMM_API_KEY y DATTO_RMM_API_SECRET en .env.',
            'datto'
        );
    }
}
