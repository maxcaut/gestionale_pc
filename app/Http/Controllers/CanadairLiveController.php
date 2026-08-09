<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

class CanadairLiveController extends Controller
{
    private const FLEET = [
        'I-DPCD', 'I-DPCE', 'I-DPCO', 'I-DPCP', 'I-DPCQ', 'I-DPCT',
        'I-DPCU', 'I-DPCV', 'I-DPCW', 'I-DPCY', 'I-DPCZ', 'I-DPCI',
        'I-DPCF', 'I-DPCG', 'I-DPCH', 'I-DPCC', 'I-DPCS', 'I-DPCR',
    ];

    private const ICAO_HEX = [
        '30023D', '30023E', '30023F', '300240', '300241', '300242',
        '300243', '300244', '300245', '300247', '300248', '300249',
        '30024A', '30024B', '30024C', '300337', '30041D', '30043D',
    ];

    public function __invoke(): JsonResponse
    {
        try {
            $live = Cache::remember('canadair-live-positions-v2', 15, fn (): array => $this->aggregate());
            Cache::put('canadair-live-last-good', $live, now()->addHours(2));

            return response()->json([
                ...$live,
                'fleet_size' => count(self::FLEET),
                'updated_at' => now()->toIso8601String(),
                'source' => 'ADSB.lol + Airplanes.live + adsb.fi',
            ]);
        } catch (Throwable $exception) {
            report($exception);
            $stale = Cache::get('canadair-live-last-good');

            if (is_array($stale)) {
                return response()->json([
                    ...$stale,
                    'fleet_size' => count(self::FLEET),
                    'updated_at' => now()->toIso8601String(),
                    'source' => 'feed ADS-B aperti',
                    'stale' => true,
                ]);
            }

            return response()->json([
                'aircraft' => [],
                'detected' => 0,
                'without_position' => [],
                'fleet_size' => count(self::FLEET),
                'updated_at' => now()->toIso8601String(),
                'source' => 'feed ADS-B aperti',
                'unavailable' => true,
            ], 503);
        }
    }

    private function aggregate(): array
    {
        $hex = implode(',', self::ICAO_HEX);
        $feeds = [
            $this->fetch('canadair-feed-adsb-lol', 'https://api.adsb.lol/v2/hex/'.$hex, 15, 'ADSB.lol'),
            $this->fetch('canadair-feed-airplanes-live', 'https://api.airplanes.live/v2/hex/'.$hex, 180, 'Airplanes.live'),
            $this->fetch('canadair-feed-adsb-fi', 'https://opendata.adsb.fi/api/v2/icao/'.$hex, 180, 'adsb.fi'),
        ];

        $fleet = array_flip(self::FLEET);
        $detected = collect($feeds)
            ->flatten(1)
            ->filter(function (array $item) use ($fleet): bool {
                $registration = strtoupper(trim((string) ($item['r'] ?? '')));

                return isset($fleet[$registration]) && ($item['alt_baro'] ?? null) !== 'ground';
            })
            ->groupBy(fn (array $item): string => strtoupper(trim((string) $item['r'])));

        $aircraft = $detected
            ->map(fn (Collection $reports): ?array => $reports
                ->map(fn (array $item): ?array => $this->normalizePosition($item))
                ->filter()
                ->sortBy('seen_seconds')
                ->first())
            ->filter();

        $lastPositions = Cache::get('canadair-live-last-positions', []);
        foreach ($aircraft as $registration => $position) {
            $lastPositions[$registration] = $position;
        }

        foreach ($detected->keys() as $registration) {
            if ($aircraft->has($registration) || !isset($lastPositions[$registration]['position_at'])) {
                continue;
            }

            $age = (int) now()->diffInSeconds($lastPositions[$registration]['position_at']);
            if ($age <= 300) {
                $aircraft->put($registration, [
                    ...$lastPositions[$registration],
                    'last_position' => true,
                    'seen_seconds' => $age,
                ]);
            }
        }

        Cache::put('canadair-live-last-positions', $lastPositions, now()->addMinutes(10));

        return [
            'aircraft' => $aircraft->values()->all(),
            'detected' => $detected->count(),
            'without_position' => $detected->keys()->reject(fn (string $registration): bool => $aircraft->has($registration))->values()->all(),
        ];
    }

    private function fetch(string $cacheKey, string $url, int $ttl, string $source): array
    {
        return Cache::remember($cacheKey, $ttl, function () use ($url, $source): array {
            try {
                $response = Http::acceptJson()->timeout(8)->retry(1, 250)->get($url)->throw();

                return collect($response->json('ac', []))
                    ->map(fn (array $item): array => [...$item, '_source' => $source])
                    ->all();
            } catch (Throwable $exception) {
                report($exception);

                return [];
            }
        });
    }

    private function normalizePosition(array $item): ?array
    {
        $lat = $item['lat'] ?? null;
        $lon = $item['lon'] ?? null;
        $seen = is_numeric($item['seen_pos'] ?? null) ? (float) $item['seen_pos'] : 0;
        $lastPosition = false;

        if ((!is_numeric($lat) || !is_numeric($lon)) && isset($item['lastPosition'])) {
            $lat = $item['lastPosition']['lat'] ?? null;
            $lon = $item['lastPosition']['lon'] ?? null;
            $seen = is_numeric($item['lastPosition']['seen_pos'] ?? null)
                ? (float) $item['lastPosition']['seen_pos']
                : $seen;
            $lastPosition = true;
        }

        if (!is_numeric($lat) || !is_numeric($lon) || $seen > 300) {
            return null;
        }

        return [
            'registration' => strtoupper(trim((string) $item['r'])),
            'callsign' => trim((string) ($item['flight'] ?? '')) ?: null,
            'lat' => (float) $lat,
            'lon' => (float) $lon,
            'altitude_ft' => is_numeric($item['alt_baro'] ?? null) ? (int) $item['alt_baro'] : null,
            'speed_kts' => is_numeric($item['gs'] ?? null) ? round((float) $item['gs']) : null,
            'heading' => is_numeric($item['track'] ?? null) ? round((float) $item['track']) : null,
            'seen_seconds' => round($seen, 1),
            'position_at' => now()->subSeconds((int) $seen)->toIso8601String(),
            'last_position' => $lastPosition,
            'source' => $item['_source'] ?? null,
        ];
    }
}
