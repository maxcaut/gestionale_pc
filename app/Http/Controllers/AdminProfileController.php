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
            'nome' => 'nullable|string|max:255',
            'cognome' => 'nullable|string|max:255',
            'ruolo' => ['required', Rule::in(['segreteria', 'master', 'capo_squadra', 'sala_operativa', 'super_user'])],
            'associazione' => 'nullable|string|max:255',
        ]);

        $this->validateAssociazioneForRuolo($validated['ruolo'], $validated['associazione'] ?? null);

        if ($denied = $this->denyMasterManagingSuperUser($request, $validated['ruolo'])) {
            return $denied;
        }

        $associazione = in_array($validated['ruolo'], ['master', 'sala_operativa', 'super_user'], true)
            ? null
            : trim((string) $validated['associazione']);
        $anagrafica = $this->profileAnagraficaForRuolo(
            $validated['ruolo'],
            $validated['nome'] ?? null,
            $validated['cognome'] ?? null,
        );

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
            'nome' => $anagrafica['nome'],
            'cognome' => $anagrafica['cognome'],
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
            'nome' => 'sometimes|nullable|string|max:255',
            'cognome' => 'sometimes|nullable|string|max:255',
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

        $currentProfileResponse = Http::withHeaders($adminHeaders)->get($url.'/rest/v1/profiles', [
            'id' => 'eq.'.$id,
            'select' => 'id,nome,cognome,ruolo,associazione',
        ]);
        if (! $currentProfileResponse->successful()) {
            return response()->json(['message' => 'Impossibile verificare il profilo da aggiornare.'], 502);
        }

        $currentProfiles = $currentProfileResponse->json();
        $currentProfile = is_array($currentProfiles) && isset($currentProfiles[0])
            ? $currentProfiles[0]
            : null;
        if (! is_array($currentProfile)) {
            return response()->json(['message' => 'Profilo non trovato.'], 404);
        }

        $currentRuolo = (string) ($currentProfile['ruolo'] ?? '');
        $newRuolo = (string) ($validated['ruolo'] ?? $currentRuolo);
        if (
            $denied = $this->denyMasterManagingSuperUser(
                $request,
                $currentRuolo === 'super_user' || $newRuolo === 'super_user' ? 'super_user' : $newRuolo,
            )
        ) {
            return $denied;
        }

        $profilePayload = [];
        if (array_key_exists('ruolo', $validated)) {
            $profilePayload['ruolo'] = $validated['ruolo'];
            $profilePayload = [
                ...$profilePayload,
                ...$this->profileAnagraficaForRuolo(
                    $validated['ruolo'],
                    array_key_exists('nome', $validated) ? $validated['nome'] : ($currentProfile['nome'] ?? null),
                    array_key_exists('cognome', $validated) ? $validated['cognome'] : ($currentProfile['cognome'] ?? null),
                ),
            ];
            $profilePayload['associazione'] = in_array($validated['ruolo'], ['master', 'sala_operativa', 'super_user'], true)
                ? null
                : trim((string) ($validated['associazione'] ?? ($currentProfile['associazione'] ?? '')));
        } elseif (array_key_exists('nome', $validated) || array_key_exists('cognome', $validated)) {
            $profilePayload = [
                ...$profilePayload,
                ...$this->profileAnagraficaForRuolo(
                    $currentRuolo,
                    array_key_exists('nome', $validated) ? $validated['nome'] : ($currentProfile['nome'] ?? null),
                    array_key_exists('cognome', $validated) ? $validated['cognome'] : ($currentProfile['cognome'] ?? null),
                ),
            ];
        }
        if (! array_key_exists('ruolo', $validated) && array_key_exists('associazione', $validated)) {
            $profilePayload['associazione'] = $validated['associazione'];
        }

        if (
            isset($profilePayload['ruolo'])
            && in_array($profilePayload['ruolo'], ['segreteria', 'capo_squadra'], true)
            && empty($profilePayload['associazione'])
        ) {
            throw ValidationException::withMessages([
                'associazione' => 'Associazione obbligatoria per segreteria e capo squadra.',
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
            'select' => 'id,email,nome,cognome,ruolo,associazione,created_at',
        ]);
        if (! $fetchResponse->successful()) {
            return response()->json(['message' => 'Profilo aggiornato, ma non è stato possibile ricaricarlo.'], 502);
        }

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

        $profileResponse = Http::withHeaders($adminHeaders)->get($url.'/rest/v1/profiles', [
            'id' => 'eq.'.$id,
            'select' => 'ruolo',
        ]);

        $profiles = $profileResponse->json();
        $targetRuolo = is_array($profiles) && isset($profiles[0]['ruolo']) ? $profiles[0]['ruolo'] : null;

        if ($denied = $this->denyMasterManagingSuperUser($request, (string) $targetRuolo)) {
            return $denied;
        }

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

    private function profileAnagraficaForRuolo(string $ruolo, ?string $nome, ?string $cognome): array
    {
        if (! in_array($ruolo, ['capo_squadra', 'master', 'super_user'], true)) {
            return [
                'nome' => null,
                'cognome' => null,
            ];
        }

        $nome = trim((string) $nome);
        $cognome = trim((string) $cognome);

        return [
            'nome' => $nome === '' ? null : $nome,
            'cognome' => $cognome === '' ? null : $cognome,
        ];
    }

    private function denyMasterManagingSuperUser(Request $request, string $targetRuolo): ?JsonResponse
    {
        if (
            $request->attributes->get('supabase_user_ruolo') === 'master'
            && $targetRuolo === 'super_user'
        ) {
            return response()->json([
                'message' => 'Non autorizzato a gestire utenti SuperUser.',
            ], 403);
        }

        return null;
    }
}
