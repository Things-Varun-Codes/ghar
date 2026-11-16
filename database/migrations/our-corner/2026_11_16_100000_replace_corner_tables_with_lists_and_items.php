<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Songs, movies, activities and places become four rows in corner_lists, and their items move
 * into corner_items. Postgres runs the whole migration in one transaction, so a failed count
 * check below rolls everything back and leaves the old tables as they were.
 *
 * History's stored links still say "corner.song 5" and /apps/our-corner/songs/5. Each moved
 * item keeps that old pair in legacy_type / legacy_id, and new ids start above every old id,
 * so an id in an old URL can never also be a new item's id.
 */
return new class extends Migration
{
    /**
     * Old table => the list it becomes and how its columns map onto corner_items.
     *
     * @var array<string, array{list: array<string, mixed>, legacy_type: string, columns: array<string, string>}>
     */
    private const LEGACY = [
        'corner_songs' => [
            'list' => [
                'name' => 'Songs', 'slug' => 'songs', 'kind' => 'link', 'icon' => 'music',
                'done_label' => 'Loved', 'todo_label' => 'Playlist', 'done_icon' => 'heart',
            ],
            'legacy_type' => 'corner.song',
            'columns' => [
                'title' => 'title', 'url' => 'url', 'image_url' => 'thumbnail_url',
                'author' => 'author', 'provider' => 'provider', 'provider_id' => 'provider_id',
            ],
        ],
        'corner_movies' => [
            'list' => [
                'name' => 'Movies', 'slug' => 'movies', 'kind' => 'poster', 'icon' => 'film',
                'done_label' => 'Watched', 'todo_label' => 'To watch', 'done_icon' => 'check',
            ],
            'legacy_type' => 'corner.movie',
            'columns' => ['title' => 'title', 'url' => 'plex_url', 'image_url' => 'poster_url'],
        ],
        'corner_activities' => [
            'list' => [
                'name' => 'Activities', 'slug' => 'activities', 'kind' => 'plain', 'icon' => 'compass',
                'done_label' => 'Done', 'todo_label' => 'To do', 'done_icon' => 'check',
            ],
            'legacy_type' => 'corner.activity',
            'columns' => ['title' => 'title', 'notes' => 'notes'],
        ],
        'corner_places' => [
            'list' => [
                'name' => 'Places', 'slug' => 'places', 'kind' => 'place', 'icon' => 'map-pin',
                'done_label' => 'Visited', 'todo_label' => 'Wishlist', 'done_icon' => 'check',
            ],
            'legacy_type' => 'corner.place',
            'columns' => [
                'title' => 'title', 'place_id' => 'place_id', 'lat' => 'lat', 'lng' => 'lng',
                'address' => 'address',
            ],
        ],
    ];

    private const SHARED_COLUMNS = [
        'added_by_user_id', 'added_at', 'done_at', 'done_by_user_id', 'created_at', 'updated_at',
    ];

    public function up(): void
    {
        Schema::create('corner_lists', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60);
            // Fixed when the list is made: links, notifications and NFC tags point at it.
            $table->string('slug', 80)->unique();
            $table->string('kind', 16);
            $table->string('icon', 32);
            $table->string('done_label', 24);
            $table->string('todo_label', 24);
            $table->string('done_icon', 8)->default('check');
            $table->boolean('notify_on_add')->default(true);
            $table->unsignedInteger('position')->default(0)->index();
            // Null for the four lists that predate custom lists, and after the creator leaves:
            // an admin looks after those.
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Deleting a user who added items is refused (RESTRICT): authorship is part of the
        // shared history. "Done by" only degrades to null.
        Schema::create('corner_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('list_id')->constrained('corner_lists')->cascadeOnDelete();
            $table->foreignId('added_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('added_at');
            $table->timestamp('done_at')->nullable();
            $table->foreignId('done_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('notes')->nullable();
            // The link itself for a link list, the Plex link for a poster list.
            $table->string('url', 2048)->nullable();
            $table->string('image_url', 2048)->nullable();
            $table->string('author')->nullable();
            $table->string('provider', 16)->nullable();
            $table->string('provider_id', 64)->nullable();
            // Set when the place was picked from Google's search; typed-in places have none.
            $table->string('place_id')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('address', 1024)->nullable();
            $table->string('legacy_type', 32)->nullable();
            $table->unsignedBigInteger('legacy_id')->nullable();
            $table->timestamps();

            $table->index(['list_id', 'added_at']);
            $table->index(['list_id', 'done_at']);
            $table->unique(['list_id', 'provider', 'provider_id'], 'unq_corner_items_provider');
            $table->unique(['legacy_type', 'legacy_id'], 'unq_corner_items_legacy');
        });

        $this->moveLegacyRows();

        foreach (array_keys(self::LEGACY) as $table) {
            Schema::dropIfExists($table);
        }
    }

    private function moveLegacyRows(): void
    {
        $tables = array_values(array_filter(array_keys(self::LEGACY), fn (string $t): bool => Schema::hasTable($t)));

        $counts = [];
        $maxId = 0;
        foreach ($tables as $table) {
            $counts[$table] = (int) DB::table($table)->count();
            $maxId = max($maxId, (int) DB::table($table)->max('id'));
        }

        // A household that never added anything gets the empty room and its suggestions,
        // the same as a fresh install.
        if (array_sum($counts) === 0) {
            return;
        }

        // nextval now returns $maxId + 1.
        DB::statement("select setval(pg_get_serial_sequence('corner_items', 'id'), ?)", [$maxId]);

        $now = now();
        $position = 0;

        foreach ($tables as $table) {
            $spec = self::LEGACY[$table];

            $listId = DB::table('corner_lists')->insertGetId($spec['list'] + [
                'position' => $position++,
                'notify_on_add' => true,
                'created_by_user_id' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $target = implode(', ', [...array_keys($spec['columns']), ...self::SHARED_COLUMNS]);
            $source = implode(', ', [...array_values($spec['columns']), ...self::SHARED_COLUMNS]);

            DB::statement(
                "insert into corner_items (list_id, legacy_type, legacy_id, {$target})
                 select ?, ?, id, {$source} from {$table} order by id",
                [$listId, $spec['legacy_type']],
            );

            $this->assertMoved($table, $listId);
        }
    }

    private function assertMoved(string $table, int $listId): void
    {
        $tally = fn ($query) => (array) $query
            ->selectRaw('count(*) as total, count(done_at) as done, count(done_by_user_id) as done_by, count(distinct added_by_user_id) as adders')
            ->first();

        $before = $tally(DB::table($table));
        $after = $tally(DB::table('corner_items')->where('list_id', $listId));

        if ($before != $after) {
            throw new RuntimeException(sprintf(
                'Moving %s into corner_items did not match: before %s, after %s. Nothing was changed.',
                $table,
                json_encode($before),
                json_encode($after),
            ));
        }
    }

    /**
     * Puts the four original lists back into their own tables. Lists a household made itself
     * have nowhere to go and are dropped with corner_lists.
     */
    public function down(): void
    {
        $this->createLegacyTables();

        foreach (self::LEGACY as $table => $spec) {
            $listId = DB::table('corner_lists')
                ->where('slug', $spec['list']['slug'])
                ->where('kind', $spec['list']['kind'])
                ->value('id');

            if ($listId === null) {
                continue;
            }

            $target = implode(', ', [...array_values($spec['columns']), ...self::SHARED_COLUMNS]);
            $source = implode(', ', [...array_keys($spec['columns']), ...self::SHARED_COLUMNS]);

            // Old ids are all below the new ones, so reusing both can't collide.
            DB::statement(
                "insert into {$table} (id, {$target})
                 select coalesce(legacy_id, id), {$source} from corner_items where list_id = ? order by id",
                [$listId],
            );

            DB::statement(
                "select setval(pg_get_serial_sequence('{$table}', 'id'), (select coalesce(max(id), 0) + 1 from {$table}), false)",
            );
        }

        Schema::dropIfExists('corner_items');
        Schema::dropIfExists('corner_lists');
    }

    private function createLegacyTables(): void
    {
        $shared = function (Blueprint $table): void {
            $table->id();
            $table->foreignId('added_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('added_at')->index();
            $table->timestamp('done_at')->nullable()->index();
            $table->foreignId('done_by_user_id')->nullable()->constrained('users')->nullOnDelete();
        };

        Schema::create('corner_songs', function (Blueprint $table) use ($shared) {
            $shared($table);
            $table->string('provider', 16);
            $table->string('provider_id', 64);
            $table->string('url', 2048);
            $table->string('title');
            $table->string('author')->nullable();
            $table->string('thumbnail_url', 2048)->nullable();
            $table->timestamps();
            $table->unique(['provider', 'provider_id']);
        });

        Schema::create('corner_movies', function (Blueprint $table) use ($shared) {
            $shared($table);
            $table->string('title');
            $table->string('poster_url', 2048)->nullable();
            $table->string('plex_url', 2048)->nullable();
            $table->timestamps();
        });

        Schema::create('corner_activities', function (Blueprint $table) use ($shared) {
            $shared($table);
            $table->string('title');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('corner_places', function (Blueprint $table) use ($shared) {
            $shared($table);
            $table->string('title');
            $table->string('place_id')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('address', 1024)->nullable();
            $table->timestamps();
            $table->index(['lat', 'lng'], 'idx_corner_places_latlng');
            $table->index('place_id', 'idx_corner_places_place_id');
        });
    }
};
