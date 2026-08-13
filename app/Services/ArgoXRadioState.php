<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class ArgoXRadioState
{
    public const CACHE_KEY = 'argo-x-radio-live-state-v1';

    public function handle(array $message): void
    {
        $type = $message['tipo'] ?? null;

        if (in_array($type, ['risposta', 'risposta_comando'], true)) {
            $rows = $message['radio'] ?? $message['dati']['radio'] ?? null;
            if (is_array($rows)) {
                $this->bootstrap($rows, (float) ($message['quando'] ?? $message['ts'] ?? microtime(true)));
            }

            return;
        }

        $data = $message['dati'] ?? null;
        if (! is_array($data) || ! isset($data['radio_id'])) {
            return;
        }

        $state = $this->rawState();
        $id = (string) $data['radio_id'];
        $radio = $state['radios'][$id] ?? $this->emptyRadio($id);
        $eventAt = (float) ($message['ts'] ?? microtime(true));

        if ($type === 'posizione' && is_numeric($data['lat'] ?? null) && is_numeric($data['lon'] ?? null)) {
            $radio['lat'] = (float) $data['lat'];
            $radio['lon'] = (float) $data['lon'];
            $radio['position_at'] = (float) ($data['rilevata_il'] ?? $data['ricevuta_il'] ?? $eventAt);
            $radio['alias'] = trim((string) ($data['nome'] ?? $radio['alias'] ?? '')) ?: null;
        } elseif ($type === 'ars' && array_key_exists('acceso', $data)) {
            $radio['last_ars'] = $eventAt;
            $radio['ars_on'] = $data['acceso'] === true;
        } elseif ($type === 'presenza' && array_key_exists('present', $data)) {
            $radio['last_check'] = $eventAt;
            $radio['last_check_ok'] = $data['present'] === true;
        } elseif ($type === 'chiamata' && ($data['busy'] ?? false) === true) {
            $radio['last_voice'] = $eventAt;
        } else {
            return;
        }

        $state['radios'][$id] = $radio;
        $state['connected'] = true;
        $state['updated_at'] = $eventAt;
        Cache::forever(self::CACHE_KEY, $state);
    }

    public function markConnected(bool $connected): void
    {
        $state = $this->rawState();
        $state['connected'] = $connected;
        $state['connection_at'] = microtime(true);
        Cache::forever(self::CACHE_KEY, $state);
    }

    public function snapshot(): ?array
    {
        $state = Cache::get(self::CACHE_KEY);
        if (! is_array($state) || ! isset($state['radios']) || ! is_array($state['radios'])) {
            return null;
        }

        $now = microtime(true);
        $radios = collect($state['radios'])
            ->map(function (array $radio) use ($now): array {
                $positionAt = $radio['position_at'];
                $age = is_numeric($positionAt) ? max(0, $now - $positionAt) : null;
                $classification = $this->classify($radio, $now);

                return [
                    ...$radio,
                    ...$classification,
                    'position_at' => is_numeric($positionAt)
                        ? now()->setTimestamp((int) $positionAt)->toIso8601String()
                        : null,
                    'age_seconds' => $age,
                    'recent' => $age !== null && $age <= 900,
                ];
            })
            ->filter(fn (array $radio): bool => is_numeric($radio['lat']) && is_numeric($radio['lon']))
            ->values()
            ->all();

        return [
            'radios' => $radios,
            'total' => count($state['radios']),
            'with_position' => count($radios),
            'online' => collect($radios)->where('online', true)->count(),
            'source' => 'ARGO-X Connector',
            'connected' => (bool) ($state['connected'] ?? false),
            'updated_at' => now()->setTimestamp((int) ($state['updated_at'] ?? $now))->toIso8601String(),
        ];
    }

    private function bootstrap(array $rows, float $when): void
    {
        $existing = $this->rawState()['radios'];
        $radios = [];

        foreach ($rows as $row) {
            if (! is_array($row) || ! isset($row['radio_id']) || ($row['operatore_web'] ?? false) === true) {
                continue;
            }

            $id = (string) $row['radio_id'];
            $fixed = ($row['posizione_fissa'] ?? false) === true;
            $previous = $existing[$id] ?? null;
            $positionAt = $this->firstTimestamp($row, ['rilevata_il', 'ricevuta_il']);
            $lastSeen = $this->firstTimestamp($row, ['vista_il']);
            $reportedOn = ($row['accesa'] ?? false) === true;

            $radios[$id] = [
                'id' => $id,
                'alias' => trim((string) ($row['nome'] ?? '')) ?: null,
                'type' => trim((string) ($row['tipo'] ?? '')) ?: null,
                'talkgroup' => isset($row['talkgroup']) ? (string) $row['talkgroup'] : null,
                'lat' => is_numeric($row['lat'] ?? null) ? (float) $row['lat'] : null,
                'lon' => is_numeric($row['lon'] ?? null) ? (float) $row['lon'] : null,
                'position_at' => $positionAt,
                'fixed_position' => $fixed,
                'last_voice' => $previous['last_voice'] ?? null,
                'last_ars' => $previous['last_ars'] ?? ($reportedOn ? $lastSeen : null),
                'ars_on' => $previous['ars_on'] ?? $reportedOn,
                'last_check' => $previous['last_check'] ?? null,
                'last_check_ok' => $previous['last_check_ok'] ?? null,
            ];
        }

        Cache::forever(self::CACHE_KEY, [
            'radios' => $radios,
            'connected' => true,
            'connection_at' => microtime(true),
            'updated_at' => $when,
        ]);
    }

    private function rawState(): array
    {
        $state = Cache::get(self::CACHE_KEY);

        return is_array($state) && is_array($state['radios'] ?? null)
            ? $state
            : ['radios' => [], 'connected' => false, 'updated_at' => microtime(true)];
    }

    private function emptyRadio(string $id): array
    {
        return [
            'id' => $id,
            'alias' => null,
            'type' => null,
            'talkgroup' => null,
            'lat' => null,
            'lon' => null,
            'position_at' => null,
            'fixed_position' => false,
            'last_voice' => null,
            'last_ars' => null,
            'ars_on' => null,
            'last_check' => null,
            'last_check_ok' => null,
        ];
    }

    /** Traduzione diretta della funzione radioState di ARGO-X. */
    private function classify(array $radio, float $now): array
    {
        $position = is_numeric($radio['position_at'] ?? null) ? (float) $radio['position_at'] : 0;
        $lastArs = is_numeric($radio['last_ars'] ?? null) ? (float) $radio['last_ars'] : 0;
        $lastCheck = is_numeric($radio['last_check'] ?? null) ? (float) $radio['last_check'] : 0;
        $lastVoice = is_numeric($radio['last_voice'] ?? null) ? (float) $radio['last_voice'] : 0;
        $alive = max(
            $lastVoice,
            $lastArs && ($radio['ars_on'] ?? null) === true ? $lastArs : 0,
            $lastCheck && ($radio['last_check_ok'] ?? null) === true ? $lastCheck : 0,
        );
        $off = max(
            $lastArs && ($radio['ars_on'] ?? null) === false ? $lastArs : 0,
            $lastCheck && ($radio['last_check_ok'] ?? null) === false ? $lastCheck : 0,
        );

        if ($off && $off >= max($alive, $position)) {
            $selfReported = $lastArs && ($radio['ars_on'] ?? null) === false && $off === $lastArs;

            return $this->classification('black', $selfReported
                ? 'Spenta: lo ha annunciato lei stessa'
                : 'Non risponde: spenta o fuori copertura');
        }

        if (($radio['fixed_position'] ?? false) === true) {
            return $this->classification('green', 'Posizione fissa impostata');
        }

        $positionAgeMinutes = $position ? ($now - $position) / 60 : INF;
        if ($positionAgeMinutes <= 30) {
            return $this->classification('green', 'Posizione recente');
        }
        if ($positionAgeMinutes <= 120) {
            return $this->classification('yellow', 'Posizione scaduta');
        }

        if ($alive && ($now - $alive) / 60 <= 12 * 60) {
            $reason = $lastVoice === $alive
                ? 'Attiva sul canale'
                : (($lastArs && ($radio['ars_on'] ?? null) === true && $lastArs === $alive)
                    ? 'Accesa'
                    : 'Presente');

            return $this->classification('red', $reason.($position
                ? ', posizione GPS non aggiornata'
                : ', nessuna posizione GPS'));
        }

        return $this->classification('black', $position
            ? 'Posizione troppo vecchia: spenta o fuori copertura'
            : 'Mai vista: spenta o fuori copertura');
    }

    private function classification(string $color, string $status): array
    {
        return [
            'state_color' => $color,
            'status' => $status,
            'online' => $color !== 'black',
        ];
    }

    private function firstTimestamp(array $row, array $fields): ?float
    {
        foreach ($fields as $field) {
            if (is_numeric($row[$field] ?? null)) {
                return (float) $row[$field];
            }
        }

        return null;
    }
}
