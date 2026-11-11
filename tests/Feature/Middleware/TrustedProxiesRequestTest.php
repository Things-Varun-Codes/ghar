<?php

namespace Tests\Feature\Middleware;

use App\Shell\Support\TrustedProxies;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class TrustedProxiesRequestTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Route::get('/__test/client-ip', fn () => response()->json([
            'ip' => request()->ip(),
            'secure' => request()->isSecure(),
        ]));
    }

    public function test_a_proxy_on_the_docker_network_is_believed(): void
    {
        config(['trustedproxy.proxies' => TrustedProxies::parse('private')]);

        $this->withServerVariables(['REMOTE_ADDR' => '172.18.0.5'])
            ->withHeaders(['X-Forwarded-For' => '198.51.100.20', 'X-Forwarded-Proto' => 'https'])
            ->getJson('/__test/client-ip')
            ->assertJson(['ip' => '198.51.100.20', 'secure' => true]);
    }

    public function test_a_direct_client_cannot_spoof_its_address(): void
    {
        config(['trustedproxy.proxies' => TrustedProxies::parse('private')]);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.9'])
            ->withHeaders(['X-Forwarded-For' => '198.51.100.20'])
            ->getJson('/__test/client-ip')
            ->assertJson(['ip' => '203.0.113.9']);
    }

    public function test_cloudflare_mode_trusts_the_edge(): void
    {
        config(['trustedproxy.proxies' => TrustedProxies::parse('cloudflare')]);

        $this->withServerVariables(['REMOTE_ADDR' => '173.245.48.1'])
            ->withHeaders(['X-Forwarded-For' => '198.51.100.20'])
            ->getJson('/__test/client-ip')
            ->assertJson(['ip' => '198.51.100.20']);
    }
}
