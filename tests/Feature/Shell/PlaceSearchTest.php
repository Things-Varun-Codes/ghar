<?php

namespace Tests\Feature\Shell;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PlaceSearchTest extends TestCase
{
    use RefreshDatabase;

    private function photon(): void
    {
        Http::fake(['photon.komoot.io/*' => Http::response(['features' => [
            [
                'geometry' => ['coordinates' => [77.5933, 12.9763]],
                'properties' => ['osm_type' => 'W', 'osm_id' => 24418436, 'name' => 'Cubbon Park', 'city' => 'Bengaluru', 'state' => 'Karnataka', 'country' => 'India'],
            ],
            [
                'geometry' => ['coordinates' => [77.6, 12.9]],
                'properties' => ['osm_type' => 'N', 'osm_id' => 7, 'housenumber' => '12', 'street' => 'MG Road', 'city' => 'Bengaluru', 'country' => 'India'],
            ],
            [
                'geometry' => ['coordinates' => [77.59, 12.97]],
                'properties' => ['osm_type' => 'R', 'osm_id' => 5, 'name' => 'Cubbon Park', 'city' => 'Bengaluru', 'state' => 'Karnataka', 'country' => 'India'],
            ],
            ['geometry' => ['coordinates' => [1, 2]], 'properties' => ['osm_type' => 'N', 'osm_id' => 8]],
            ['properties' => ['osm_type' => 'N', 'osm_id' => 9, 'name' => 'No coordinates']],
        ]])]);
    }

    public function test_it_returns_places_from_photon(): void
    {
        $this->photon();

        $this->actingAs(User::factory()->create())
            ->getJson('/api/places/search?q=cubbon')
            ->assertOk()
            ->assertExactJson(['results' => [
                ['place_id' => 'osm:W24418436', 'name' => 'Cubbon Park', 'address' => 'Bengaluru, Karnataka, India', 'lat' => 12.9763, 'lng' => 77.5933],
                ['place_id' => 'osm:N7', 'name' => '12 MG Road', 'address' => '12 MG Road, Bengaluru, India', 'lat' => 12.9, 'lng' => 77.6],
            ]]);

        Http::assertSent(fn (Request $request): bool => $request['q'] === 'cubbon');
    }

    public function test_the_same_search_is_asked_once(): void
    {
        $this->photon();
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/places/search?q=cubbon')->assertOk();
        $this->actingAs($user)->getJson('/api/places/search?q=Cubbon')->assertOk();

        Http::assertSentCount(1);
    }

    public function test_a_failing_photon_gives_no_places_rather_than_an_error(): void
    {
        Http::fake(['photon.komoot.io/*' => Http::response('down', 503)]);

        $this->actingAs(User::factory()->create())
            ->getJson('/api/places/search?q=cubbon')
            ->assertOk()
            ->assertExactJson(['results' => []]);
    }

    public function test_an_empty_photon_url_means_the_public_photon(): void
    {
        $_SERVER['PHOTON_URL'] = $_ENV['PHOTON_URL'] = '';

        try {
            $services = require base_path('config/services.php');
        } finally {
            unset($_SERVER['PHOTON_URL'], $_ENV['PHOTON_URL']);
        }

        $this->assertSame('https://photon.komoot.io', $services['photon']['url']);
    }

    public function test_guests_cannot_search(): void
    {
        Http::fake();

        $this->getJson('/api/places/search?q=cubbon')->assertUnauthorized();
        Http::assertNothingSent();
    }

    public function test_a_query_is_required(): void
    {
        $this->actingAs(User::factory()->create())
            ->getJson('/api/places/search?q=c')
            ->assertUnprocessable();
    }
}
