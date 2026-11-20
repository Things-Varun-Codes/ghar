<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\LinkKey;
use App\Shell\Models\User;
use App\Shell\Services\LinkableEntities;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Runs the upgrade over hand-written rows in the four old tables. down() is what builds those
 * tables here, since the test schema is already past the upgrade.
 */
class CornerListsMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const OLD_TABLES = ['corner_songs', 'corner_movies', 'corner_activities', 'corner_places'];

    private User $ravi;

    private User $meera;

    private User $kabir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->migrate('down');

        $this->ravi = User::factory()->create();
        $this->meera = User::factory()->create();
        $this->kabir = User::factory()->create();
    }

    private function migrate(string $direction): void
    {
        $migration = require database_path('migrations/our-shelf/2026_11_16_100000_replace_corner_tables_with_lists_and_items.php');
        // Per-person marks hang off corner_items: they come down before it and go up after it.
        $marks = require database_path('migrations/our-shelf/2026_11_20_100000_add_per_person_done_to_corner_lists.php');

        if ($direction === 'down') {
            $marks->down();
            $migration->down();

            return;
        }

        $migration->up();
        $marks->up();
    }

    /** @return array<string, array<int, array<string, mixed>>> old table => rows, ids with gaps */
    private function oldRows(): array
    {
        $shared = fn (int $id, User $adder, ?User $doneBy, bool $done, string $day): array => [
            'id' => $id,
            'added_by_user_id' => $adder->id,
            'added_at' => "{$day} 08:15:30",
            'done_at' => $done ? "{$day} 21:00:00" : null,
            'done_by_user_id' => $doneBy?->id,
            'created_at' => "{$day} 08:15:31",
            'updated_at' => "{$day} 22:45:00",
        ];

        return [
            'corner_songs' => [
                $shared(3, $this->ravi, $this->meera, true, '2025-01-02') + [
                    'provider' => 'youtube', 'provider_id' => 'dQw4w9WgXcQ', 'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    'title' => 'Rain on the Tin Roof', 'author' => 'The Monsoon Club', 'thumbnail_url' => 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                ],
                $shared(7, $this->meera, null, false, '2025-02-03') + [
                    'provider' => 'spotify', 'provider_id' => '3z8h0TU7ReDPLIbEnYhWZb', 'url' => 'https://open.spotify.com/track/3z8h0TU7ReDPLIbEnYhWZb',
                    'title' => 'Kitchen Radio', 'author' => null, 'thumbnail_url' => 'https://i.scdn.co/image/abc',
                ],
                // Done by someone who has since left: done_by was nulled.
                $shared(12, $this->kabir, null, true, '2025-03-04') + [
                    'provider' => 'unknown', 'provider_id' => 'c0ffee', 'url' => 'https://example.com/song',
                    'title' => 'https://example.com/song', 'author' => null, 'thumbnail_url' => null,
                ],
            ],
            'corner_movies' => [
                $shared(1, $this->meera, null, false, '2025-04-05') + [
                    'title' => 'The Man from Earth', 'poster_url' => 'https://images.plex.tv/photo?url=x',
                    'plex_url' => 'https://watch.plex.tv/movie/the-man-from-earth',
                ],
                $shared(20, $this->kabir, $this->ravi, true, '2025-05-06') + [
                    'title' => 'Robot Uncle', 'poster_url' => null, 'plex_url' => null,
                ],
            ],
            'corner_activities' => [
                $shared(5, $this->ravi, null, false, '2025-06-07') + ['title' => 'Teach Kabir to make dal', 'notes' => "Start with the pressure cooker.\nThen the tadka."],
                $shared(6, $this->meera, $this->kabir, true, '2025-07-08') + ['title' => 'Board game night', 'notes' => null],
            ],
            'corner_places' => [
                $shared(2, $this->kabir, null, false, '2025-08-09') + [
                    'title' => 'Blue Door Cafe', 'place_id' => 'ChIJ3S-JXmauEmsRUcIaWtf4MzE',
                    'lat' => '-33.8567844', 'lng' => '151.2152967', 'address' => '12 Fort Road, Kochi',
                ],
                $shared(40, $this->ravi, $this->meera, true, '2025-09-10') + [
                    'title' => 'The bakery on 4th Cross', 'place_id' => null, 'lat' => null, 'lng' => null, 'address' => null,
                ],
            ],
        ];
    }

    /** Old column => new column, per old table. */
    private const COLUMNS = [
        'corner_songs' => [
            'title' => 'title', 'url' => 'url', 'thumbnail_url' => 'image_url', 'author' => 'author',
        ],
        'corner_movies' => ['title' => 'title', 'plex_url' => 'url', 'poster_url' => 'image_url'],
        'corner_activities' => ['title' => 'title', 'notes' => 'notes'],
        'corner_places' => ['title' => 'title', 'place_id' => 'place_id', 'lat' => 'lat', 'lng' => 'lng', 'address' => 'address'],
    ];

    private const LEGACY_TYPES = [
        'corner_songs' => 'corner.song',
        'corner_movies' => 'corner.movie',
        'corner_activities' => 'corner.activity',
        'corner_places' => 'corner.place',
    ];

    private function insertOldRows(): void
    {
        foreach ($this->oldRows() as $table => $rows) {
            DB::table($table)->insert($rows);
        }
    }

    /** @return array<string, list<array<string, mixed>>> */
    private function dumpOldTables(): array
    {
        $dump = [];
        foreach (self::OLD_TABLES as $table) {
            $dump[$table] = DB::table($table)->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
        }

        return $dump;
    }

    public function test_the_old_tables_become_four_lists_and_every_row_moves_with_everything_it_held(): void
    {
        $this->insertOldRows();
        $before = $this->dumpOldTables();

        $this->migrate('up');

        foreach (self::OLD_TABLES as $table) {
            $this->assertFalse(Schema::hasTable($table), "{$table} should be gone");
        }

        $lists = DB::table('corner_lists')->orderBy('position')->get();
        $this->assertSame(
            [
                ['songs', 'Songs', 'music', 'Loved', 'heart', 0],
                ['movies', 'Movies', 'film', 'Watched', 'check', 1],
                ['activities', 'Activities', 'compass', 'Done', 'check', 2],
                ['places', 'Places', 'map-pin', 'Visited', 'check', 3],
            ],
            $lists->map(fn ($l) => [$l->slug, $l->name, $l->icon, $l->done_label, $l->done_icon, (int) $l->position])->all(),
        );
        foreach ($lists as $list) {
            $this->assertNull($list->created_by_user_id);
            $this->assertTrue((bool) $list->notify_on_add);
            $this->assertNotSame('', $list->todo_label);
            $this->assertFalse(property_exists($list, 'kind'));
        }
        $listIds = $lists->pluck('id', 'slug');

        $this->assertSame(9, DB::table('corner_items')->count());
        $maxOldId = 40;
        $this->assertGreaterThan($maxOldId, (int) DB::table('corner_items')->min('id'));

        $slugs = ['corner_songs' => 'songs', 'corner_movies' => 'movies', 'corner_activities' => 'activities', 'corner_places' => 'places'];

        foreach ($before as $table => $rows) {
            foreach ($rows as $old) {
                $new = (array) DB::table('corner_items')
                    ->where('legacy_type', self::LEGACY_TYPES[$table])
                    ->where('legacy_id', $old['id'])
                    ->sole();

                $this->assertSame($listIds[$slugs[$table]], $new['list_id'], "{$table} {$old['id']} list");

                foreach (self::COLUMNS[$table] as $from => $to) {
                    $this->assertSame($old[$from], $new[$to], "{$table} {$old['id']} {$from} -> {$to}");
                }
                foreach (['added_by_user_id', 'added_at', 'done_at', 'done_by_user_id', 'created_at', 'updated_at'] as $column) {
                    $this->assertSame($old[$column], $new[$column], "{$table} {$old['id']} {$column}");
                }

                // A link gets its key and site the way a new one would.
                $filled = [];
                if ($new['url'] !== null) {
                    $this->assertSame(LinkKey::for($new['url']), $new['url_key'], "{$table} {$old['id']} url_key");
                    $this->assertSame(LinkKey::siteOf($new['url']), $new['site_name'], "{$table} {$old['id']} site_name");
                    $filled = ['url_key', 'site_name'];
                }

                // A place's name is also its location's label.
                if ($table === 'corner_places') {
                    $this->assertSame($old['title'], $new['location_label']);
                    $filled[] = 'location_label';
                }

                // What the old table didn't have stays empty.
                $unused = array_diff(
                    ['notes', 'url', 'url_key', 'image_url', 'author', 'site_name', 'location_label', 'location_url', 'place_id', 'lat', 'lng', 'address'],
                    self::COLUMNS[$table],
                    $filled,
                );
                foreach ($unused as $column) {
                    $this->assertNull($new[$column], "{$table} {$old['id']} {$column} should be null");
                }
            }
        }

        // A new item still gets an id above every old one.
        $fresh = Item::factory()->create(['list_id' => $listIds['songs'], 'added_by_user_id' => $this->ravi->id]);
        $this->assertGreaterThan((int) DB::table('corner_items')->where('id', '!=', $fresh->id)->max('id'), $fresh->id);
    }

    public function test_old_links_and_references_find_the_moved_items(): void
    {
        $this->insertOldRows();
        DB::table('entity_references')->insert([
            ['from_type' => 'history.event', 'from_id' => 1, 'to_type' => 'corner.song', 'to_id' => 3, 'created_at' => now()],
            ['from_type' => 'history.event', 'from_id' => 1, 'to_type' => 'corner.place', 'to_id' => 40, 'created_at' => now()],
        ]);

        $this->migrate('up');

        $song = Item::query()->where('legacy_type', 'corner.song')->where('legacy_id', 3)->sole();
        $place = Item::query()->where('legacy_type', 'corner.place')->where('legacy_id', 40)->sole();
        $linkable = app(LinkableEntities::class);

        $this->assertSame(url("/apps/our-shelf/songs/{$song->id}"), $linkable->resolve('corner.song', 3)['deep_link_url']);
        $this->assertSame('The bakery on 4th Cross', $linkable->resolve('corner.place', 40)['title']);

        $this->actingAs($this->meera)
            ->get('/apps/our-shelf/songs/3')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('MiniApps/Corner/Pages/Item')
                ->where('item.id', $song->id)
                ->where('item.title', 'Rain on the Tin Roof')
                ->where('item.is_done', true)
                ->has('mentioned_in', 1));

        $this->actingAs($this->meera)
            ->get('/apps/our-shelf/places/40')
            ->assertInertia(fn (AssertableInertia $page) => $page->where('item.id', $place->id));

        $this->actingAs($this->meera)
            ->get('/apps/our-shelf')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('lists', 4)
                ->where('lists.0.count', 3)
                ->where('lists.0.done', 2));
    }

    public function test_one_old_table_with_rows_still_brings_all_four_lists(): void
    {
        DB::table('corner_activities')->insert($this->oldRows()['corner_activities']);

        $this->migrate('up');

        $this->assertSame(
            ['songs', 'movies', 'activities', 'places'],
            DB::table('corner_lists')->orderBy('position')->pluck('slug')->all(),
        );
        $this->assertSame(2, DB::table('corner_items')->count());
        $this->assertGreaterThan(6, (int) DB::table('corner_items')->min('id'));
    }

    public function test_empty_old_tables_make_no_lists(): void
    {
        $this->migrate('up');

        $this->assertSame(0, DB::table('corner_lists')->count());
        $this->assertSame(0, DB::table('corner_items')->count());
        foreach (self::OLD_TABLES as $table) {
            $this->assertFalse(Schema::hasTable($table));
        }
    }

    public function test_rolling_back_puts_every_row_back_as_it_was(): void
    {
        $this->insertOldRows();
        $before = $this->dumpOldTables();

        $this->migrate('up');

        // Added after the upgrade: comes back with its new id. A list the household made has
        // nowhere to go.
        $songs = CornerList::query()->where('slug', 'songs')->sole();
        $added = Item::factory()->link()->create([
            'list_id' => $songs->id, 'added_by_user_id' => $this->kabir->id, 'image_url' => null,
        ]);
        $custom = CornerList::factory()->create(['created_by_user_id' => $this->ravi->id]);
        Item::factory()->create(['list_id' => $custom->id, 'added_by_user_id' => $this->ravi->id]);

        $this->migrate('down');

        $this->assertFalse(Schema::hasTable('corner_lists'));
        $this->assertFalse(Schema::hasTable('corner_items'));

        $after = $this->dumpOldTables();
        $addedRow = array_pop($after['corner_songs']);

        // There are no provider columns any more: a song comes back as a "link" keyed by its
        // link key. Everything else is as it was.
        foreach ($before['corner_songs'] as $i => $song) {
            $before['corner_songs'][$i]['provider'] = 'link';
            $before['corner_songs'][$i]['provider_id'] = LinkKey::for($song['url']);
        }
        $this->assertSame($before, $after);

        $this->assertSame($added->id, $addedRow['id']);
        $this->assertSame($added->url, $addedRow['url']);
        $this->assertSame('link', $addedRow['provider']);
        $this->assertSame($added->url_key, $addedRow['provider_id']);

        // The old tables keep counting from where the rows left off.
        $next = DB::table('corner_activities')->insertGetId([
            'title' => 'After rollback', 'added_by_user_id' => $this->ravi->id, 'added_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->assertGreaterThan(6, $next);
    }

    public function test_the_same_link_twice_in_an_old_table_keeps_both_rows_and_only_the_first_gets_the_key(): void
    {
        $rows = $this->oldRows();
        $share = 'https://watch.example.com/movie/shared';
        $rows['corner_movies'][0]['plex_url'] = $share;
        $rows['corner_movies'][1]['plex_url'] = $share;
        // Different provider ids, but the same page once tracking is dropped.
        $rows['corner_songs'][1]['url'] = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=share';
        foreach ($rows as $table => $tableRows) {
            DB::table($table)->insert($tableRows);
        }

        $this->migrate('up');

        foreach (['corner.movie' => [1, 20], 'corner.song' => [3, 7]] as $type => [$first, $second]) {
            $a = Item::query()->where('legacy_type', $type)->where('legacy_id', $first)->sole();
            $b = Item::query()->where('legacy_type', $type)->where('legacy_id', $second)->sole();

            $this->assertNotNull($a->url_key, "{$type} {$first}");
            $this->assertSame(LinkKey::for((string) $b->url), $a->url_key);
            $this->assertNull($b->url_key, "{$type} {$second}");
            $this->assertNotNull($b->url);
            $this->assertNotNull($b->site_name);
        }

        // And it still rolls back: the keyless song gets a stand-in id.
        $this->migrate('down');
        $this->assertSame(3, DB::table('corner_songs')->count());
        $this->assertSame(2, DB::table('corner_movies')->where('plex_url', $share)->count());
    }

    public function test_up_then_down_then_up_again_is_stable(): void
    {
        $this->insertOldRows();

        $this->migrate('up');
        $first = DB::table('corner_items')->orderBy('legacy_type')->orderBy('legacy_id')
            ->get(['legacy_type', 'legacy_id', 'title', 'done_at', 'added_by_user_id'])->map(fn ($r) => (array) $r)->all();

        $this->migrate('down');
        $this->migrate('up');

        $this->assertSame($first, DB::table('corner_items')->orderBy('legacy_type')->orderBy('legacy_id')
            ->get(['legacy_type', 'legacy_id', 'title', 'done_at', 'added_by_user_id'])->map(fn ($r) => (array) $r)->all());
    }

    public function test_the_migrations_frozen_link_rules_match_linkkey_today(): void
    {
        $migration = require database_path('migrations/our-shelf/2026_11_16_100000_replace_corner_tables_with_lists_and_items.php');
        $call = fn (string $method, string $url): mixed => (fn () => static::{$method}($url))->bindTo(null, $migration::class)();

        $urls = [
            'http://example.com/a', 'https://example.com/a', 'https://www.Example.COM/A/', 'HTTPS://EXAMPLE.com',
            'https://example.com/a///', 'https://example.com:443/a', 'http://example.com:80/a', 'http://example.com:8080/a',
            'https://example.com/a?b=2&a=1', 'https://example.com/a?utm_source=x&id=7&fbclid=z', 'https://example.com/?si=1&gclid=2',
            'https://example.com/a?x[]=1&x[]=2', 'https://example.com/a?UTM_Medium=m&q=a+b', 'https://example.com/a#frag',
            'https://example.com/a?q=1#frag', 'https://youtu.be/dQw4w9WgXcQ?si=abc', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_campaign=c',
            'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10', '  https://example.com/padded  ', 'https://user:pw@example.com/a',
            'https://münchen.example/ü', 'https://[::1]/a', 'ftp://example.com/a', 'mailto:a@example.com', '//example.com/a',
            'example.com/a', 'not a url', '', '   ', 'http://', 'https:///a', str_repeat('a', 300).'.com',
            'https://'.str_repeat('w', 130).'.com/a',
        ];

        foreach ($urls as $url) {
            $this->assertSame(LinkKey::for($url), $call('linkKey', $url), "key for [{$url}]");
            $this->assertSame(LinkKey::siteOf($url), $call('siteOf', $url), "site for [{$url}]");
        }
    }
}
