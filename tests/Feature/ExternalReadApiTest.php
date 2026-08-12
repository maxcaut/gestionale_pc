<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ExternalReadApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.supabase.url' => 'https://example.supabase.co',
            'services.supabase.anon_key' => 'publishable-test-key',
            'services.supabase.service_role_key' => 'service-test-key',
            'external_read_api.token_lifetime_minutes' => 30,
        ]);
    }

    public function test_any_valid_supabase_auth_user_can_receive_a_read_token(): void
    {
        Http::fake([
            '*/auth/v1/token?grant_type=password' => Http::response([
                'access_token' => 'supabase-token-that-must-not-leak',
                'user' => [
                    'id' => '09d57852-72d1-4d14-aa45-9df58eaf850d',
                    'email' => 'utente@example.test',
                ],
            ]),
        ]);

        $response = $this->postJson('/api/external/login', [
            'email' => 'utente@example.test',
            'password' => 'password-corretta',
        ]);

        $response->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonMissing(['access_token' => 'supabase-token-that-must-not-leak']);

        self::assertNotSame('supabase-token-that-must-not-leak', $response->json('token'));
        Http::assertSent(fn (Request $request) => $request->hasHeader('apikey', 'publishable-test-key'));
    }

    public function test_invalid_supabase_credentials_are_rejected(): void
    {
        Http::fake([
            '*/auth/v1/token?grant_type=password' => Http::response(['error' => 'invalid_grant'], 400),
        ]);

        $this->postJson('/api/external/login', [
            'email' => 'utente@example.test',
            'password' => 'password-errata',
        ])->assertUnauthorized();
    }

    public function test_read_token_can_only_read_an_allowlisted_resource(): void
    {
        Http::fake([
            '*/rest/v1/servizi*' => Http::response([['id' => 'servizio-1']], 200, [
                'Content-Range' => '0-0/1',
            ]),
        ]);

        $token = $this->readToken();

        $this->withToken($token)
            ->getJson('/api/external/data/servizi?limit=25&offset=0')
            ->assertOk()
            ->assertJsonPath('data.0.id', 'servizio-1')
            ->assertJsonPath('limit', 25);

        Http::assertSent(fn (Request $request) => $request->method() === 'GET'
            && $request->hasHeader('Authorization', 'Bearer service-test-key'));

        $this->withToken($token)
            ->getJson('/api/external/data/auth_users')
            ->assertNotFound();
    }

    public function test_external_data_api_exposes_no_write_route(): void
    {
        $token = $this->readToken();

        $this->withToken($token)
            ->postJson('/api/external/data/servizi', ['stato' => 'test'])
            ->assertMethodNotAllowed();

        Http::assertNothingSent();
    }

    public function test_expired_read_token_is_rejected(): void
    {
        $token = Crypt::encryptString(json_encode([
            'aud' => 'external-read-api',
            'sub' => 'user-id',
            'exp' => now()->subMinute()->getTimestamp(),
        ], JSON_THROW_ON_ERROR));

        $this->withToken($token)
            ->getJson('/api/external/data/servizi')
            ->assertUnauthorized();
    }

    private function readToken(): string
    {
        return Crypt::encryptString(json_encode([
            'aud' => 'external-read-api',
            'sub' => 'user-id',
            'email' => 'utente@example.test',
            'exp' => now()->addMinutes(30)->getTimestamp(),
        ], JSON_THROW_ON_ERROR));
    }
}
