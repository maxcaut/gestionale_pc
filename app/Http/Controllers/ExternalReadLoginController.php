<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

class ExternalReadLoginController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'password' => ['required', 'string', 'max:4096'],
        ]);

        $url = rtrim((string) config('services.supabase.url'), '/');
        $publishableKey = (string) config('services.supabase.anon_key');

        if ($url === '' || $publishableKey === '') {
            return response()->json(['message' => 'Configurazione di autenticazione mancante.'], 500);
        }

        try {
            $response = Http::connectTimeout(3)
                ->timeout(10)
                ->withHeaders(['apikey' => $publishableKey])
                ->post($url.'/auth/v1/token?grant_type=password', $credentials);
        } catch (ConnectionException) {
            return response()->json(['message' => 'Servizio di autenticazione temporaneamente non disponibile.'], 503);
        }

        if ($response->serverError()) {
            return response()->json(['message' => 'Servizio di autenticazione temporaneamente non disponibile.'], 503);
        }

        if (! $response->successful()) {
            return response()->json(['message' => 'Email o password non valide.'], 401);
        }

        $userId = $response->json('user.id');
        $email = $response->json('user.email');
        if (! is_string($userId) || $userId === '') {
            return response()->json(['message' => 'Utente non valido.'], 401);
        }

        $lifetime = max(1, (int) config('external_read_api.token_lifetime_minutes', 30));
        $expiresAt = now()->addMinutes($lifetime);
        $token = Crypt::encryptString(json_encode([
            'aud' => 'external-read-api',
            'sub' => $userId,
            'email' => is_string($email) ? $email : null,
            'exp' => $expiresAt->getTimestamp(),
        ], JSON_THROW_ON_ERROR));

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toIso8601String(),
        ]);
    }
}
