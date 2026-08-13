<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ArgoXRadioTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        config([
            'services.supabase.url' => 'https://example.supabase.co',
            'services.supabase.anon_key' => 'anon-test-key',
            'services.argo_x.url' => 'https://argo.test',
            'services.argo_x.username' => 'operator',
            'services.argo_x.password' => 'secret-password',
        ]);
    }

    public function test_radio_positions_require_an_authenticated_user(): void
    {
        $this->getJson('/api/radios/live')
            ->assertUnauthorized()
            ->assertJson(['message' => 'Token mancante.']);
    }

    public function test_it_logs_in_and_returns_only_normalized_radio_positions(): void
    {
        Http::fake(function (Request $request) {
            if ($request->url() === 'https://example.supabase.co/auth/v1/user') {
                return Http::response(['id' => 'authenticated-user']);
            }

            if ($request->url() === 'https://argo.test/api/login') {
                return Http::response(['redirect' => '/']);
            }

            if ($request->url() === 'https://argo.test/api/radios') {
                return Http::response([
                    [
                        'radio_id' => 101,
                        'alias' => 'Squadra Alfa',
                        'radio_type' => 'mobile',
                        'talkgroup' => 12,
                        'lat' => 40.845,
                        'lon' => 14.376,
                        'gps_timestamp' => now()->subMinutes(2)->timestamp,
                        'ars_on' => 1,
                        'was_off' => 0,
                        'last_ars' => now()->subMinutes(3)->timestamp,
                    ],
                    [
                        'radio_id' => 102,
                        'alias' => 'Sede',
                        'lat' => null,
                        'lon' => null,
                        'fixed_lat' => 40.84,
                        'fixed_lon' => 14.38,
                        'received_at' => now()->subDay()->timestamp,
                        'last_check' => now()->subDays(2)->timestamp,
                        'last_check_ok' => 0,
                    ],
                    ['radio_id' => 103, 'alias' => 'Senza GPS'],
                ]);
            }

            return Http::response([], 404);
        });

        $this->withToken('supabase-session-token')
            ->getJson('/api/radios/live')
            ->assertOk()
            ->assertJsonPath('total', 3)
            ->assertJsonPath('with_position', 2)
            ->assertJsonPath('online', 2)
            ->assertJsonCount(2, 'radios')
            ->assertJsonPath('radios.0.id', '101')
            ->assertJsonPath('radios.0.recent', true)
            ->assertJsonPath('radios.0.online', true)
            ->assertJsonPath('radios.0.status', 'Posizione recente')
            ->assertJsonPath('radios.1.status', 'Postazione fissa')
            ->assertJsonPath('radios.1.fixed_position', true)
            ->assertJsonMissing(['password' => 'secret-password']);

        Http::assertSent(fn (Request $request): bool => $request->url() === 'https://argo.test/api/login'
            && $request['username'] === 'operator'
            && $request['password'] === 'secret-password');
    }
}
