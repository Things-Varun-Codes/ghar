<?php

namespace Tests\Feature\Shell;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MapTilesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
    }

    public function test_the_style_comes_back_pointing_at_this_app(): void
    {
        Http::fake(['tiles.openfreemap.org/styles/positron' => Http::response(
            ['sources' => ['openmaptiles' => ['url' => 'https://tiles.openfreemap.org/planet']], 'glyphs' => 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'],
            200,
            ['Content-Type' => 'application/json'],
        )]);

        $response = $this->actingAs(User::factory()->create())->get('/api/map/styles/positron');

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonPath('sources.openmaptiles.url', url('/api/map/planet'))
            ->assertJsonPath('glyphs', url('/api/map/fonts/{fontstack}/{range}.pbf'));
        $this->assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
    }

    public function test_a_tile_passes_through_and_the_browser_keeps_it(): void
    {
        Http::fake(['tiles.openfreemap.org/planet/1/2/3.pbf' => Http::response('tile-bytes', 200, ['Content-Type' => 'application/x-protobuf'])]);

        $this->actingAs(User::factory()->create())
            ->get('/api/map/planet/1/2/3.pbf')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/x-protobuf')
            ->assertHeader('Cache-Control', 'max-age=604800, private')
            ->assertContent('tile-bytes');
    }

    public function test_font_names_with_spaces_reach_the_host_encoded(): void
    {
        Http::fake(['*' => Http::response('glyphs', 200, ['Content-Type' => 'application/x-protobuf'])]);

        $this->actingAs(User::factory()->create())->get('/api/map/fonts/Noto%20Sans%20Regular/0-255.pbf')->assertOk();

        Http::assertSent(fn ($request): bool => $request->url() === 'https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf');
    }

    public function test_a_failing_host_is_left_alone_for_a_minute(): void
    {
        Http::fake(['*' => Http::response('down', 503)]);
        $user = User::factory()->create();

        $this->actingAs($user)->get('/api/map/planet/1/2/3.pbf')->assertStatus(502);
        $this->actingAs($user)->get('/api/map/planet/1/2/4.pbf')->assertStatus(502);

        Http::assertSentCount(1);
    }

    public function test_a_missing_tile_is_a_miss_not_an_outage(): void
    {
        Http::fake(['*' => Http::response('', 404)]);
        $user = User::factory()->create();

        $this->actingAs($user)->get('/api/map/planet/1/2/3.pbf')->assertNotFound()->assertHeader('Cache-Control', 'no-store, private');
        $this->actingAs($user)->get('/api/map/planet/1/2/4.pbf')->assertNotFound();

        Http::assertSentCount(2);
    }

    public function test_paths_cannot_climb_out(): void
    {
        Http::fake();

        $this->actingAs(User::factory()->create())->get('/api/map/planet/../../etc')->assertNotFound();

        Http::assertNothingSent();
    }

    public function test_guests_get_nothing(): void
    {
        Http::fake();

        $this->get('/api/map/styles/positron')->assertUnauthorized();

        Http::assertNothingSent();
    }
}
