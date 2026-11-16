<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
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
        $migration = require database_path('migrations/our-corner/2026_11_16_100000_replace_corner_tables_with_lists_and_items.php');

        $migration->{$direction}();
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
            'provider' => 'provider', 'provider_id' => 'provider_id',
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
                ['songs', 'Songs', 'link', 'Loved', 'heart', 0],
                ['movies', 'Movies', 'poster', 'Watched', 'check', 1],
                ['activities', 'Activities', 'plain', 'Done', 'check', 2],
                ['places', 'Places', 'place', 'Visited', 'check', 3],
            ],
            $lists->map(fn ($l) => [$l->slug, $l->name, $l->kind, $l->done_label, $l->done_icon, (int) $l->position])->all(),
        );
        foreach ($lists as $list) {
            $this->assertNull($list->created_by_user_id);
            $this->assertTrue((bool) $list->notify_on_add);
            $this->assertNotSame('', $list->todo_label);
            $this->assertNotSame('', $list->icon);
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

                // What this kind doesn't use stays empty.
                $unused = array_diff(
                    ['notes', 'url', 'image_url', 'author', 'provider', 'provider_id', 'place_id', 'lat', 'lng', 'address'],
                    self::COLUMNS[$table],
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

        $this->assertSame(url("/apps/our-corner/songs/{$song->id}"), $linkable->resolve('corner.song', 3)['deep_link_url']);
        $this->assertSame('The bakery on 4th Cross', $linkable->resolve('corner.place', 40)['title']);

        $this->actingAs($this->meera)
            ->get('/apps/our-corner/songs/3')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('MiniApps/Corner/Pages/Item')
                ->where('item.id', $song->id)
                ->where('item.title', 'Rain on the Tin Roof')
                ->where('item.is_done', true)
                ->has('mentioned_in', 1));

        $this->actingAs($this->meera)
            ->get('/apps/our-corner/places/40')
            ->assertInertia(fn (AssertableInertia $page) => $page->where('item.id', $place->id));

        $this->actingAs($this->meera)
            ->get('/apps/our-corner')
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
        $this->assertSame($before, $after);

        $this->assertSame($added->id, $addedRow['id']);
        $this->assertSame($added->url, $addedRow['url']);
        $this->assertSame($added->provider_id, $addedRow['provider_id']);

        // The old tables keep counting from where the rows left off.
        $next = DB::table('corner_activities')->insertGetId([
            'title' => 'After rollback', 'added_by_user_id' => $this->ravi->id, 'added_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->assertGreaterThan(6, $next);
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
}
