<?php

namespace Tests\Feature\RateLimit;

use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class InviteAcceptRateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        ThrottleRequests::shouldHashKeys(false);
    }

    protected function tearDown(): void
    {
        // Restore hashing to the default (true) so other tests aren't affected.
        ThrottleRequests::shouldHashKeys(true);
        // Clear the rate limiter bucket used by this test.
        RateLimiter::clear('invite-accept:127.0.0.1');
        parent::tearDown();
    }

    public function test_invite_accept_route_has_throttle_middleware(): void
    {
        // Exhaust the invite-accept limiter (60 per minute by IP).  With hashing disabled, the
        // key is "{limiterName}:{ip}".
        for ($i = 0; $i < 60; $i++) {
            RateLimiter::hit('invite-accept:127.0.0.1');
        }

        $response = $this->get(route('invitations.accept.show', ['token' => 'any-token']));

        $response->assertStatus(429);
    }
}
