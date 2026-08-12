<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Symfony\Component\HttpFoundation\Response;

class EnsureExternalReadToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if (! $token) {
            return response()->json(['message' => 'Token mancante.'], 401);
        }

        try {
            $payload = json_decode(Crypt::decryptString($token), true, flags: JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException) {
            return response()->json(['message' => 'Token non valido.'], 401);
        }

        if (! is_array($payload)
            || ($payload['aud'] ?? null) !== 'external-read-api'
            || ! is_string($payload['sub'] ?? null)
            || ! is_int($payload['exp'] ?? null)
            || $payload['exp'] <= now()->getTimestamp()
        ) {
            return response()->json(['message' => 'Token non valido o scaduto.'], 401);
        }

        $request->attributes->set('external_user_id', $payload['sub']);
        $request->attributes->set('external_user_email', $payload['email'] ?? null);

        return $next($request);
    }
}
