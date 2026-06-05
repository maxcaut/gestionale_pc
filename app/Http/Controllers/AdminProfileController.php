<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminProfileController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:6',
            'ruolo' => ['required', Rule::in(['segreteria', 'master', 'capo_squadra', 'sala_operativa', 'super_user'])],
            'associazione' => 'nullable|string|max:255',
        ]);

        $this->validateAssociazioneForRuolo($validated['ruolo'], $validated['associazione'] ?? null);

        $associazione = in_array($validated['ruolo'], ['master', 'sala_operativa', 'super_user'], true)
            ? null
            : trim((string) $validated['associazione']);

        $serviceKey = (string) config('services.supabase.service_role_key');
        $url = rtrim((string) config('services.supabase.url'), '/');

        if ($serviceKey === '' || $url === '') {
            return response()->json([
                'message' => 'SUPABASE_SERVICE_ROLE_KEY non configurata sul server.',
            ], 500);
        }

        $adminHeaders = [
            'apikey' => $serviceKey,
            'Authorization' => 'Bearer '.$serviceKey,
            'Content-Type' => 'application/json',
        ];

        $userResponse = Http::withHeaders($adminHeaders)->post($url.'/auth/v1/admin/users', [
            'email' => $validated['email'],
            'password' => $validated['password'],
            'email_confirm' => true,
        ]);

        if (! $userResponse->successful()) {
            $message = $userResponse->json('msg')
                ?? $userResponse->json('message')
                ?? 'Impossibile creare l\'utente.';

            return response()->json(['message' => $message], $userResponse->status());
        }

        $userId = $userResponse->json('id');
        if (! is_string($userId) || $userId === '') {
            return response()->json(['message' => 'Risposta Supabase non valida.'], 500);
        }

        $profileResponse = Http::withHeaders($adminHeaders)->post($url.'/rest/v1/profiles', [
            'id' => $userId,
            'email' => $validated['email'],
            'ruolo' => $validated['ruolo'],
            'associazione' => $associazione,
        ]);

        if (! $profileResponse->successful()) {
            Http::withHeaders($adminHeaders)->delete($url.'/auth/v1/admin/users/'.$userId);

            return response()->json([
                'message' => 'Utente creato ma profilo non salvato. Riprova.',
            ], 500);
        }

        $profile = $profileResponse->json();
        if (is_array($profile) && isset($profile[0])) {
            $profile = $profile[0];
        }

        return response()->json(['profile' => $profile], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'ruolo' => ['sometimes', Rule::in(['segreteria', 'master', 'capo_squadra', 'sala_operativa', 'super_user'])],
            'associazione' => 'nullable|string|max:255',
            'password' => 'nullable|string|min:6',
        ]);

        $serviceKey = (string) config('services.supabase.service_role_key');
        $url = rtrim((string) config('services.supabase.url'), '/');

        if ($serviceKey === '' || $url === '') {
            return response()->json([
                'message' => 'SUPABASE_SERVICE_ROLE_KEY non configurata sul server.',
            ], 500);
        }

        $adminHeaders = [
            'apikey' => $serviceKey,
            'Authorization' => 'Bearer '.$serviceKey,
            'Content-Type' => 'application/json',
            'Prefer' => 'return=representation',
        ];

        $profilePayload = [];
        if (array_key_exists('ruolo', $validated)) {
            $profilePayload['ruolo'] = $validated['ruolo'];
            $profilePayload['associazione'] = in_array($validated['ruolo'], ['master', 'sala_operativa', 'super_user'], true)
                ? null
                : trim((string) ($validated['associazione'] ?? ''));
        } elseif (array_key_exists('associazione', $validated)) {
            $profilePayload['associazione'] = $validated['associazione'];
        }

        if (isset($profilePayload['ruolo']) && $profilePayload['ruolo'] === 'segreteria' && empty($profilePayload['associazione'])) {
            throw ValidationException::withMessages([
                'associazione' => 'Associazione obbligatoria per utenti segreteria.',
            ]);
        }

        if ($profilePayload !== []) {
            $profileResponse = Http::withHeaders($adminHeaders)
                ->patch($url.'/rest/v1/profiles?id=eq.'.$id, $profilePayload);

            if (! $profileResponse->successful()) {
                return response()->json(['message' => 'Impossibile aggiornare il profilo.'], 500);
            }
        }

        if (! empty($validated['password'])) {
            $passwordResponse = Http::withHeaders($adminHeaders)->put($url.'/auth/v1/admin/users/'.$id, [
                'password' => $validated['password'],
            ]);

            if (! $passwordResponse->successful()) {
                return response()->json(['message' => 'Profilo aggiornato ma password non modificata.'], 500);
            }
        }

        $fetchResponse = Http::withHeaders($adminHeaders)->get($url.'/rest/v1/profiles', [
            'id' => 'eq.'.$id,
            'select' => 'id,email,ruolo,associazione,created_at',
        ]);

        $profiles = $fetchResponse->json();
        $profile = is_array($profiles) && isset($profiles[0]) ? $profiles[0] : null;

        return response()->json(['profile' => $profile]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $currentUserId = $request->attributes->get('supabase_user_id');
        if ($currentUserId === $id) {
            return response()->json(['message' => 'Non puoi eliminare il tuo account.'], 422);
        }

        $serviceKey = (string) config('services.supabase.service_role_key');
        $url = rtrim((string) config('services.supabase.url'), '/');

        if ($serviceKey === '' || $url === '') {
            return response()->json([
                'message' => 'SUPABASE_SERVICE_ROLE_KEY non configurata sul server.',
            ], 500);
        }

        $adminHeaders = [
            'apikey' => $serviceKey,
            'Authorization' => 'Bearer '.$serviceKey,
        ];

        $deleteResponse = Http::withHeaders($adminHeaders)
            ->delete($url.'/auth/v1/admin/users/'.$id);

        if (! $deleteResponse->successful()) {
            return response()->json(['message' => 'Impossibile eliminare l\'utente.'], 500);
        }

        return response()->json(['message' => 'Utente eliminato.']);
    }

    private function validateAssociazioneForRuolo(string $ruolo, ?string $associazione): void
    {
        if (in_array($ruolo, ['segreteria', 'capo_squadra'], true) && empty(trim((string) $associazione))) {
            throw ValidationException::withMessages([
                'associazione' => 'Associazione obbligatoria per segreteria e capo squadra.',
            ]);
        }
    }
}
