<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SecurityRegressionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.supabase.url' => 'https://example.supabase.co',
            'services.supabase.anon_key' => 'anon-test-key',
            'services.supabase.service_role_key' => 'service-test-key',
        ]);
    }

    public function test_home_renders_supabase_configuration_from_config(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('"https:\\/\\/example.supabase.co"', false)
            ->assertSee('"anon-test-key"', false);
    }

    public function test_master_cannot_promote_a_profile_to_super_user(): void
    {
        Http::fake(function (Request $request) {
            if (str_ends_with($request->url(), '/auth/v1/user')) {
                return Http::response(['id' => 'master-id']);
            }

            if (str_contains($request->url(), 'id=eq.master-id')) {
                return Http::response([['ruolo' => 'master']]);
            }

            if (str_contains($request->url(), 'id=eq.target-id')) {
                return Http::response([[
                    'id' => 'target-id',
                    'nome' => 'Mario',
                    'cognome' => 'Rossi',
                    'ruolo' => 'segreteria',
                    'associazione' => 'ODV Test',
                ]]);
            }

            return Http::response([], 500);
        });

        $this->withToken('master-token')
            ->patchJson('/api/admin/profiles/target-id', ['ruolo' => 'super_user'])
            ->assertForbidden()
            ->assertJson(['message' => 'Non autorizzato a gestire utenti SuperUser.']);

        Http::assertNotSent(fn (Request $request) => $request->method() === 'PATCH');
    }

    public function test_partial_profile_update_preserves_omitted_surname(): void
    {
        Http::fake(function (Request $request) {
            if (str_ends_with($request->url(), '/auth/v1/user')) {
                return Http::response(['id' => 'super-id']);
            }

            if (str_contains($request->url(), 'id=eq.super-id')) {
                return Http::response([['ruolo' => 'super_user']]);
            }

            if ($request->method() === 'PATCH') {
                return Http::response([[
                    'id' => 'target-id',
                    'nome' => 'Luigi',
                    'cognome' => 'Rossi',
                    'ruolo' => 'master',
                ]]);
            }

            if (str_contains($request->url(), 'id=eq.target-id')) {
                return Http::response([[
                    'id' => 'target-id',
                    'email' => 'mario@example.test',
                    'nome' => 'Mario',
                    'cognome' => 'Rossi',
                    'ruolo' => 'master',
                    'associazione' => null,
                    'created_at' => '2026-01-01T00:00:00Z',
                ]]);
            }

            return Http::response([], 500);
        });

        $this->withToken('super-token')
            ->patchJson('/api/admin/profiles/target-id', ['nome' => 'Luigi'])
            ->assertOk();

        Http::assertSent(fn (Request $request) => $request->method() === 'PATCH'
            && $request['nome'] === 'Luigi'
            && $request['cognome'] === 'Rossi');
    }

    public function test_profile_service_failure_is_not_reported_as_forbidden(): void
    {
        Http::fake([
            '*/auth/v1/user' => Http::response(['id' => 'user-id']),
            '*/rest/v1/profiles*' => Http::response([], 503),
        ]);

        $this->withToken('test-token')
            ->getJson('/api/admin/associazioni')
            ->assertStatus(502)
            ->assertJson(['message' => 'Impossibile verificare il profilo utente.']);
    }

    public function test_invalid_squad_availability_date_returns_validation_error(): void
    {
        $response = $this->postJson('/squadre-aib/pdf', [
            'squadra' => [
                'id' => 'squad-id',
                'nome' => 'Squadra Test',
                'disponibile_dal' => 'not-a-date',
            ],
            'equipaggio' => [],
        ]);

        self::assertSame(422, $response->getStatusCode());
    }

    public function test_squad_pdf_accepts_supabase_time_with_seconds(): void
    {
        $response = $this->postJson('/squadre-aib/pdf', [
            'delivery' => 'download',
            'squadra' => [
                'id' => 'squad-id',
                'nome' => 'Squadra Test',
                'disponibile_dal' => '2026-08-12T08:00:00+02:00',
                'disponibile_fino' => '18:00:00',
            ],
            'equipaggio' => [[
                'id' => 'volunteer-id',
                'nome' => 'Mario',
                'cognome' => 'Rossi',
            ]],
        ]);

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
        self::assertStringStartsWith('%PDF-', $response->getContent());
        self::assertStringContainsString('%%EOF', $response->getContent());
    }
}
