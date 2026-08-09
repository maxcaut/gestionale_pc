<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CanadairLiveTest extends TestCase
{
    public function test_it_returns_only_airborne_aircraft_from_the_italian_fleet(): void
    {
        Cache::flush();
        Http::fake([
            'api.adsb.lol/*' => Http::response(['ac' => [
                ['r' => 'I-DPCD', 'lat' => 41.1, 'lon' => 14.2, 'alt_baro' => 2200, 'gs' => 145.4, 'track' => 93.2, 'seen_pos' => 0.4],
                ['r' => 'I-DPCE', 'alt_baro' => 1800],
                ['r' => 'F-ZBMA', 'lat' => 43.0, 'lon' => 5.0, 'alt_baro' => 1800],
                ['r' => 'I-DPCN', 'lat' => 37.7, 'lon' => 15.0, 'alt_baro' => 1000],
            ]]),
            'api.airplanes.live/*' => Http::response(['ac' => []]),
            'opendata.adsb.fi/*' => Http::response(['ac' => []]),
        ]);

        $this->getJson('/api/canadair/live')
            ->assertOk()
            ->assertJsonPath('fleet_size', 18)
            ->assertJsonPath('detected', 2)
            ->assertJsonPath('without_position.0', 'I-DPCE')
            ->assertJsonCount(1, 'without_position')
            ->assertJsonCount(1, 'aircraft')
            ->assertJsonPath('aircraft.0.registration', 'I-DPCD')
            ->assertJsonPath('aircraft.0.speed_kts', 145);
    }
}
