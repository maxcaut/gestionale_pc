<?php

namespace App\Http\Controllers;

use GuzzleHttp\Cookie\CookieJar;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class ArgoXRadioController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            $payload = Cache::remember('argo-x-radio-positions-v3', 15, fn (): array => $this->fetchPositions());
            Cache::put('argo-x-radio-last-good', $payload, now()->addHours(6));

            return response()->json([
                ...$payload,
                'updated_at' => now()->toIso8601String(),
            ]);
        } catch (Throwable $exception) {
            report($exception);
            $stale = Cache::get('argo-x-radio-last-good');

            if (is_array($stale)) {
                return response()->json([
                    ...$stale,
                    'updated_at' => now()->toIso8601String(),
                    'stale' => true,
                ]);
            }

            return response()->json([
                'radios' => [],
                'total' => 0,
                'with_position' => 0,
                'online' => 0,
                'updated_at' => now()->toIso8601String(),
                'unavailable' => true,
            ], 503);
        }
    }

    private function fetchPositions(): array
    {
        $baseUrl = rtrim((string) config('services.argo_x.url'), '/');
        $username = (string) config('services.argo_x.username');
        $password = (string) config('services.argo_x.password');

        if ($baseUrl === '' || $username === '' || $password === '') {
            throw new RuntimeException('Configurazione ARGO-X incompleta.');
        }

        $cookies = new CookieJar;
        $client = Http::acceptJson()
            ->asJson()
            ->connectTimeout(5)
            ->timeout(15)
            ->retry(1, 250)
            ->withOptions(['cookies' => $cookies]);

        $client->post($baseUrl.'/api/login', [
            'username' => $username,
            'password' => $password,
        ])->throw();

        $rows = $client->get($baseUrl.'/api/radios')->throw()->json();
        if (! is_array($rows)) {
            throw new RuntimeException('Risposta radio ARGO-X non valida.');
        }

        $radios = collect($rows)
            ->filter(fn ($row): bool => is_array($row))
            ->map(fn (array $row): ?array => $this->normalizeRadio($row))
            ->filter()
            ->values()
            ->all();

        return [
            'radios' => $radios,
            'total' => count($rows),
            'with_position' => count($radios),
            'online' => collect($radios)->filter(
                fn (array $radio): bool => $radio['online']
            )->count(),
            'source' => 'ARGO-X',
        ];
    }

    private function normalizeRadio(array $row): ?array
    {
        $usesFixedPosition = ! is_numeric($row['lat'] ?? null) || ! is_numeric($row['lon'] ?? null);
        $lat = $usesFixedPosition ? ($row['fixed_lat'] ?? null) : $row['lat'];
        $lon = $usesFixedPosition ? ($row['fixed_lon'] ?? null) : $row['lon'];

        if (! is_numeric($lat) || ! is_numeric($lon)) {
            return null;
        }

        $lat = (float) $lat;
        $lon = (float) $lon;
        if ($lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) {
            return null;
        }

        $timestamp = collect([
            $row['gps_timestamp'] ?? null,
            $row['received_at'] ?? null,
            $row['last_seen'] ?? null,
        ])->first(fn ($value): bool => is_numeric($value));

        $positionAt = is_numeric($timestamp)
            ? now()->setTimestamp((int) $timestamp)->toIso8601String()
            : null;
        $ageSeconds = is_numeric($timestamp)
            ? max(0, now()->timestamp - (int) $timestamp)
            : null;

        $state = $this->radioState($row);

        return [
            'id' => (string) ($row['radio_id'] ?? ''),
            'alias' => trim((string) ($row['alias'] ?? '')) ?: null,
            'type' => trim((string) ($row['radio_type'] ?? '')) ?: null,
            'talkgroup' => isset($row['talkgroup']) ? (string) $row['talkgroup'] : null,
            'lat' => $lat,
            'lon' => $lon,
            'position_at' => $positionAt,
            'age_seconds' => $ageSeconds,
            'recent' => $ageSeconds !== null && $ageSeconds <= 900,
            'fixed_position' => $usesFixedPosition,
            'online' => $state['online'],
            'status' => $state['label'],
        ];
    }

    /** Replica le priorità usate da ARGO-X per classificare una radio. */
    private function radioState(array $row): array
    {
        if (($row['radio_type'] ?? null) === 'web') {
            return ! empty($row['online'])
                ? ['online' => true, 'label' => 'Operatore collegato']
                : ['online' => false, 'label' => 'Operatore non collegato'];
        }

        $position = $this->firstTimestamp($row, ['gps_timestamp', 'received_at', 'last_seen']);
        $lastArs = is_numeric($row['last_ars'] ?? null) ? (float) $row['last_ars'] : 0;
        $lastCheck = is_numeric($row['last_check'] ?? null) ? (float) $row['last_check'] : 0;
        $lastVoice = is_numeric($row['last_voice'] ?? null) ? (float) $row['last_voice'] : 0;
        $alive = max(
            $lastVoice,
            $lastArs && ! empty($row['ars_on']) ? $lastArs : 0,
            $lastCheck && ! empty($row['last_check_ok']) ? $lastCheck : 0,
        );
        $off = max(
            $lastArs && empty($row['ars_on']) ? $lastArs : 0,
            $lastCheck && empty($row['last_check_ok']) ? $lastCheck : 0,
        );

        if ($off && $off >= max($alive, $position)) {
            return ['online' => false, 'label' => 'Spenta o fuori copertura'];
        }

        if (is_numeric($row['fixed_lat'] ?? null) && is_numeric($row['fixed_lon'] ?? null)) {
            return ['online' => true, 'label' => 'Postazione fissa'];
        }

        if ($position && now()->timestamp - $position <= 30 * 60) {
            return ['online' => true, 'label' => 'Posizione recente'];
        }

        if ($alive && now()->timestamp - $alive <= 12 * 60 * 60) {
            return ['online' => true, 'label' => 'Accesa senza posizione aggiornata'];
        }

        return ['online' => false, 'label' => 'Spenta o fuori copertura'];
    }

    private function firstTimestamp(array $row, array $fields): float
    {
        foreach ($fields as $field) {
            if (is_numeric($row[$field] ?? null)) {
                return (float) $row[$field];
            }
        }

        return 0;
    }
}
