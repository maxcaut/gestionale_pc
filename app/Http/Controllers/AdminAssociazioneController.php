<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AdminAssociazioneController extends Controller
{
    public function index(): JsonResponse
    {
        $client = $this->supabaseClient();
        if ($client instanceof JsonResponse) {
            return $client;
        }

        [$url, $headers] = $client;
        $response = Http::withHeaders($headers)->get($url.'/rest/v1/associazioni', [
            'select' => 'id,nome,created_at',
            'order' => 'nome.asc',
        ]);

        if (! $response->successful()) {
            return response()->json(['message' => 'Impossibile caricare le associazioni.'], 500);
        }

        return response()->json(['associazioni' => $response->json() ?: []]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:255',
        ]);

        $nome = trim($validated['nome']);
        if ($nome === '') {
            return response()->json(['message' => 'Nome associazione obbligatorio.'], 422);
        }

        $client = $this->supabaseClient();
        if ($client instanceof JsonResponse) {
            return $client;
        }

        [$url, $headers] = $client;
        $response = Http::withHeaders(array_merge($headers, [
            'Content-Type' => 'application/json',
            'Prefer' => 'return=representation',
        ]))->post($url.'/rest/v1/associazioni', [
            'nome' => $nome,
        ]);

        if ($response->status() === 409) {
            return response()->json(['message' => 'Associazione già presente.'], 422);
        }

        if (! $response->successful()) {
            return response()->json(['message' => 'Impossibile aggiungere l\'associazione.'], 500);
        }

        $associazioni = $response->json();
        $associazione = is_array($associazioni) && isset($associazioni[0]) ? $associazioni[0] : null;

        return response()->json(['associazione' => $associazione], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        $client = $this->supabaseClient();
        if ($client instanceof JsonResponse) {
            return $client;
        }

        [$url, $headers] = $client;
        $associazioneResponse = Http::withHeaders($headers)->get($url.'/rest/v1/associazioni', [
            'id' => 'eq.'.$id,
            'select' => 'nome',
        ]);

        $rows = $associazioneResponse->json();
        $nome = is_array($rows) && isset($rows[0]['nome']) ? $rows[0]['nome'] : null;
        if (! is_string($nome) || $nome === '') {
            return response()->json(['message' => 'Associazione non trovata.'], 404);
        }

        if ($this->isAssociazioneInUse($url, $headers, $nome)) {
            return response()->json([
                'message' => 'Associazione già usata: non può essere rimossa.',
            ], 422);
        }

        $deleteResponse = Http::withHeaders($headers)->delete($url.'/rest/v1/associazioni?id=eq.'.$id);
        if (! $deleteResponse->successful()) {
            return response()->json(['message' => 'Impossibile rimuovere l\'associazione.'], 500);
        }

        return response()->json(['message' => 'Associazione rimossa.']);
    }

    private function isAssociazioneInUse(string $url, array $headers, string $nome): bool
    {
        $checks = [
            ['profiles', 'associazione'],
            ['volontari', 'associazione_appartenenza'],
            ['mezzi', 'associazione_appartenenza'],
            ['magazzino_attrezzature', 'associazione_appartenenza'],
            ['squadre_aib', 'associazione_appartenenza'],
        ];

        foreach ($checks as [$table, $column]) {
            $response = Http::withHeaders($headers)->get($url.'/rest/v1/'.$table, [
                $column => 'eq.'.$nome,
                'select' => 'id',
                'limit' => '1',
            ]);

            if (! $response->successful()) {
                continue;
            }

            $rows = $response->json();
            if (is_array($rows) && count($rows) > 0) {
                return true;
            }
        }

        return false;
    }

    private function supabaseClient(): array|JsonResponse
    {
        $serviceKey = (string) config('services.supabase.service_role_key');
        $url = rtrim((string) config('services.supabase.url'), '/');

        if ($serviceKey === '' || $url === '') {
            return response()->json([
                'message' => 'SUPABASE_SERVICE_ROLE_KEY non configurata sul server.',
            ], 500);
        }

        return [$url, [
            'apikey' => $serviceKey,
            'Authorization' => 'Bearer '.$serviceKey,
        ]];
    }
}
