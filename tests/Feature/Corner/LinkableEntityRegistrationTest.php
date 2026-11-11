<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Activity;
use App\MiniApps\Corner\Models\Movie;
use App\MiniApps\Corner\Models\Place;
use App\MiniApps\Corner\Models\Song;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use App\Shell\Services\LinkableEntities;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class LinkableEntityRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_5_entity_types_registered(): void
    {
        // Seed one row per type so search('') returns at least one item from each.
        Song::factory()->create();
        Movie::factory()->create();
        Activity::factory()->create();
        Place::factory()->create();
        Event::factory()->create(['title' => 'Anchor event']);

        $linkable = app(LinkableEntities::class);

        $types = $linkable->registeredTypes();
        sort($types);
        $this->assertSame(
            ['corner.activity', 'corner.movie', 'corner.place', 'corner.song', 'history.event'],
            $types,
            'Expected the 5 entity types to be registered by provider boot.',
        );

        // search('') across all registered types returns rows of multiple types.
        $results = $linkable->search('', [], 20);
        $resultTypes = array_unique(array_column($results, 'type'));
        sort($resultTypes);

        // Every type seeded should appear in the result set.
        $this->assertSame(
            ['corner.activity', 'corner.movie', 'corner.place', 'corner.song', 'history.event'],
            $resultTypes,
        );
    }

    public function test_corner_song_search_returns_only_songs(): void
    {
        // Songs match on title — fixture row title contains "Sydney".
        Song::factory()->create(['title' => 'Sydney summer playlist']);
        Movie::factory()->create(['title' => 'Sydney harbour']); // would match if type filter were ignored
        Event::factory()->create(['title' => 'Sydney trip']);

        $linkable = app(LinkableEntities::class);
        $results = $linkable->search('Sydney', ['corner.song']);

        $this->assertNotEmpty($results);
        foreach ($results as $row) {
            $this->assertSame('corner.song', $row['type']);
        }
    }

    public function test_history_event_search_includes_events(): void
    {
        Event::factory()->create(['title' => 'Anniversary dinner']);

        $linkable = app(LinkableEntities::class);
        $results = $linkable->search('Anniversary', ['history.event']);

        $this->assertNotEmpty($results);
        $this->assertSame('history.event', $results[0]['type']);
    }

    public function test_resolve_corner_song_returns_snapshot(): void
    {
        $song = Song::factory()->create();

        $linkable = app(LinkableEntities::class);
        $snapshot = $linkable->resolve('corner.song', $song->id);

        $this->assertIsArray($snapshot);
        $this->assertArrayHasKey('title', $snapshot);
        $this->assertArrayHasKey('thumbnail_url', $snapshot);
        $this->assertArrayHasKey('deep_link_url', $snapshot);

        // deep_link_url maps to the songs.show route — verifies CornerServiceProvider
        // builds the correct named-route URL.
        $this->assertStringContainsString("/apps/our-corner/songs/{$song->id}", $snapshot['deep_link_url']);
    }

    public function test_resolve_history_event_returns_snapshot(): void
    {
        $event = Event::factory()->create(['title' => 'Wedding day']);

        $linkable = app(LinkableEntities::class);
        $snapshot = $linkable->resolve('history.event', $event->id);

        $this->assertIsArray($snapshot);
        $this->assertArrayHasKey('title', $snapshot);
        $this->assertArrayHasKey('deep_link_url', $snapshot);
        $this->assertSame("/apps/our-history#event-{$event->id}", $snapshot['deep_link_url']);
    }

    public function test_resolve_returns_null_for_deleted_entity(): void
    {
        $song = Song::factory()->create();
        $songId = $song->id;
        $song->delete();

        $linkable = app(LinkableEntities::class);
        $snapshot = $linkable->resolve('corner.song', $songId);

        $this->assertNull($snapshot, 'Resolve must return null for a deleted entity.');
    }

    public function test_search_caps_at_limit(): void
    {
        Song::factory()->count(30)->create();

        $linkable = app(LinkableEntities::class);
        $results = $linkable->search('', ['corner.song'], 5);

        $this->assertCount(5, $results);
    }

    public function test_registered_types_after_boot_returns_5(): void
    {
        $linkable = app(LinkableEntities::class);
        $types = $linkable->registeredTypes();
        sort($types);

        $this->assertSame(
            ['corner.activity', 'corner.movie', 'corner.place', 'corner.song', 'history.event'],
            $types,
        );
    }

    public function test_picker_search_returns_results(): void
    {
        Song::factory()->create(['title' => 'Sydney summer']);
        Place::factory()->create(['title' => 'Sydney harbour']);

        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/linkable/search?q=Sydney');

        $response->assertOk();
        $response->assertJsonStructure(['results']);
        $results = $response->json('results');
        $this->assertNotEmpty($results);
    }

    public function test_picker_search_with_types_filter(): void
    {
        Song::factory()->create(['title' => 'Sydney summer']);
        Place::factory()->create(['title' => 'Sydney harbour']);
        Movie::factory()->create(['title' => 'Sydney film']);
        Event::factory()->create(['title' => 'Sydney trip']);

        $user = User::factory()->create();
        $response = $this->actingAs($user)
            ->getJson('/api/linkable/search?q=Sydney&types[]=corner.song&types[]=corner.place');

        $response->assertOk();
        $results = $response->json('results');
        $this->assertNotEmpty($results);
        foreach ($results as $row) {
            $this->assertContains($row['type'], ['corner.song', 'corner.place']);
        }
    }

    public function test_picker_search_rejects_short_q(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->getJson('/api/linkable/search?q=a');
        $response->assertStatus(422);
    }

    public function test_picker_search_rejects_q_over_100_chars(): void
    {
        $user = User::factory()->create();
        $q = str_repeat('a', 101);
        $response = $this->actingAs($user)->getJson('/api/linkable/search?q='.$q);
        $response->assertStatus(422);
    }

    public function test_picker_search_rejects_unknown_types(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)
            ->getJson('/api/linkable/search?q=anything&types[]=fake.type');
        $response->assertStatus(422);
    }

    public function test_picker_search_requires_auth(): void
    {
        $response = $this->get('/api/linkable/search?q=anything');
        $this->assertContains($response->getStatusCode(), [302, 401]);
    }

    public function test_picker_search_results_carry_deep_link_url(): void
    {
        $song = Song::factory()->create(['title' => 'Late night drive']);

        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson(
            '/api/linkable/search?q='.urlencode('Late night drive').'&types[]=corner.song',
        );

        $response->assertOk();
        $results = $response->json('results');
        $this->assertNotEmpty($results);
        $this->assertArrayHasKey('deep_link_url', $results[0]);
        $this->assertSame(
            route('apps.our-corner.songs.show', $song),
            $results[0]['deep_link_url'],
        );
    }

    public function test_picker_search_rate_limited(): void
    {
        $user = User::factory()->create();

        // Clear any prior limiter state to make the assertion deterministic.
        RateLimiter::clear('linkable-picker:'.$user->id);

        // 30/min/user — the 31st request must hit 429.
        $hit429 = false;
        for ($i = 0; $i < 31; $i++) {
            $response = $this->actingAs($user)->getJson('/api/linkable/search?q=ab');
            if ($response->getStatusCode() === 429) {
                $hit429 = true;
                break;
            }
        }

        $this->assertTrue($hit429, 'Expected at least one 429 within 31 rapid requests under throttle:linkable-picker.');
    }
}
