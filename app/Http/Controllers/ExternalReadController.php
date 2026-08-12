<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ExternalReadController extends Controller
{
    public function __invoke(Request $request, string $resource): JsonResponse
    {
        $resources = config('external_read_api.resources', []);
        if (! is_array($resources) || ! in_array($resource, $resources, true)) {
            return response()->json(['message' => 'Risorsa non disponibile.'], 404);
        }

        $validated = $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:1000'],
            'offset' => ['sometimes', 'integer', 'min:0'],
        ]);

        $url = rtrim((string) config('services.supabase.url'), '/');
        $serviceKey = (string) config('services.supabase.service_role_key');
        if ($url === '' || $serviceKey === '') {
            return response()->json(['message' => 'Configurazione database mancante.'], 500);
        }

        $query = [
            'select' => '*',
            'limit' => $validated['limit'] ?? 1000,
            'offset' => $validated['offset'] ?? 0,
        ];

        try {
            $response = Http::connectTimeout(3)
                ->timeout(20)
                ->withHeaders([
                    'apikey' => $serviceKey,
                    'Authorization' => 'Bearer '.$serviceKey,
                    'Prefer' => 'count=exact',
                ])
                ->get($url.'/rest/v1/'.$resource, $query);
        } catch (ConnectionException) {
            return response()->json(['message' => 'Database temporaneamente non disponibile.'], 503);
        }

        if (! $response->successful()) {
            return response()->json(['message' => 'Impossibile leggere la risorsa richiesta.'], 502);
        }

        return response()->json([
            'data' => $response->json() ?: [],
            'content_range' => $response->header('Content-Range'),
            'limit' => (int) $query['limit'],
            'offset' => (int) $query['offset'],
        ]);
    }
}
