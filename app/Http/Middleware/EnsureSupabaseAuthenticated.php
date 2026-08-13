<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

class EnsureSupabaseAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if (! $token) {
            return response()->json(['message' => 'Token mancante.'], 401);
        }

        $url = rtrim((string) config('services.supabase.url'), '/');
        $anonKey = (string) config('services.supabase.anon_key');

        if ($url === '' || $anonKey === '') {
            return response()->json(['message' => 'Configurazione Supabase mancante sul server.'], 500);
        }

        try {
            $response = Http::connectTimeout(3)
                ->timeout(10)
                ->withHeaders([
                    'apikey' => $anonKey,
                    'Authorization' => 'Bearer '.$token,
                ])
                ->get($url.'/auth/v1/user');
        } catch (ConnectionException) {
            return response()->json(['message' => 'Servizio di autenticazione temporaneamente non disponibile.'], 503);
        }

        if ($response->serverError()) {
            return response()->json(['message' => 'Servizio di autenticazione temporaneamente non disponibile.'], 503);
        }

        if (! $response->successful() || ! is_string($response->json('id'))) {
            return response()->json(['message' => 'Sessione non valida.'], 401);
        }

        $request->attributes->set('supabase_user_id', $response->json('id'));

        return $next($request);
    }
}
