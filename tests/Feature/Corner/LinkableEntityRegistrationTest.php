<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use App\Shell\Services\LinkableEntities;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

class LinkableEntityRegistrationTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    private const LEGACY = ['corner.activity', 'corner.movie', 'corner.place', 'corner.song'];

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_corner_registers_its_item_type_and_the_four_old_types(): void
    {
        $types = app(LinkableEntities::class)->registeredTypes();
        sort($types);

        $this->assertSame(
            ['corner.activity', 'corner.item', 'corner.movie', 'corner.place', 'corner.song', 'history.event'],
            $types,
        );
    }

    public function test_searching_everything_finds_items_and_moments_but_never_an_old_type(): void
    {
        $songs = $this->songs();
        $this->itemIn($songs, $this->user, ['title' => 'Sydney summer', 'legacy_type' => 'corner.song', 'legacy_id' => 1]);
        $this->itemIn($this->places(), $this->user, ['title' => 'Sydney harbour']);
        Event::factory()->create(['title' => 'Sydney trip']);

        $results = app(LinkableEntities::class)->search('Sydney', [], 20);
        $types = array_values(array_unique(array_column($results, 'type')));
        sort($types);

        $this->assertSame(['corner.item', 'history.event'], $types);
        $this->assertCount(3, $results);
    }

    #[DataProvider('legacyTypes')]
    public function test_an_old_type_lists_nothing(string $type): void
    {
        $this->itemIn($this->songs(), $this->user, ['title' => 'Sydney', 'legacy_type' => $type, 'legacy_id' => 1]);

        $this->assertSame([], app(LinkableEntities::class)->search('Sydney', [$type]));
    }

    /** @return array<string, array{0: string}> */
    public static function legacyTypes(): array
    {
        return array_combine(self::LEGACY, array_map(fn (string $t): array => [$t], self::LEGACY));
    }

    public function test_an_item_result_names_its_list_and_links_to_the_item(): void
    {
        $songs = $this->songs();
        $song = $this->itemIn($songs, $this->user, ['title' => 'Late night drive']);
        $book = $this->itemIn(
            CornerList::factory()->create(['name' => 'Books we love', 'slug' => 'books']),
            $this->user,
            ['title' => 'Late night reading'],
        );

        $results = collect(app(LinkableEntities::class)->search('Late night', ['corner.item']))->keyBy('id');

        $this->assertSame('corner.item', $results[$song->id]['type']);
        $this->assertSame('Songs', $results[$song->id]['group']);
        $this->assertSame($song->pictureUrl(), $results[$song->id]['thumbnail_url']);
        $this->assertSame('music', $results[$song->id]['icon']);
        $this->assertNull($results[$book->id]['thumbnail_url']);
        $this->assertSame('bookmark', $results[$book->id]['icon']);
        $this->assertSame(route('apps.our-corner.items.show', ['songs', $song->id]), $results[$song->id]['deep_link_url']);
        $this->assertSame('Books we love', $results[$book->id]['group']);
        $this->assertSame(url("/apps/our-corner/books/{$book->id}"), $results[$book->id]['deep_link_url']);
    }

    public function test_item_search_is_newest_first_and_capped(): void
    {
        $list = CornerList::factory()->create();
        Item::factory()->count(25)->sequence(fn ($s) => ['added_at' => now()->subMinutes($s->index), 'title' => "Match {$s->index}"])
            ->create(['list_id' => $list->id, 'added_by_user_id' => $this->user->id]);

        $results = app(LinkableEntities::class)->search('match', ['corner.item'], 50);

        $this->assertCount(20, $results);
        $this->assertSame('Match 0', $results[0]['title']);
    }

    public function test_history_event_search_includes_events(): void
    {
        Event::factory()->create(['title' => 'Anniversary dinner']);

        $results = app(LinkableEntities::class)->search('Anniversary', ['history.event']);

        $this->assertNotEmpty($results);
        $this->assertSame('history.event', $results[0]['type']);
    }

    public function test_an_item_resolves_by_its_id(): void
    {
        $song = $this->itemIn($this->songs(), $this->user);

        $snapshot = app(LinkableEntities::class)->resolve('corner.item', $song->id);

        $this->assertSame([
            'title' => $song->title,
            'thumbnail_url' => $song->pictureUrl(),
            'icon' => 'music',
            'deep_link_url' => url("/apps/our-corner/songs/{$song->id}"),
        ], $snapshot);
    }

    public function test_an_old_type_resolves_by_the_old_id_to_the_item_now(): void
    {
        $songs = $this->songs();
        $movies = $this->movies();
        $song = $this->itemIn($songs, $this->user, ['legacy_type' => 'corner.song', 'legacy_id' => 5]);
        $movie = $this->itemIn($movies, $this->user, ['legacy_type' => 'corner.movie', 'legacy_id' => 5]);
        $linkable = app(LinkableEntities::class);

        $this->assertSame(url("/apps/our-corner/songs/{$song->id}"), $linkable->resolve('corner.song', 5)['deep_link_url']);
        $this->assertSame($movie->title, $linkable->resolve('corner.movie', 5)['title']);
        $this->assertNull($linkable->resolve('corner.place', 5));
        // An item's new id is not an old id.
        $this->assertNull($linkable->resolve('corner.song', $song->id));
        $this->assertNull($linkable->resolve('corner.item', 5));

        $many = $linkable->resolveMany('corner.song', [5, 6]);
        $this->assertSame([5], array_keys($many));
        $this->assertSame($song->title, $many[5]['title']);
    }

    public function test_resolve_returns_null_for_a_deleted_item(): void
    {
        $item = $this->itemIn($this->songs(), $this->user, ['legacy_type' => 'corner.song', 'legacy_id' => 9]);
        $id = $item->id;
        $item->delete();

        $this->assertNull(app(LinkableEntities::class)->resolve('corner.item', $id));
        $this->assertNull(app(LinkableEntities::class)->resolve('corner.song', 9));
    }

    public function test_resolve_history_event_returns_snapshot(): void
    {
        $event = Event::factory()->create(['title' => 'Wedding day']);

        $snapshot = app(LinkableEntities::class)->resolve('history.event', $event->id);

        $this->assertIsArray($snapshot);
        $this->assertSame("/apps/our-history?moment={$event->id}", $snapshot['deep_link_url']);
    }

    // The picker endpoint

    public function test_the_picker_returns_items_with_their_list_and_no_old_types(): void
    {
        $this->itemIn($this->songs(), $this->user, ['title' => 'Sydney summer', 'legacy_type' => 'corner.song', 'legacy_id' => 1]);
        $this->itemIn($this->places(), $this->user, ['title' => 'Sydney harbour', 'legacy_type' => 'corner.place', 'legacy_id' => 1]);

        $results = $this->actingAs($this->user)
            ->getJson('/api/linkable/search?q=Sydney')
            ->assertOk()
            ->assertJsonStructure(['results' => [['type', 'id', 'title', 'group', 'thumbnail_url', 'deep_link_url']]])
            ->json('results');

        $this->assertSame(['corner.item', 'corner.item'], array_column($results, 'type'));
        $this->assertEqualsCanonicalizing(['Songs', 'Places'], array_column($results, 'group'));
    }

    public function test_the_picker_filters_by_type(): void
    {
        $this->itemIn($this->songs(), $this->user, ['title' => 'Sydney summer']);
        Event::factory()->create(['title' => 'Sydney trip']);

        $items = $this->actingAs($this->user)->getJson('/api/linkable/search?q=Sydney&types[]=corner.item')->assertOk()->json('results');
        $this->assertSame(['corner.item'], array_column($items, 'type'));

        $events = $this->actingAs($this->user)->getJson('/api/linkable/search?q=Sydney&types[]=history.event')->assertOk()->json('results');
        $this->assertSame(['history.event'], array_column($events, 'type'));

        // An old type is accepted (it is registered) but lists nothing.
        $this->actingAs($this->user)->getJson('/api/linkable/search?q=Sydney&types[]=corner.song')->assertOk()->assertExactJson(['results' => []]);
    }

    public function test_picker_search_rejects_short_q(): void
    {
        $this->actingAs($this->user)->getJson('/api/linkable/search?q=a')->assertStatus(422);
    }

    public function test_picker_search_rejects_q_over_100_chars(): void
    {
        $this->actingAs($this->user)->getJson('/api/linkable/search?q='.str_repeat('a', 101))->assertStatus(422);
    }

    public function test_picker_search_rejects_unknown_types(): void
    {
        $this->actingAs($this->user)->getJson('/api/linkable/search?q=anything&types[]=fake.type')->assertStatus(422);
    }

    public function test_picker_search_requires_auth(): void
    {
        $this->assertContains($this->get('/api/linkable/search?q=anything')->getStatusCode(), [302, 401]);
    }

    public function test_picker_search_rate_limited(): void
    {
        RateLimiter::clear('linkable-picker:'.$this->user->id);

        // 30/min/user: the 31st request must hit 429.
        $hit429 = false;
        for ($i = 0; $i < 31; $i++) {
            if ($this->actingAs($this->user)->getJson('/api/linkable/search?q=ab')->getStatusCode() === 429) {
                $hit429 = true;
                break;
            }
        }

        $this->assertTrue($hit429, 'Expected a 429 within 31 rapid requests under throttle:linkable-picker.');
    }
}
