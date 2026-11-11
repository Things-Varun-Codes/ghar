<?php

namespace Tests\Feature\Security;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class GoogleMapsKeyTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_configured_key_reaches_the_client_and_opens_the_csp(): void
    {
        config()->set('services.google_maps.key', 'public-key');

        $response = $this->actingAs(User::factory()->create())->get('/dashboard');

        $response->assertInertia(fn (AssertableInertia $page) => $page->where('googleMapsApiKey', 'public-key'));
        $this->assertStringContainsString('https://*.googleapis.com', $response->headers->get('Content-Security-Policy'));
    }

    public function test_no_key_stays_off_the_client_and_the_csp(): void
    {
        config()->set('services.google_maps.key', null);

        $response = $this->actingAs(User::factory()->create())->get('/dashboard');

        $response->assertInertia(fn (AssertableInertia $page) => $page->where('googleMapsApiKey', null));
        $this->assertStringNotContainsString('*.googleapis.com', $response->headers->get('Content-Security-Policy'));
    }

    public function test_guests_do_not_receive_the_key(): void
    {
        config()->set('services.google_maps.key', 'public-key');

        $this->get('/login')->assertInertia(fn (AssertableInertia $page) => $page->where('googleMapsApiKey', null));
    }
}
