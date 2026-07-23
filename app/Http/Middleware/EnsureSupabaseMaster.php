<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

class EnsureSupabaseMaster
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

        $headers = [
            'apikey' => $anonKey,
            'Authorization' => 'Bearer '.$token,
        ];

        try {
            $userResponse = Http::connectTimeout(3)
                ->timeout(10)
                ->withHeaders($headers)
                ->get($url.'/auth/v1/user');
        } catch (ConnectionException) {
            return response()->json(['message' => 'Servizio di autenticazione temporaneamente non disponibile.'], 503);
        }

        if ($userResponse->serverError()) {
            return response()->json(['message' => 'Servizio di autenticazione temporaneamente non disponibile.'], 503);
        }

        if (! $userResponse->successful()) {
            return response()->json(['message' => 'Sessione non valida.'], 401);
        }

        $userId = $userResponse->json('id');
        if (! is_string($userId) || $userId === '') {
            return response()->json(['message' => 'Utente non valido.'], 401);
        }

        try {
            $profileResponse = Http::connectTimeout(3)
                ->timeout(10)
                ->withHeaders($headers)
                ->get($url.'/rest/v1/profiles', [
                    'id' => 'eq.'.$userId,
                    'select' => 'ruolo',
                ]);
        } catch (ConnectionException) {
            return response()->json(['message' => 'Servizio profili temporaneamente non disponibile.'], 503);
        }

        if (! $profileResponse->successful()) {
            return response()->json(['message' => 'Impossibile verificare il profilo utente.'], 502);
        }

        $profiles = $profileResponse->json();
        $ruolo = is_array($profiles) && isset($profiles[0]['ruolo']) ? $profiles[0]['ruolo'] : null;

        if (! in_array($ruolo, ['master', 'super_user'], true)) {
            return response()->json(['message' => 'Accesso riservato ai master.'], 403);
        }

        $request->attributes->set('supabase_user_id', $userId);
        $request->attributes->set('supabase_user_ruolo', $ruolo);

        return $next($request);
    }
}
