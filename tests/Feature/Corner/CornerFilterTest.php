<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Activity;
use App\MiniApps\Corner\Models\Movie;
use App\MiniApps\Corner\Models\Place;
use App\MiniApps\Corner\Models\Song;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CornerFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_filter_active_returns_only_undone_movies(): void
    {
        $user = User::factory()->create();
        $active = Movie::factory()->create(['added_by_user_id' => $user->id, 'done_at' => null]);
        Movie::factory()->create(['added_by_user_id' => $user->id, 'done_at' => now()]);

        $this->actingAs($user)
            ->get('/apps/our-corner/movies?filter=active')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filter', 'active')
                ->has('movies.data', 1)
                ->where('movies.data.0.id', $active->id));
    }

    public function test_filter_done_returns_only_done_movies(): void
    {
        $user = User::factory()->create();
        Movie::factory()->create(['added_by_user_id' => $user->id, 'done_at' => null]);
        $done = Movie::factory()->create(['added_by_user_id' => $user->id, 'done_at' => now()]);

        $this->actingAs($user)
            ->get('/apps/our-corner/movies?filter=done')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filter', 'done')
                ->has('movies.data', 1)
                ->where('movies.data.0.id', $done->id));
    }

    public function test_filter_all_missing_and_garbage_return_every_row(): void
    {
        $user = User::factory()->create();
        Movie::factory()->create(['added_by_user_id' => $user->id, 'done_at' => null]);
        Movie::factory()->create(['added_by_user_id' => $user->id, 'done_at' => now()]);

        $urls = [
            '/apps/our-corner/movies',
            '/apps/our-corner/movies?filter=all',
            '/apps/our-corner/movies?filter=garbage',
        ];

        foreach ($urls as $url) {
            $this->actingAs($user)
                ->get($url)
                ->assertOk()
                ->assertInertia(fn ($page) => $page
                    ->where('filter', 'all')
                    ->has('movies.data', 2));
        }
    }

    public function test_counts_are_authoritative_beyond_page_one_and_filter_rides_the_cursor_link(): void
    {
        $user = User::factory()->create();

        Movie::factory()->count(60)->create(['added_by_user_id' => $user->id, 'done_at' => null]);
        Movie::factory()->count(3)->create(['added_by_user_id' => $user->id, 'done_at' => now()]);

        $this->actingAs($user)
            ->get('/apps/our-corner/movies?filter=active')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('movies.data', 50)
                ->where('movies.counts.all', 63)
                ->where('movies.counts.active', 60)
                ->where('movies.counts.done', 3)
                // ?filter rides into next_page_url via withQueryString — page 2  stays
                // scoped to the active tab.
                ->where('movies.next_page_url', fn ($url) => str_contains((string) $url, 'filter=active')));
    }

    public function test_songs_places_activities_share_the_same_filter_and_counts_behavior(): void
    {
        $user = User::factory()->create();

        $cases = [
            ['model' => Song::class, 'url' => '/apps/our-corner/songs', 'key' => 'songs'],
            ['model' => Place::class, 'url' => '/apps/our-corner/places', 'key' => 'places'],
            ['model' => Activity::class, 'url' => '/apps/our-corner/activities', 'key' => 'activities'],
        ];

        foreach ($cases as $case) {
            $model = $case['model'];
            $active = $model::factory()->create(['added_by_user_id' => $user->id, 'done_at' => null]);
            $model::factory()->create(['added_by_user_id' => $user->id, 'done_at' => now()]);

            $this->actingAs($user)
                ->get($case['url'].'?filter=active')
                ->assertOk()
                ->assertInertia(fn ($page) => $page
                    ->where('filter', 'active')
                    ->has("{$case['key']}.data", 1)
                    ->where("{$case['key']}.data.0.id", $active->id)
                    ->where("{$case['key']}.counts.all", 2)
                    ->where("{$case['key']}.counts.active", 1)
                    ->where("{$case['key']}.counts.done", 1));

            $this->actingAs($user)
                ->get($case['url'].'?filter=garbage')
                ->assertOk()
                ->assertInertia(fn ($page) => $page
                    ->where('filter', 'all')
                    ->has("{$case['key']}.data", 2));
        }
    }
}
