<?php

use Illuminate\Support\Facades\Route;

// Diagnóstico: texto plano para ver si el servidor responde (sin JSON ni middleware api)
Route::get('/ping', function () {
    return response('HELPDEX OK', 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
});

Route::get('/', function () {
    return response()->json([
        'app' => 'HELPDEX API',
        'version' => '0.1.0',
        'docs' => 'GET /api/tickets, GET /api/tickets/{id}, POST /api/ai/chat',
    ]);
});
