<?php

namespace Tests\Feature;

use App\Services\ArgoXRadioState;
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
        ]);
    }

    public function test_radio_positions_require_an_authenticated_user(): void
    {
        $this->getJson('/api/radios/live')
            ->assertUnauthorized()
            ->assertJson(['message' => 'Token mancante.']);
    }

    public function test_historical_power_flag_does_not_mark_a_radio_online(): void
    {
        Http::fake(['https://example.supabase.co/auth/v1/user' => Http::response(['id' => 'authenticated-user'])]);

        $state = app(ArgoXRadioState::class);
        $state->handle([
            'tipo' => 'risposta_comando',
            'id' => 'iniziale-test',
            'ok' => true,
            'quando' => now()->timestamp,
            'radio' => [[
                'radio_id' => 101,
                'nome' => 'Squadra Alfa',
                'tipo' => 'mobile',
                'talkgroup' => 12,
                'lat' => 40.845,
                'lon' => 14.376,
                'rilevata_il' => now()->subDays(2)->timestamp,
                'vista_il' => now()->subDays(2)->timestamp,
                'posizione_fissa' => false,
                'accesa' => true,
            ], [
                'radio_id' => 102,
                'nome' => 'Sede',
                'tipo' => 'base',
                'lat' => 40.84,
                'lon' => 14.38,
                'ricevuta_il' => now()->subDay()->timestamp,
                'posizione_fissa' => true,
                'accesa' => false,
            ], ['radio_id' => 103, 'nome' => 'Senza GPS', 'accesa' => false]],
        ]);

        $this->withToken('supabase-session-token')
            ->getJson('/api/radios/live')
            ->assertOk()
            ->assertJsonPath('total', 3)
            ->assertJsonPath('with_position', 2)
            ->assertJsonPath('online', 1)
            ->assertJsonCount(2, 'radios')
            ->assertJsonPath('radios.0.id', '101')
            ->assertJsonPath('radios.0.recent', false)
            ->assertJsonPath('radios.0.online', false)
            ->assertJsonPath('radios.0.status', 'Posizione troppo vecchia: spenta o fuori copertura')
            ->assertJsonPath('radios.1.status', 'Posizione fissa impostata')
            ->assertJsonPath('radios.1.fixed_position', true);
    }

    public function test_live_events_update_the_radio_power_state(): void
    {
        $state = app(ArgoXRadioState::class);
        $state->handle([
            'tipo' => 'risposta_comando',
            'ok' => true,
            'quando' => now()->timestamp,
            'radio' => [[
                'radio_id' => 101,
                'nome' => 'COR10',
                'tipo' => 'portable',
                'lat' => 40.845,
                'lon' => 14.376,
                'posizione_fissa' => false,
                'accesa' => true,
            ]],
        ]);

        self::assertFalse($state->snapshot()['radios'][0]['online']);

        $state->handle([
            'tipo' => 'ars',
            'ts' => now()->timestamp,
            'dati' => ['radio_id' => 101, 'acceso' => true, 'transizione' => true],
        ]);
        self::assertTrue($state->snapshot()['radios'][0]['online']);

        $state->handle([
            'tipo' => 'presenza',
            'ts' => now()->addSecond()->timestamp,
            'dati' => ['radio_id' => 101, 'present' => false, 'via' => 'xcmp'],
        ]);
        self::assertFalse($state->snapshot()['radios'][0]['online']);
    }

    public function test_newer_position_overrides_an_older_negative_presence_check(): void
    {
        $state = app(ArgoXRadioState::class);
        $state->handle([
            'tipo' => 'risposta_comando',
            'ok' => true,
            'quando' => now()->timestamp,
            'radio' => [[
                'radio_id' => 201,
                'nome' => 'COR10',
                'tipo' => 'portable',
                'lat' => 40.84,
                'lon' => 14.37,
                'ricevuta_il' => now()->subHour()->timestamp,
                'vista_il' => now()->subHour()->timestamp,
                'posizione_fissa' => false,
                'accesa' => false,
            ]],
        ]);
        $state->handle([
            'tipo' => 'presenza',
            'ts' => now()->timestamp,
            'dati' => ['radio_id' => 201, 'present' => false],
        ]);
        self::assertSame('black', $state->snapshot()['radios'][0]['state_color']);

        $state->handle([
            'tipo' => 'posizione',
            'ts' => now()->addSecond()->timestamp,
            'dati' => [
                'radio_id' => 201,
                'lat' => 40.85,
                'lon' => 14.38,
                'rilevata_il' => now()->addSecond()->timestamp,
            ],
        ]);
        self::assertSame('green', $state->snapshot()['radios'][0]['state_color']);
    }
}
